const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const os = require('os');

const teamsGraphService = require('./src/services/teams-graph-service');
const { getDB } = require('./src/database/DBManager');

const store = new Store(); // Keep for migration purposes
let db;
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src/preload/preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png')
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
  try {
    // Try to create tray icon from existing icon
    let trayIcon;
    const iconPath = path.join(__dirname, 'assets/icon.png');

    // Check if custom icon exists, otherwise use a default one
    if (require('fs').existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else {
      // Use electron's default icon as fallback
      const defaultIconPath = path.join(__dirname, 'node_modules/app-builder-lib/templates/icons/electron-linux/16x16.png');
      if (require('fs').existsSync(defaultIconPath)) {
        trayIcon = nativeImage.createFromPath(defaultIconPath);
      } else {
        // Create a simple colored square as last resort
        trayIcon = nativeImage.createEmpty();
        console.log('Warning: No tray icon found, using empty icon');
      }
    }

    tray = new Tray(trayIcon);

    updateTrayMenu();

    tray.setToolTip('Time Tracker');

    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });

    console.log('Tray created successfully');
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
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
  // Initialize database
  db = getDB();
  console.log('Database initialized');

  // Migrate data from electron-store to SQLite (one-time operation)
  const migrated = db.getSetting('migrated');
  if (!migrated) {
    console.log('First run - migrating data from electron-store...');
    const result = db.migrateFromElectronStore(store);
    if (result.success) {
      db.setSetting('migrated', true);
      console.log('Migration successful!');
    } else {
      console.error('Migration failed:', result.error);
    }
  }

  createWindow();
  createTray();

  // Register global shortcuts
  registerGlobalShortcuts();

  // Setup database IPC handlers
  setupDatabaseHandlers();

  // Initialize Teams call monitoring
  // Lazy-load the monitor after app is ready
  const TeamsCallMonitor = os.platform() === 'darwin'
    ? require('./src/services/teams-monitor-macos')
    : require('./src/services/teams-monitor');

  teamsMonitor = new TeamsCallMonitor(store);
  teamsMonitor.setMainWindow(mainWindow);

  // Check if Teams monitoring is enabled (default: enabled)
  const teamsSettings = db.getSetting('teamsSettings') || store.get('teamsSettings');
  if (!teamsSettings || teamsSettings.enabled !== false) {
    // Start monitoring by default, or if explicitly enabled
    teamsMonitor.start();
  } else {
    console.log('Teams monitoring is disabled in settings');
  }
});

// Setup database IPC handlers
function setupDatabaseHandlers() {
  // Time Entries
  ipcMain.handle('db:addTimeEntry', (event, entry) => db.addTimeEntry(entry));
  ipcMain.handle('db:getAllTimeEntries', () => db.getAllTimeEntries());
  ipcMain.handle('db:getTimeEntry', (event, id) => db.getTimeEntry(id));
  ipcMain.handle('db:updateTimeEntry', (event, id, updates) => db.updateTimeEntry(id, updates));
  ipcMain.handle('db:deleteTimeEntry', (event, id) => db.deleteTimeEntry(id));
  ipcMain.handle('db:deleteTimeEntries', (event, ids) => db.deleteTimeEntries(ids));
  ipcMain.handle('db:getTimeEntriesByDateRange', (event, startDate, endDate) =>
    db.getTimeEntriesByDateRange(startDate, endDate)
  );

  // Custom Tasks
  ipcMain.handle('db:addCustomTask', (event, taskName) => db.addCustomTask(taskName));
  ipcMain.handle('db:getAllCustomTasks', () => db.getAllCustomTasks());
  ipcMain.handle('db:deleteCustomTask', (event, taskName) => db.deleteCustomTask(taskName));

  // Recent Tasks
  ipcMain.handle('db:addRecentTask', (event, taskName) => db.addRecentTask(taskName));
  ipcMain.handle('db:getRecentTasks', (event, limit) => db.getRecentTasks(limit));

  // Settings
  ipcMain.handle('db:getSetting', (event, key) => db.getSetting(key));
  ipcMain.handle('db:setSetting', (event, key, value) => db.setSetting(key, value));
  ipcMain.handle('db:deleteSetting', (event, key) => db.deleteSetting(key));
  ipcMain.handle('db:getAllSettings', () => db.getAllSettings());

  // Stats
  ipcMain.handle('db:getStats', () => db.getStats());
}

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

// Update timer state from renderer (for tray menu updates)
ipcMain.handle('update-timer-state', (event, state) => {
  console.log('Timer state update received:', state);
  currentTimerState = { ...currentTimerState, ...state };
  updateTrayMenu();

  // Update tray tooltip
  if (tray) {
    if (state.isRunning && state.currentTask) {
      const status = state.isPaused ? 'Paused' : 'Running';
      tray.setToolTip(`Time Tracker - ${status}: ${state.currentTask.substring(0, 50)}`);
      console.log('Tray tooltip updated:', `${status}: ${state.currentTask}`);
    } else {
      tray.setToolTip('Time Tracker');
      console.log('Tray tooltip reset');
    }
  } else {
    console.log('Warning: Tray not available for tooltip update');
  }

  return true;
});
