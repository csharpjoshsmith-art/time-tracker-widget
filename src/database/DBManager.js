const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class DBManager {
    constructor() {
        this.db = null;
        this.initialize();
    }

    initialize() {
        // Determine database path based on environment
        const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
        const dbPath = isDev
            ? path.join(__dirname, '../../timetracker.db')
            : path.join(app.getPath('userData'), 'timetracker.db');

        console.log('Database path:', dbPath);

        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Open database
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL'); // Better concurrency

        // Create tables
        this.createTables();
    }

    createTables() {
        // Time Entries table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS time_entries (
                id INTEGER PRIMARY KEY,
                task TEXT NOT NULL,
                date TEXT NOT NULL,
                duration INTEGER NOT NULL,
                timestamp INTEGER NOT NULL
            )
        `);

        // Custom Tasks table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS custom_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_name TEXT UNIQUE NOT NULL
            )
        `);

        // Recent Tasks table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS recent_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_name TEXT UNIQUE NOT NULL,
                last_used INTEGER NOT NULL
            )
        `);

        // Settings table (key-value store)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        // Create indexes for better performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
            CREATE INDEX IF NOT EXISTS idx_time_entries_timestamp ON time_entries(timestamp);
            CREATE INDEX IF NOT EXISTS idx_recent_tasks_last_used ON recent_tasks(last_used DESC);
        `);
    }

    // Time Entries methods
    addTimeEntry(entry) {
        const stmt = this.db.prepare(`
            INSERT INTO time_entries (id, task, date, duration, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(entry.id, entry.task, entry.date, entry.duration, entry.timestamp);
    }

    getAllTimeEntries() {
        const stmt = this.db.prepare('SELECT * FROM time_entries ORDER BY timestamp DESC');
        return stmt.all();
    }

    getTimeEntry(id) {
        const stmt = this.db.prepare('SELECT * FROM time_entries WHERE id = ?');
        return stmt.get(id);
    }

    updateTimeEntry(id, updates) {
        const { task, date, duration } = updates;
        const stmt = this.db.prepare(`
            UPDATE time_entries
            SET task = ?, date = ?, duration = ?
            WHERE id = ?
        `);
        return stmt.run(task, date, duration, id);
    }

    deleteTimeEntry(id) {
        const stmt = this.db.prepare('DELETE FROM time_entries WHERE id = ?');
        return stmt.run(id);
    }

    deleteTimeEntries(ids) {
        const placeholders = ids.map(() => '?').join(',');
        const stmt = this.db.prepare(`DELETE FROM time_entries WHERE id IN (${placeholders})`);
        return stmt.run(...ids);
    }

    getTimeEntriesByDateRange(startDate, endDate) {
        const stmt = this.db.prepare(`
            SELECT * FROM time_entries
            WHERE date >= ? AND date < ?
            ORDER BY timestamp DESC
        `);
        return stmt.all(startDate, endDate);
    }

    // Custom Tasks methods
    addCustomTask(taskName) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO custom_tasks (task_name) VALUES (?)');
        return stmt.run(taskName);
    }

    getAllCustomTasks() {
        const stmt = this.db.prepare('SELECT task_name FROM custom_tasks ORDER BY id');
        return stmt.all().map(row => row.task_name);
    }

    deleteCustomTask(taskName) {
        const stmt = this.db.prepare('DELETE FROM custom_tasks WHERE task_name = ?');
        return stmt.run(taskName);
    }

    // Recent Tasks methods
    addRecentTask(taskName) {
        const timestamp = Date.now();
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO recent_tasks (task_name, last_used)
            VALUES (?, ?)
        `);
        return stmt.run(taskName, timestamp);
    }

    getRecentTasks(limit = 5) {
        const stmt = this.db.prepare(`
            SELECT task_name FROM recent_tasks
            ORDER BY last_used DESC
            LIMIT ?
        `);
        return stmt.all(limit).map(row => row.task_name);
    }

    // Settings methods (stores JSON as strings)
    getSetting(key) {
        const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
        const row = stmt.get(key);
        return row ? JSON.parse(row.value) : null;
    }

    setSetting(key, value) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO settings (key, value)
            VALUES (?, ?)
        `);
        return stmt.run(key, JSON.stringify(value));
    }

    deleteSetting(key) {
        const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?');
        return stmt.run(key);
    }

    getAllSettings() {
        const stmt = this.db.prepare('SELECT key, value FROM settings');
        const rows = stmt.all();
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = JSON.parse(row.value);
        });
        return settings;
    }

    // Migration from electron-store
    migrateFromElectronStore(store) {
        console.log('Starting migration from electron-store...');

        try {
            // Migrate time entries
            const timeEntries = store.get('timeEntries') || [];
            console.log(`Migrating ${timeEntries.length} time entries...`);
            const insertEntry = this.db.prepare(`
                INSERT OR REPLACE INTO time_entries (id, task, date, duration, timestamp)
                VALUES (?, ?, ?, ?, ?)
            `);
            const insertMany = this.db.transaction((entries) => {
                for (const entry of entries) {
                    insertEntry.run(entry.id, entry.task, entry.date, entry.duration, entry.timestamp);
                }
            });
            insertMany(timeEntries);

            // Migrate custom tasks
            const customTasks = store.get('customTasks') || [];
            console.log(`Migrating ${customTasks.length} custom tasks...`);
            for (const task of customTasks) {
                this.addCustomTask(task);
            }

            // Migrate recent tasks
            const recentTasks = store.get('recentTasks') || [];
            console.log(`Migrating ${recentTasks.length} recent tasks...`);
            for (const task of recentTasks) {
                this.addRecentTask(task);
            }

            // Migrate settings
            const jiraSettings = store.get('jiraSettings');
            if (jiraSettings) {
                this.setSetting('jiraSettings', jiraSettings);
                console.log('Migrated Jira settings');
            }

            const teamsSettings = store.get('teamsSettings');
            if (teamsSettings) {
                this.setSetting('teamsSettings', teamsSettings);
                console.log('Migrated Teams settings');
            }

            console.log('Migration completed successfully!');
            return { success: true, message: 'Migration completed' };
        } catch (error) {
            console.error('Migration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    close() {
        if (this.db) {
            this.db.close();
        }
    }

    // Database maintenance
    vacuum() {
        this.db.exec('VACUUM');
    }

    getStats() {
        const entryCount = this.db.prepare('SELECT COUNT(*) as count FROM time_entries').get().count;
        const customTaskCount = this.db.prepare('SELECT COUNT(*) as count FROM custom_tasks').get().count;
        const recentTaskCount = this.db.prepare('SELECT COUNT(*) as count FROM recent_tasks').get().count;

        return {
            timeEntries: entryCount,
            customTasks: customTaskCount,
            recentTasks: recentTaskCount
        };
    }
}

// Export singleton instance
let dbInstance = null;

module.exports = {
    getDB: () => {
        if (!dbInstance) {
            dbInstance = new DBManager();
        }
        return dbInstance;
    },
    DBManager
};
