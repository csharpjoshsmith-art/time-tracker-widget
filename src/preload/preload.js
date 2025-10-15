const { contextBridge, ipcRenderer } = require('electron');

// Expose secure database API to renderer
contextBridge.exposeInMainWorld('db', {
    // Time Entries
    addTimeEntry: (entry) => ipcRenderer.invoke('db:addTimeEntry', entry),
    getAllTimeEntries: () => ipcRenderer.invoke('db:getAllTimeEntries'),
    getTimeEntry: (id) => ipcRenderer.invoke('db:getTimeEntry', id),
    updateTimeEntry: (id, updates) => ipcRenderer.invoke('db:updateTimeEntry', id, updates),
    deleteTimeEntry: (id) => ipcRenderer.invoke('db:deleteTimeEntry', id),
    deleteTimeEntries: (ids) => ipcRenderer.invoke('db:deleteTimeEntries', ids),
    getTimeEntriesByDateRange: (startDate, endDate) => ipcRenderer.invoke('db:getTimeEntriesByDateRange', startDate, endDate),

    // Custom Tasks
    addCustomTask: (taskName) => ipcRenderer.invoke('db:addCustomTask', taskName),
    getAllCustomTasks: () => ipcRenderer.invoke('db:getAllCustomTasks'),
    deleteCustomTask: (taskName) => ipcRenderer.invoke('db:deleteCustomTask', taskName),

    // Recent Tasks
    addRecentTask: (taskName) => ipcRenderer.invoke('db:addRecentTask', taskName),
    getRecentTasks: (limit) => ipcRenderer.invoke('db:getRecentTasks', limit),

    // Settings
    getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),
    deleteSetting: (key) => ipcRenderer.invoke('db:deleteSetting', key),
    getAllSettings: () => ipcRenderer.invoke('db:getAllSettings'),

    // Stats
    getStats: () => ipcRenderer.invoke('db:getStats')
});

// Expose IPC for other features (Jira, Teams, Settings window, etc.)
contextBridge.exposeInMainWorld('ipcRenderer', {
    // Generic invoke
    invoke: (channel, ...args) => {
        // Whitelist of allowed channels
        const validChannels = [
            'open-settings',
            'fetch-jira-tickets',
            'fetch-jira-reporter-tickets',
            'test-jira-connection',
            'teams-authenticate',
            'teams-get-current-meetings',
            'teams-test-connection',
            'teams-toggle-monitoring',
            'teams-get-current-call',
            'open-jira-ticket',
            'update-timer-state'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Invalid channel: ${channel}`);
    },
    // Event listeners
    on: (channel, callback) => {
        const validChannels = [
            'teams-call-started',
            'teams-call-ended',
            'teams-call-updated',
            'tray-action'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    removeListener: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    }
});
