import http from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dataDir = resolve(process.env.LUMAPET_AGENT_DATA || resolve(root, '.lumapet-agent'));
const host = process.env.LUMAPET_AGENT_HOST || '127.0.0.1';
const port = Number(process.env.LUMAPET_AGENT_PORT || 8788);
const token = process.env.LUMAPET_AGENT_TOKEN || '';
const allowedOrigin = process.env.LUMAPET_ALLOWED_ORIGIN || '*';
const localHost = host === '127.0.0.1' || host === 'localhost' || host === '::1';
const headless = process.env.LUMAPET_BROWSER_HEADLESS === 'true';

if (!localHost && !token) {
  console.error('Refusing remote agent bind without LUMAPET_AGENT_TOKEN.');
  process.exit(1);
}

const pending = new Map();
const history = [];
let browserContext;
let browserPage;

const capabilities = [
  { action: 'browser.navigate', label: '打开网页', risk: 'write', description: '在受控的 Chromium 会话中打开 http(s) 页面' },
  { action: 'browser.read', label: '读取网页', risk: 'read', description: '读取当前页面标题、地址和可见文本' },
  { action: 'browser.click', label: '点击网页', risk: 'write', description: '按 CSS 选择器点击当前页面元素' },
  { action: 'browser.type', label: '填写网页', risk: 'write', description: '在指定输入框填写文字' },
  { action: 'browser.screenshot', label: '网页截图', risk: 'read', description: '把当前页面保存到本机代理目录' },
  { action: 'system.open_url', label: '打开链接', risk: 'write', description: '用系统默认浏览器打开 http(s) 链接' },
  { action: 'system.open_app', label: '打开应用', risk: 'write', description: '从安全的应用白名单启动一个本机应用' },
  { action: 'system.active_window', label: '读取当前窗口', risk: 'read', description: '读取当前前台窗口标题（系统支持时）' },
  { action: 'clipboard.read', label: '读取剪贴板', risk: 'read', description: '读取本机剪贴板文本' },
  { action: 'clipboard.write', label: '写入剪贴板', risk: 'write', description: '写入本机剪贴板文本' }
];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-LumaPet-Agent-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function json(res, status, value) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function auth(req) {
  return !token || req.headers['x-lumapet-agent-token'] === token;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256_000) throw new Error('任务请求过大');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function safeUrl(value) {
  const url = new URL(String(value || ''));
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只允许打开 http(s) 地址');
  url.username = '';
  url.password = '';
  return url.toString();
}

function redact(text) {
  return String(text || '').replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[redacted-token]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]');
}

async function getPage() {
  if (browserPage && !browserPage.isClosed()) return browserPage;
  let playwright;
  try { playwright = await import('playwright'); } catch { throw new Error('缺少 Playwright，请运行 npm install 并执行 npx playwright install chromium'); }
  await mkdir(dataDir, { recursive: true });
  browserContext = await playwright.chromium.launchPersistentContext(resolve(dataDir, 'browser-profile'), {
    headless,
    executablePath: process.env.LUMAPET_BROWSER_EXECUTABLE || undefined,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-features=Translate', '--no-first-run']
  });
  browserPage = browserContext.pages()[0] || await browserContext.newPage();
  return browserPage;
}

async function clipboard(command, value) {
  const platform = process.platform;
  if (command === 'read') {
    if (platform === 'win32') return (await execFileAsync('powershell.exe', ['-NoProfile', '-Command', 'Get-Clipboard'])).stdout;
    if (platform === 'darwin') return (await execFileAsync('pbpaste')).stdout;
    if (process.env.WAYLAND_DISPLAY) return (await execFileAsync('wl-paste', ['--no-newline'])).stdout;
    return (await execFileAsync('xclip', ['-selection', 'clipboard', '-o'])).stdout;
  }
  if (platform === 'win32') { const child = spawn('clip.exe'); child.stdin.end(String(value || '')); return 'ok'; }
  if (platform === 'darwin') { const child = spawn('pbcopy'); child.stdin.end(String(value || '')); return 'ok'; }
  if (process.env.WAYLAND_DISPLAY) { const child = spawn('wl-copy'); child.stdin.end(String(value || '')); return 'ok'; }
  const child = spawn('xclip', ['-selection', 'clipboard']); child.stdin.end(String(value || '')); return 'ok';
}

