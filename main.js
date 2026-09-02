const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');

// 应用图标：macOS 用带圆角留白的 icon-mac.png（贴合系统 Dock 风格），
// 其余平台用全出血方形 icon.png。icns 多尺寸图标仅在打包（electron-builder）时使用。
const iconFile = process.platform === 'darwin' ? 'icon-mac.png' : 'icon.png';
const iconPath = path.join(__dirname, 'build', iconFile);

function createWindow(appIcon) {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Typing Master - 多语言打字练习',
    icon: appIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  // 在 whenReady 之后创建 image，确保 dock.setIcon 在 macOS 上可靠生效。
  const appIcon = nativeImage.createFromPath(iconPath);
  // macOS：开发模式下 dock 默认显示 Electron 图标，需显式设置应用图标。
  // 打包后的 .app 自带图标，这行是 no-op，不影响。
  if (!appIcon.isEmpty() && process.platform === 'darwin') {
    app.dock.setIcon(appIcon);
  }
  createWindow(appIcon);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(nativeImage.createFromPath(iconPath)); });
