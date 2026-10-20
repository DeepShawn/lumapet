import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeChat, CLAUDE_DEFAULT_BASE_URL, CLAUDE_DEFAULT_MODEL } from '../src/claude-chat.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const allowedOrigin = process.env.LUMAPET_ALLOWED_ORIGIN || '*';
const proxyToken = process.env.LUMAPET_PROXY_TOKEN || '';
const isLocalHost = host === '127.0.0.1' || host === 'localhost' || host === '::1';

if (!isLocalHost && !proxyToken) {
  console.error('Refusing remote bind without LUMAPET_PROXY_TOKEN. Set a token or keep HOST=127.0.0.1.');
  process.exit(1);
}

const providers = {
  cloudgpt: {
    endpoint: process.env.LUMAPET_CLOUDGPT_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
    model: process.env.LUMAPET_CLOUDGPT_MODEL || 'gpt-4o-mini',
    key: process.env.LUMAPET_CLOUDGPT_API_KEY || ''
  },
  deepseek: {
    endpoint: process.env.LUMAPET_DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/chat/completions',
    model: process.env.LUMAPET_DEEPSEEK_MODEL || 'deepseek-chat',
    key: process.env.LUMAPET_DEEPSEEK_API_KEY || ''
  },
  claude: {
    endpoint: process.env.LUMAPET_CLAUDE_BASE_URL || CLAUDE_DEFAULT_BASE_URL,
    model: process.env.LUMAPET_CLAUDE_MODEL || CLAUDE_DEFAULT_MODEL,
    key: process.env.LUMAPET_CLAUDE_API_KEY || ''
  }
};

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-LumaPet-Proxy-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function body(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 1_000_000) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function proxyChat(req, res) {
  try {
    if (proxyToken && req.headers['x-lumapet-proxy-token'] !== proxyToken) return json(res, 401, { error: { message: '代理访问令牌无效' } });
    const payload = await body(req);
    const providerId = Object.hasOwn(providers, payload.provider) ? payload.provider : 'cloudgpt';
    const provider = providers[providerId];
    const key = provider.key;
    if (!key) return json(res, 503, { error: { message: `${providerId} 的服务端 API Key 尚未配置` } });
    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-20) : [];
    if (providerId === 'claude') {
      // Reply in the OpenAI-style shape the app already reads for proxy mode.
      const system = messages.filter((message) => message?.role === 'system').map((message) => String(message.content)).join('\n');
      try {
        const content = await claudeChat({ apiKey: key, baseURL: provider.endpoint, model: payload.model || provider.model, system: system || undefined, messages });
        return json(res, 200, { choices: [{ message: { role: 'assistant', content } }] });
      } catch (error) {
        return json(res, typeof error.status === 'number' ? error.status : 502, { error: { message: error.message } });
      }
    }
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: payload.model || provider.model,
        messages,
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.7,
        stream: false
      })
    });
    const text = await response.text();
    res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': allowedOrigin });
    res.end(text);
  } catch (error) {
    json(res, 400, { error: { message: error instanceof SyntaxError ? '请求不是有效 JSON' : error.message } });
  }
}

async function staticFile(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  const safe = normalize(pathname).replace(/^([.][.][/\\])+/, '');
  let file = join(dist, safe === '/' ? 'index.html' : safe);
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
    const content = await readFile(file);
    cors(res);
    res.writeHead(200, { 'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' });
    res.end(content);
  } catch {
    const fallback = join(dist, 'index.html');
    try { const content = await readFile(fallback); cors(res); res.writeHead(200, { 'Content-Type': mime['.html'] }); res.end(content); }
    catch { json(res, 404, { error: { message: '请先运行 npm run build' } }); }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && req.url === '/api/health') return json(res, 200, { ok: true, providers: Object.fromEntries(Object.entries(providers).map(([id, p]) => [id, { model: p.model, configured: Boolean(p.key) }])) });
  if (req.method === 'POST' && req.url === '/api/chat') return proxyChat(req, res);
  if (req.method === 'GET') return staticFile(req, res);
  return json(res, 405, { error: { message: 'Method Not Allowed' } });
});

server.listen(port, host, () => console.log(`LumaPet server listening on http://${host}:${port}`));
