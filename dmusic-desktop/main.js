/**
 * dmusic-desktop — Electron 主进程
 *
 * 从仓库根下与本目录同级的 `dmusic-core/` 加载 `player.html`；`chrome` API 由 preload 注入。
 * Cookie 读写仅在主进程使用 `session.defaultSession`（preload 中无 `session`）。
 *
 * @author dmusic-desktop
 */
const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');

const dmusicDir = path.join(__dirname, '..', 'dmusic-core');
const playerHtml = path.join(dmusicDir, 'player.html');

/**
 * @param {Record<string, unknown>} details
 */
function toElectronSetDetails(details) {
  const d = /** @type {Electron.CookiesSetDetails} */ ({
    url: String(details.url || ''),
    name: String(details.name || ''),
    value: String(details.value || ''),
    path: details.path != null ? String(details.path) : '/',
  });
  if (details.domain != null) d.domain = String(details.domain);
  if (details.secure != null) d.secure = Boolean(details.secure);
  if (details.httpOnly != null) d.httpOnly = Boolean(details.httpOnly);
  if (details.expirationDate != null) {
    d.expirationDate = Number(details.expirationDate);
  }
  if (details.sameSite != null) {
    const s = String(details.sameSite);
    if (['unspecified', 'no_restriction', 'lax', 'strict'].includes(s)) {
      d.sameSite = /** @type {'unspecified'|'no_restriction'|'lax'|'strict'} */ (s);
    } else if (s === 'None') {
      d.sameSite = 'no_restriction';
    }
  }
  return d;
}

function registerCookieIpc() {
  ipcMain.handle('dmusic-cookies-get', async (_event, details) => {
    const url = details && details.url != null ? String(details.url) : '';
    const name = details && details.name != null ? String(details.name) : '';
    const cookies = await session.defaultSession.cookies.get({ url, name });
    return cookies[0] || null;
  });

  ipcMain.handle('dmusic-cookies-set', async (_event, details) => {
    await session.defaultSession.cookies.set(toElectronSetDetails(details));
  });
}

function createWindow() {
  if (!fs.existsSync(playerHtml)) {
    dialog.showErrorBox(
      'dmusic-desktop',
      `未找到播放器页面：\n${playerHtml}\n\n请确认「dmusic-core」与「dmusic-desktop」在仓库根目录下并列。`
    );
    app.quit();
    return;
  }

  const win = new BrowserWindow({
    width: 960,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(playerHtml);
}

app.whenReady().then(() => {
  registerCookieIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
