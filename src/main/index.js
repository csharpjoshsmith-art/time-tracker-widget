const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const os = require('os');

const teamsGraphService = require('../services/teams-graph-service');

const store = new Store();
let mainWindow;
let tray;
let teamsMonitor;
let currentTimerState = {
  isRunning: false,
  isPaused: false,
  currentTask: null
};

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
  // Create tray icon from existing icon
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);

  updateTrayMenu();

  tray.setToolTip('Time Tracker');

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const menuTemplate = [
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' }
  ];

  // Add timer controls based on current state
  if (currentTimerState.isRunning) {
    if (currentTimerState.currentTask) {
      menuTemplate.push({
        label: `Current: ${currentTimerState.currentTask.substring(0, 40)}${currentTimerState.currentTask.length > 40 ? '...' : ''}`,
        enabled: false
      });
    }

    if (currentTimerState.isPaused) {
      menuTemplate.push({
        label: '▶️ Resume Timer',
        click: () => {
          mainWindow.webContents.send('tray-action', 'resume');
        }
      });
    } else {
      menuTemplate.push({
        label: '⏸️ Pause Timer',
        click: () => {
          mainWindow.webContents.send('tray-action', 'pause');
        }
      });
    }

    menuTemplate.push({
      label: '⏹️ Stop Timer',
      click: () => {
        mainWindow.webContents.send('tray-action', 'stop');
      }
    });
  } else {
    menuTemplate.push({
      label: 'No timer running',
      enabled: false
    });
  }

  menuTemplate.push(
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register global shortcuts
  registerGlobalShortcuts();

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

function registerGlobalShortcuts() {
  // Ctrl+Shift+T to toggle pause/resume
  const ret = globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (currentTimerState.isRunning) {
      if (currentTimerState.isPaused) {
        mainWindow.webContents.send('tray-action', 'resume');
      } else {
        mainWindow.webContents.send('tray-action', 'pause');
      }
    } else {
      // Show window if no timer is running
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (!ret) {
    console.log('Global shortcut registration failed');
  }

  // Ctrl+Shift+S to stop timer
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (currentTimerState.isRunning) {
      mainWindow.webContents.send('tray-action', 'stop');
    }
  });

  // Ctrl+Shift+W to show/hide window
  globalShortcut.register('CommandOrControl+Shift+W', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src/preload/preload.js')
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

// Test Jira connection
ipcMain.handle('test-jira-connection', async (event, settings) => {
  const axios = require('axios');

  try {
    const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64');

    const response = await axios({
      method: 'get',
      url: `https://${settings.domain}/rest/api/3/myself`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    return { success: true, displayName: response.data.displayName };
  } catch (error) {
    console.error('Jira test connection error:', error.message);
    let errorMessage = error.message;

    if (error.response) {
      errorMessage = `${error.response.status} - Check your credentials`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Domain not found. Check your Jira domain';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Check your internet connection';
    }

    return {
      success: false,
      error: errorMessage
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

// Update timer state from renderer (for tray menu updates)
ipcMain.handle('update-timer-state', (event, state) => {
  currentTimerState = { ...currentTimerState, ...state };
  updateTrayMenu();

  // Update tray tooltip
  if (tray) {
    if (state.isRunning && state.currentTask) {
      const status = state.isPaused ? 'Paused' : 'Running';
      tray.setToolTip(`Time Tracker - ${status}: ${state.currentTask.substring(0, 50)}`);
    } else {
      tray.setToolTip('Time Tracker');
    }
  }

  return true;
});