const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Clannect",                       
    icon: path.join(__dirname, "assets/icons/win/icon.ico"),
    frame: true,                             
    autoHideMenuBar: true,                    
    webPreferences: {
      nodeIntegration: false,                
      contextIsolation: true
    }
  });

  // Prod Web App URL
  win.loadURL('https://app.clannect.com');

  // When Pagefinishes loading, set the title to "Clannect"
  win.webContents.on('did-finish-load', () => {
    win.setTitle("Clannect");
  });

  // Override title on every title change (for Next.js client-side navigation)
  win.webContents.on('page-title-updated', (event) => {
    event.preventDefault();                // prevent default title change
    win.setTitle("Clannect");      // always this title
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});