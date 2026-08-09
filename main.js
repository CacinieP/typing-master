const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');

// 应用图标路径：用 PNG（Electron 对 SVG 支持不全，窗口标题栏/dock 都要位图）。
const iconPath = path.join(__dirname, 'build', 'icon.png');

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
