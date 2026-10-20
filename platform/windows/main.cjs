const { app, BrowserWindow, Menu, Notification, Tray, globalShortcut, ipcMain, screen, shell } = require('electron');
const path = require('node:path');

// LumaPet on Windows is one transparent, always-on-top window covering the
// primary display's work area. The page decides which pixels are interactive
// (pets, open panels) and the rest of the window lets clicks through to the
// desktop, so pets can wander over everything and stand on the taskbar.

let petWindow = null;
let tray = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => send('chat'));
}

// Commands that open a panel or an input need keyboard focus; the rest
// (feeding, dancing…) leave whatever app the user is typing in alone.
const FOCUS_COMMANDS = new Set(['chat', 'quick-chat', 'wardrobe', 'tools', 'settings', 'themes', 'about']);

function send(command) {
  if (!petWindow) return;
  if (FOCUS_COMMANDS.has(command)) petWindow.focus();
  else petWindow.showInactive();
  petWindow.webContents.send('lumapet:command', command);
}

function fitToWorkArea() {
  if (!petWindow) return;
  const { workArea } = screen.getPrimaryDisplay();
  petWindow.setBounds(workArea);
}

function createPetWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  petWindow = new BrowserWindow({
    ...workArea,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    backgroundColor: '#00000000',
    title: 'LumaPet',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false
    }
  });
  petWindow.setAlwaysOnTop(true, 'floating');
  petWindow.setIgnoreMouseEvents(true, { forward: true });
  petWindow.setVisibleOnAllWorkspaces(true);

  const devUrl = process.env.LUMAPET_DEV_URL;
  if (devUrl) petWindow.loadURL(devUrl);
  else petWindow.loadFile(path.join(__dirname, '../../dist/index.html'));

  // External links open in the real browser, never inside the pet window.
  petWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  petWindow.on('closed', () => { petWindow = null; });
}

const THEMES = [['aurora', '🌌 极光'], ['sakura', '🌸 樱花'], ['neon', '🌆 赛博霓虹'], ['ocean', '🐋 深海'], ['forest', '🌲 萤火森林'], ['snow', '❄️ 冬夜'], ['paper', '🖌️ 水墨'], ['retro', '💾 像素 98']];
const PETS = [['claude', 'Claude 娘'], ['clawd', 'Clawd'], ['gpt', 'GPT 娘'], ['deepseek', 'DeepSeek 娘']];

function createTray() {
  tray = new Tray(path.join(__dirname, 'tray-template.png'));
  tray.setToolTip('LumaPet · AI 桌宠');
  const autoStart = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '💬 和桌宠聊天', click: () => send('chat') },
    { label: '⚡ 快速说一句  Alt+L', click: () => send('quick-chat') },
    { type: 'separator' },
    { label: '🍙 投喂', click: () => send('feed') },
    { label: '⚽ 扔个球', click: () => send('ball') },
    { label: '💃 大家跳舞', click: () => send('all:dance') },
    { label: '😴 大家睡觉', click: () => send('all:sleep') },
    { label: '🧘 专注勿扰', click: () => send('toggle-quiet') },
    { type: 'separator' },
    { label: '➕ 召唤伙伴', submenu: PETS.map(([id, label]) => ({ label, click: () => send(`summon:${id}`) })) },
    { label: '🎨 界面主题', submenu: THEMES.map(([id, label]) => ({ label, click: () => send(`theme:${id}`) })) },
    { label: '👗 角色衣柜', click: () => send('wardrobe') },
    { label: '🧰 工具箱', click: () => send('tools') },
    { label: '⚙️ 设置', click: () => send('settings') },
    { type: 'separator' },
    { label: '开机自动启动', type: 'checkbox', checked: autoStart, click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
    { label: '退出', click: () => app.quit() }
  ]));
  tray.on('click', () => send('chat'));
}

app.whenReady().then(() => {
  createPetWindow();
  try { createTray(); } catch { /* Tray art is optional in dev. */ }

  ipcMain.on('lumapet:ignore-mouse', (_event, ignore) => {
    petWindow?.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
  });
  ipcMain.on('lumapet:notify', (_event, title, body) => {
    if (Notification.isSupported()) new Notification({ title: String(title), body: String(body) }).show();
  });
  ipcMain.on('lumapet:quit', () => app.quit());

  globalShortcut.register('Alt+L', () => send('quick-chat'));
  screen.on('display-metrics-changed', fitToWorkArea);
  screen.on('display-added', fitToWorkArea);
  screen.on('display-removed', fitToWorkArea);
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
