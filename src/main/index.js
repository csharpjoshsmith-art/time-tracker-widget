const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const os = require('os');

const teamsGraphService = require('../services/teams-graph-service');

const store = new Store();
let mainWindow;
let tray;
let teamsMonitor;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    resizable: true,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  mainWindow.loadFile('src/renderer/index.html');

  // Optional: Open DevTools for debugging
  // mainWindow.webContents.openDevTools();

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  // You'll need to add an icon file later
  // tray = new Tray(path.join(__dirname, 'assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => {
        mainWindow.show();
      }
    },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  // tray.setToolTip('Time Tracker');
  // tray.setContextMenu(contextMenu);
  
  // tray.on('click', () => {
  //   mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  // });
}

app.whenReady().then(() => {
  createWindow();
  // createTray(); // Uncomment when you add tray icon

  // Initialize Teams call monitoring
  // Lazy-load the monitor after app is ready
  const TeamsCallMonitor = os.platform() === 'darwin'
    ? require('../services/teams-monitor-macos')
    : require('../services/teams-monitor');

  teamsMonitor = new TeamsCallMonitor(store);
  teamsMonitor.setMainWindow(mainWindow);

  // Check if Teams monitoring is enabled (default: enabled)
  const teamsSettings = store.get('teamsSettings');
  if (!teamsSettings || teamsSettings.enabled !== false) {
    // Start monitoring by default, or if explicitly enabled
    teamsMonitor.start();
  } else {
    console.log('Teams monitoring is disabled in settings');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for data storage
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
  return true;
});

// Open settings window
ipcMain.handle('open-settings', () => {
  const settingsWindow = new BrowserWindow({
    width: 500,
    height: 450,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile('src/renderer/settings.html');
  return true;
});

// Fetch Jira tickets from main process (avoids CORS/XSRF issues)
ipcMain.handle('fetch-jira-tickets', async (event, settings) => {
  const axios = require('axios');

  try {
    const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64');

    const response = await axios({
      method: 'post',
      url: `https://${settings.domain}/rest/api/3/search/jql`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: {
        jql: 'assignee = currentUser() AND resolution = Unresolved AND status NOT IN (Done, Installed) ORDER BY project ASC, updated DESC',
        maxResults: 100,
        fields: ['summary', 'key', 'status', 'project']
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Jira fetch error in main process:', error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
});

// Fetch Jira tickets where user is the reporter
ipcMain.handle('fetch-jira-reporter-tickets', async (event, settings) => {
  const axios = require('axios');

  try {
    const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64');

    const response = await axios({
      method: 'post',
      url: `https://${settings.domain}/rest/api/3/search/jql`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: {
        jql: 'reporter = currentUser() AND resolution = Unresolved AND status NOT IN (Done, Installed, "Ready to Install") ORDER BY updated DESC',
        maxResults: 100,
        fields: ['summary', 'key', 'status', 'project', 'assignee']
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Jira reporter fetch error in main process:', error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
});

// Teams integration handlers
ipcMain.handle('teams-authenticate', async (event, config) => {
  try {
    const accessToken = await teamsGraphService.authenticateDeviceCode(config);
    return { success: true, accessToken };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('teams-get-current-meetings', async (event, accessToken) => {
  try {
    const meetings = await teamsGraphService.getCurrentMeetings(accessToken);
    return { success: true, meetings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('teams-test-connection', async (event, accessToken) => {
  try {
    const result = await teamsGraphService.testConnection(accessToken);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('teams-toggle-monitoring', (event, enabled) => {
  if (enabled) {
    teamsMonitor.start();
  } else {
    teamsMonitor.stop();
  }
  return true;
});

ipcMain.handle('teams-get-current-call', () => {
  return teamsMonitor.getCurrentCall();
});

// Open Jira ticket in Chrome
ipcMain.handle('open-jira-ticket', async (event, ticketUrl) => {
  const { shell } = require('electron');
  try {
    await shell.openExternal(ticketUrl);
    return { success: true };
  } catch (error) {
    console.error('Error opening Jira ticket:', error);
    return { success: false, error: error.message };
  }
});