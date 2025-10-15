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

// Keep existing IPC communication for other features
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, callback) => {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        },
        removeListener: (channel, callback) => {
            ipcRenderer.removeListener(channel, callback);
        }
    }
});
