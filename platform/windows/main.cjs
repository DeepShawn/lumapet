const { app, BrowserWindow, Menu, Tray, ipcMain, screen } = require('electron');
const path = require('node:path');

let windowRef;
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

function createTray() {
  // The app works without a custom ICO during development. Packagers can replace this
  // with the generated icon in platform/windows/assets/icon.ico.
  trayRef = new Tray(path.join(__dirname, 'tray-template.png'));
  trayRef.setToolTip('LumaPet · AI 桌宠');
  trayRef.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 LumaPet', click: () => windowRef?.show() },
    { label: '置顶窗口', type: 'checkbox', checked: true, click: (item) => windowRef?.setAlwaysOnTop(item.checked, 'floating') },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]));
  trayRef.on('click', () => windowRef?.isVisible() ? windowRef.hide() : windowRef?.show());
}

app.whenReady().then(() => {
  createWindow();
  // A tiny transparent placeholder is created at build time if no tray art is provided.
  try { createTray(); } catch { /* Tray art is optional in dev. */ }
  ipcMain.handle('toggle-always-on-top', (_event, enabled) => windowRef?.setAlwaysOnTop(Boolean(enabled), 'floating'));
  app.on('activate', () => windowRef?.show());
});

app.on('window-all-closed', (event) => event.preventDefault());
