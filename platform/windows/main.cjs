const { app, BrowserWindow, Menu, Tray, ipcMain, screen } = require('electron');
const path = require('node:path');

let windowRef;
let overlayRef;
let trayRef;
let isQuitting = false;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  windowRef = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    x: Math.max(workArea.x + workArea.width - 1160, workArea.x + 20),
    y: workArea.y + 28,
    backgroundColor: '#0d0c16',
    title: 'LumaPet · AI 桌宠',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const devUrl = process.env.LUMAPET_DEV_URL;
  if (devUrl) windowRef.loadURL(`${devUrl}?platform=windows`);
  else windowRef.loadFile(path.join(__dirname, '../../dist/index.html'), { search: '?platform=windows' });

  windowRef.setAlwaysOnTop(true, 'floating');
  windowRef.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      windowRef.hide();
    }
  });
}

function loadApp(target, search) {
  const devUrl = process.env.LUMAPET_DEV_URL;
  if (devUrl) target.loadURL(`${devUrl}${devUrl.includes('?') ? '&' : '?'}${search.slice(1)}`);
  else target.loadFile(path.join(__dirname, '../../dist/index.html'), { search });
}

function createOverlay() {
  overlayRef = new BrowserWindow({
    width: 270,
    height: 340,
    minWidth: 220,
    minHeight: 280,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') }
  });
  loadApp(overlayRef, '?platform=windows&overlay=1');
  overlayRef.setAlwaysOnTop(true, 'floating');
  overlayRef.on('closed', () => { overlayRef = null; });
}

function createTray() {
  // The app works without a custom ICO during development. Packagers can replace this
  // with the generated icon in platform/windows/assets/icon.ico.
  trayRef = new Tray(path.join(__dirname, 'tray-template.png'));
  trayRef.setToolTip('LumaPet · AI 桌宠');
  trayRef.setContextMenu(Menu.buildFromTemplate([
    { label: '显示控制台', click: () => windowRef?.show() },
    { label: '显示桌宠浮窗', click: () => overlayRef?.show() },
    { label: '置顶窗口', type: 'checkbox', checked: true, click: (item) => windowRef?.setAlwaysOnTop(item.checked, 'floating') },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]));
  trayRef.on('click', () => windowRef?.isVisible() ? windowRef.hide() : windowRef?.show());
}

app.whenReady().then(() => {
  createWindow();
  createOverlay();
  // A tiny transparent placeholder is created at build time if no tray art is provided.
  try { createTray(); } catch { /* Tray art is optional in dev. */ }
  ipcMain.handle('toggle-always-on-top', (_event, enabled) => windowRef?.setAlwaysOnTop(Boolean(enabled), 'floating'));
  ipcMain.handle('toggle-overlay', (_event, enabled) => {
    if (!overlayRef) createOverlay();
    if (enabled === false) overlayRef?.hide(); else overlayRef?.show();
  });
  app.on('activate', () => windowRef?.show());
});

app.on('window-all-closed', (event) => event.preventDefault());