async function runAction(action, args = {}) {
  if (action === 'browser.navigate') {
    const page = await getPage();
    await page.goto(safeUrl(args.url), { waitUntil: 'domcontentloaded', timeout: 30000 });
    return { url: page.url(), title: await page.title() };
  }
  if (action === 'browser.read') {
    const page = await getPage();
    return { url: page.url(), title: await page.title(), text: redact((await page.locator('body').innerText({ timeout: 10000 })).slice(0, 12000)) };
  }
  if (action === 'browser.click') {
    const page = await getPage();
    const selector = String(args.selector || '').trim();
    if (!selector || selector.length > 300) throw new Error('selector 无效');
    await page.locator(selector).first().click({ timeout: 10000 });
    return { clicked: selector, url: page.url() };
  }
  if (action === 'browser.type') {
    const page = await getPage();
    const selector = String(args.selector || '').trim();
    const text = String(args.text || '');
    if (!selector || selector.length > 300 || text.length > 4000) throw new Error('输入参数无效');
    if (/pass(word|code)?|token|secret|api.?key/i.test(selector) && !args.allowSensitive) throw new Error('敏感输入需要显式 allowSensitive=true');
    await page.locator(selector).first().fill(text, { timeout: 10000 });
    return { filled: selector, characters: text.length };
  }
  if (action === 'browser.screenshot') {
    const page = await getPage();
    await mkdir(dataDir, { recursive: true });
    const filename = `page-${Date.now()}.png`;
    const path = resolve(dataDir, filename);
    await page.screenshot({ path, fullPage: false });
    return { path, url: page.url() };
  }
  if (action === 'system.open_url') {
    const url = safeUrl(args.url);
    if (process.platform === 'win32') spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' });
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    return { opened: url };
  }
  if (action === 'system.open_app') {
    const app = String(args.app || '').toLowerCase();
    const allow = process.platform === 'win32'
      ? { calculator: ['calc.exe', []], notepad: ['notepad.exe', []], terminal: ['wt.exe', []], files: ['explorer.exe', []] }
      : process.platform === 'darwin'
        ? { calculator: ['open', ['-a', 'Calculator']], terminal: ['open', ['-a', 'Terminal']], files: ['open', ['.']] }
        : { calculator: ['gnome-calculator', []], terminal: ['x-terminal-emulator', []], files: ['xdg-open', ['.']] };
    const command = allow[app];
    if (!command) throw new Error('应用不在安全白名单中');
    spawn(command[0], command[1], { detached: true, stdio: 'ignore' });
    return { openedApp: app };
  }
  if (action === 'system.active_window') {
    try {
      if (process.platform === 'win32') return { title: (await execFileAsync('powershell.exe', ['-NoProfile', '-Command', '(Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Sort-Object StartTime -Descending | Select-Object -First 1 -ExpandProperty MainWindowTitle)'])).stdout.trim() };
      if (process.platform === 'darwin') return { title: (await execFileAsync('osascript', ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'])).stdout.trim() };
      return { title: (await execFileAsync('xdotool', ['getactivewindow', 'getwindowname'])).stdout.trim() };
    } catch { return { title: '', unavailable: true }; }
  }
  if (action === 'clipboard.read') return { text: redact(await clipboard('read')) };
  if (action === 'clipboard.write') { const text = String(args.text || ''); if (text.length > 12000) throw new Error('剪贴板内容过长'); await clipboard('write', text); return { characters: text.length }; }
  throw new Error(`不支持的动作：${action}`);
}

function requiresApproval(action) {
  return !['browser.read', 'browser.screenshot', 'clipboard.read', 'system.active_window'].includes(action);
}

async function executeTask(task) {
  task.status = 'running'; task.startedAt = new Date().toISOString();
  try { task.result = await runAction(task.action, task.args); task.status = 'completed'; }
  catch (error) { task.status = 'failed'; task.error = error.message; }
  task.finishedAt = new Date().toISOString();
  history.unshift(task);
  history.splice(50);
  pending.delete(task.id);
  return task;
}

async function createTask(req, res) {
  const body = await readBody(req);
  const action = String(body.action || '');
  if (!capabilities.some((item) => item.action === action)) return json(res, 400, { error: { message: '未知动作' } });
  const task = { id: crypto.randomUUID(), action, args: body.args || {}, status: 'pending', createdAt: new Date().toISOString(), summary: body.summary || capabilities.find((item) => item.action === action).description };
  if (requiresApproval(action)) { pending.set(task.id, task); return json(res, 202, { requiresApproval: true, task }); }
  return json(res, 200, { task: await executeTask(task) });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
    if (!auth(req)) return json(res, 401, { error: { message: '代理访问令牌无效' } });
    if (req.method === 'GET' && req.url === '/v1/capabilities') return json(res, 200, { capabilities, host, headless });
    if (req.method === 'GET' && req.url === '/v1/tasks') return json(res, 200, { pending: [...pending.values()], history });
    if (req.method === 'POST' && req.url === '/v1/tasks') return createTask(req, res);
    const approve = req.url?.match(/^\/v1\/tasks\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approve) {
      const task = pending.get(approve[1]);
      if (!task) return json(res, 404, { error: { message: '任务不存在或已完成' } });
      return json(res, 200, { task: await executeTask(task) });
    }
    return json(res, 404, { error: { message: 'Not Found' } });
  } catch (error) { return json(res, 400, { error: { message: error.message } }); }
});

server.listen(port, host, () => console.log(`LumaPet agent listening on http://${host}:${port}`));

process.on('SIGTERM', async () => { await browserContext?.close().catch(() => {}); server.close(); });
