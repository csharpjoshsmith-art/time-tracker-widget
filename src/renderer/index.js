const { ipcRenderer } = require('electron');
const axios = require('axios');

// State Management
let timerInterval = null;
let currentTask = null;
let startTime = null;
let elapsedSeconds = 0;
let isPaused = false;
let pausedTime = 0;
let preCallTask = null; // Store task before Teams call
let preCallStartTime = null;
let preCallElapsedSeconds = 0;
let currentTeamsCallRecord = null; // Store Teams call info for linking
let pendingTeamsCallEntryId = null; // Store the entry ID to update after linking

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const currentTaskDisplay = document.getElementById('currentTask');
const timerStatus = document.getElementById('timerStatus');
const pauseBtn = document.getElementById('pauseBtn');
const lunchBtn = document.getElementById('lunchBtn');
const stopBtn = document.getElementById('stopBtn');
const settingsBtn = document.getElementById('settingsBtn');
const refreshJiraBtn = document.getElementById('refreshJiraBtn');
const refreshReporterBtn = document.getElementById('refreshReporterBtn');
const weeklyReportBtn = document.getElementById('weeklyReportBtn');
const customTaskInput = document.getElementById('customTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const reportModal = document.getElementById('reportModal');
const closeModal = document.querySelector('.close');
const exportReportBtn = document.getElementById('exportReportBtn');

// Initialize
init();

async function init() {
    loadCustomTasks();
    loadRecentTasks();
    updateTodaySummary();
    updateWeekSummary();
    checkJiraConfiguration();
    checkReporterConfiguration();
    setupEventListeners();
    setupTeamsListeners();
}

function setupEventListeners() {
    // Quick tasks
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.addEventListener('click', () => startTask(btn.dataset.task));
    });

    // Control buttons
    pauseBtn.addEventListener('click', togglePause);
    lunchBtn.addEventListener('click', () => startTask('Lunch Break'));
    stopBtn.addEventListener('click', stopTask);

    // Custom tasks
    addTaskBtn.addEventListener('click', addCustomTask);
    customTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCustomTask();
    });

    // Settings and reports
    settingsBtn.addEventListener('click', openSettings);
    refreshJiraBtn.addEventListener('click', fetchJiraTickets);
    refreshReporterBtn.addEventListener('click', fetchReporterTickets);
    weeklyReportBtn.addEventListener('click', showWeeklyReport);

    // Modal
    closeModal.addEventListener('click', () => {
        reportModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            reportModal.style.display = 'none';
        }
    });
    exportReportBtn.addEventListener('click', exportReport);

    // Event delegation for time entry edit/delete buttons (Today's Summary)
    document.getElementById('todaySummary').addEventListener('click', async (e) => {
        const button = e.target.closest('.entry-action-btn');
        if (!button) return;

        const entryElement = button.closest('.summary-entry');
        if (!entryElement) return;

        const entryId = parseInt(entryElement.dataset.entryId);
        const action = button.dataset.action;

        if (action === 'edit') {
            await editTimeEntry(entryId);
        } else if (action === 'delete') {
            await deleteTimeEntry(entryId);
        }
    });

    // Event delegation for time entry edit/delete buttons (Week Summary)
    document.getElementById('weekSummary').addEventListener('click', async (e) => {
        const button = e.target.closest('.entry-action-btn');
        if (!button) return;

        const entryElement = button.closest('.summary-entry');
        if (!entryElement) return;

        const entryId = parseInt(entryElement.dataset.entryId);
        const action = button.dataset.action;

        if (action === 'edit') {
            await editTimeEntry(entryId);
        } else if (action === 'delete') {
            await deleteTimeEntry(entryId);
        }
    });

    // Edit Entry Modal handlers
    document.querySelector('.close-edit').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('saveEditBtn').addEventListener('click', saveEditedEntry);

    // Delete Confirmation Modal handlers
    document.querySelector('.close-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const editModal = document.getElementById('editEntryModal');
        const deleteModal = document.getElementById('deleteConfirmModal');
        const bulkDeleteModal = document.getElementById('bulkDeleteModal');

        if (e.target === editModal) {
            closeEditModal();
        }
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
        if (e.target === bulkDeleteModal) {
            closeBulkDeleteModal();
        }
    });

    // Allow Enter key to save in edit modal
    document.getElementById('editMinutes').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEditedEntry();
    });

    // Collapsible "This Week" section
    const weekHeader = document.getElementById('weekHeader');
    const weekSummary = document.getElementById('weekSummary');
    if (weekHeader && weekSummary) {
        weekHeader.addEventListener('click', () => {
            weekHeader.classList.toggle('collapsed');
            weekSummary.classList.toggle('collapsed');
        });
    }

    // Collapsible "Today's Summary" section
    const todayHeader = document.getElementById('todayHeader');
    const todaySummary = document.getElementById('todaySummary');
    if (todayHeader && todaySummary) {
        todayHeader.addEventListener('click', () => {
            todayHeader.classList.toggle('collapsed');
            todaySummary.classList.toggle('collapsed');
        });
    }

    // Teams Call End Modal handlers
    document.querySelector('.close-teams-end')?.addEventListener('click', closeTeamsCallEndModal);
    document.getElementById('skipJiraLinkBtn')?.addEventListener('click', skipJiraLink);
    document.getElementById('confirmJiraLinkBtn')?.addEventListener('click', confirmJiraLink);
    document.getElementById('teamsProjectSelect')?.addEventListener('change', handleTeamsProjectChange);
    document.getElementById('teamsTicketSelect')?.addEventListener('change', handleTeamsTicketChange);

    // Bulk Delete Modal handlers
    document.querySelector('.close-bulk-delete')?.addEventListener('click', closeBulkDeleteModal);
    document.getElementById('cancelBulkDeleteBtn')?.addEventListener('click', closeBulkDeleteModal);
    document.getElementById('confirmBulkDeleteBtn')?.addEventListener('click', confirmBulkDelete);
}

function startTask(taskName) {
    if (currentTask === taskName && !isPaused) {
        // Task already running
        return;
    }

    if (currentTask && currentTask !== taskName) {
        // Stop current task before starting new one
        stopTask();
    }

    currentTask = taskName;
    startTime = Date.now() - (pausedTime * 1000);
    isPaused = false;
    pausedTime = 0;

    currentTaskDisplay.textContent = taskName;
    timerStatus.textContent = 'Running';

    pauseBtn.disabled = false;
    stopBtn.disabled = false;

    // Highlight active task
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.task === taskName || btn.textContent.includes(taskName)) {
            btn.classList.add('active');
        }
    });

    if (!timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
    }
}

function togglePause() {
    if (isPaused) {
        // Resume
        startTime = Date.now() - (elapsedSeconds * 1000);
        isPaused = false;
        pauseBtn.textContent = '⏸️ Pause';
        timerStatus.textContent = 'Running';
        timerInterval = setInterval(updateTimer, 1000);
    } else {
        // Pause
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
        pausedTime = elapsedSeconds;
        pauseBtn.textContent = '▶️ Resume';
        timerStatus.textContent = 'Paused';
    }
}

function stopTask() {
    if (!currentTask) return;

    clearInterval(timerInterval);
    timerInterval = null;

    // Save time entry
    const duration = elapsedSeconds;
    saveTimeEntry(currentTask, duration);

    // Reset state
    currentTask = null;
    startTime = null;
    elapsedSeconds = 0;
    isPaused = false;
    pausedTime = 0;

    currentTaskDisplay.textContent = 'No task selected';
    timerStatus.textContent = 'Stopped';
    timerDisplay.textContent = '00:00:00';

    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    pauseBtn.textContent = '⏸️ Pause';

    // Remove active highlighting
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    updateTodaySummary();
}

function updateTimer() {
    if (isPaused) return;

    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    timerDisplay.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function saveTimeEntry(task, durationSeconds) {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];

    const entry = {
        id: Date.now(),
        task: task,
        date: new Date().toISOString(),
        duration: durationSeconds,
        timestamp: Date.now()
    };

    entries.push(entry);
    await ipcRenderer.invoke('store-set', 'timeEntries', entries);

    // Update recent tasks when a task is completed
    await updateRecentTasks(task);
}

async function updateRecentTasks(taskName) {
    let recentTasks = await ipcRenderer.invoke('store-get', 'recentTasks') || [];

    // Remove task if it already exists (to move it to the front)
    recentTasks = recentTasks.filter(t => t !== taskName);

    // Add task to the beginning
    recentTasks.unshift(taskName);

    // Keep only the 5 most recent
    recentTasks = recentTasks.slice(0, 5);

    await ipcRenderer.invoke('store-set', 'recentTasks', recentTasks);

    // Refresh the display
    loadRecentTasks();
}

async function loadRecentTasks() {
    const recentTasks = await ipcRenderer.invoke('store-get', 'recentTasks') || [];
    const container = document.getElementById('recentTasks');

    if (recentTasks.length === 0) {
        container.innerHTML = '<div class="empty-message">No recent tasks</div>';
        return;
    }

    container.innerHTML = '';

    recentTasks.forEach(task => {
        const btn = document.createElement('button');
        btn.className = 'task-btn recent-task-btn';
        btn.textContent = task;
        btn.addEventListener('click', () => startTask(task));
        container.appendChild(btn);
    });
}

async function updateTodaySummary() {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
    const today = new Date().toDateString();

    const todayEntries = entries.filter(entry =>
        new Date(entry.date).toDateString() === today
    );

    const summaryBox = document.getElementById('todaySummary');

    if (todayEntries.length === 0) {
        summaryBox.innerHTML = '<p>No time tracked today</p>';
        return;
    }

    // Sort by most recent first
    todayEntries.sort((a, b) => b.timestamp - a.timestamp);

    let html = '<div class="summary-entries">';
    let totalSeconds = 0;

    todayEntries.forEach(entry => {
        totalSeconds += entry.duration;
        const time = new Date(entry.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        html += `
            <div class="summary-entry" data-entry-id="${entry.id}">
                <input type="checkbox" class="entry-checkbox" data-entry-id="${entry.id}">
                <div class="entry-details">
                    <span class="entry-time">${time}</span>
                    <span class="entry-task">${entry.task}</span>
                    <span class="entry-duration">${formatDuration(entry.duration)}</span>
                </div>
                <div class="entry-actions">
                    <button class="entry-action-btn edit-btn" data-action="edit" title="Edit duration">✏️</button>
                    <button class="entry-action-btn delete-btn" data-action="delete" title="Delete entry">🗑️</button>
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Add bulk delete button
    html += '<div id="todayBulkActions" class="bulk-actions" style="display: none;"><button id="todayBulkDeleteBtn" class="danger-btn">🗑️ Delete Selected (<span id="todaySelectedCount">0</span>)</button></div>';

    html += `
        <div class="summary-total">
            <span>Total Today</span>
            <span>${formatDuration(totalSeconds)}</span>
        </div>
    `;

    summaryBox.innerHTML = html;

    // Add event listeners for checkboxes
    document.querySelectorAll('#todaySummary .entry-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => updateBulkActions('today'));
    });

    // Add bulk delete button handler
    const bulkDeleteBtn = document.getElementById('todayBulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', () => bulkDeleteEntries('today'));
    }
}

async function updateWeekSummary() {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];

    // Get current week (Saturday to Friday)
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceSaturday = currentDay === 6 ? 0 : (currentDay + 1);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceSaturday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Update week range display
    const weekRangeText = `(${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(weekEnd.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    document.getElementById('weekRange').textContent = weekRangeText;

    const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate < weekEnd;
    });

    const summaryBox = document.getElementById('weekSummary');

    if (weekEntries.length === 0) {
        summaryBox.innerHTML = '<p>No time tracked this week</p>';
        return;
    }

    // Sort by date, most recent first
    weekEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '<div class="summary-entries">';
    let totalSeconds = 0;

    weekEntries.forEach(entry => {
        totalSeconds += entry.duration;
        const date = new Date(entry.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        html += `
            <div class="summary-entry" data-entry-id="${entry.id}">
                <input type="checkbox" class="entry-checkbox" data-entry-id="${entry.id}">
                <div class="entry-details">
                    <span class="entry-time">${date}</span>
                    <span class="entry-task">${entry.task}</span>
                    <span class="entry-duration">${formatDuration(entry.duration)}</span>
                </div>
                <div class="entry-actions">
                    <button class="entry-action-btn edit-btn" data-action="edit" title="Edit entry">✏️</button>
                    <button class="entry-action-btn delete-btn" data-action="delete" title="Delete entry">🗑️</button>
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Add bulk delete button
    html += '<div id="weekBulkActions" class="bulk-actions" style="display: none;"><button id="weekBulkDeleteBtn" class="danger-btn">🗑️ Delete Selected (<span id="weekSelectedCount">0</span>)</button></div>';

    html += `
        <div class="summary-total">
            <span>Total This Week</span>
            <span>${formatDuration(totalSeconds)}</span>
        </div>
    `;

    summaryBox.innerHTML = html;

    // Add event listeners for checkboxes
    document.querySelectorAll('#weekSummary .entry-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => updateBulkActions('week'));
    });

    // Add bulk delete button handler
    const bulkDeleteBtn = document.getElementById('weekBulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', () => bulkDeleteEntries('week'));
    }
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

async function addCustomTask() {
    const taskName = customTaskInput.value.trim();
    if (!taskName) return;

    const customTasks = await ipcRenderer.invoke('store-get', 'customTasks') || [];
    
    if (!customTasks.includes(taskName)) {
        customTasks.push(taskName);
        await ipcRenderer.invoke('store-set', 'customTasks', customTasks);
        loadCustomTasks();
    }

    customTaskInput.value = '';
}

async function loadCustomTasks() {
    const customTasks = await ipcRenderer.invoke('store-get', 'customTasks') || [];
    const container = document.getElementById('customTasks');
    
    container.innerHTML = '';
    
    customTasks.forEach(task => {
        const btn = document.createElement('button');
        btn.className = 'task-btn custom';
        btn.innerHTML = `
            <span>${task}</span>
            <button class="delete-task-btn" onclick="deleteCustomTask('${task}')">✕</button>
        `;
        btn.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-task-btn')) {
                startTask(task);
            }
        });
        container.appendChild(btn);
    });
}

async function deleteCustomTask(taskName) {
    const customTasks = await ipcRenderer.invoke('store-get', 'customTasks') || [];
    const filtered = customTasks.filter(t => t !== taskName);
    await ipcRenderer.invoke('store-set', 'customTasks', filtered);
    loadCustomTasks();
}

async function checkJiraConfiguration() {
    const settings = await ipcRenderer.invoke('store-get', 'jiraSettings');
    const statusDiv = document.getElementById('jiraStatus');

    if (settings && settings.domain && settings.email && settings.apiToken) {
        statusDiv.textContent = `Connected to ${settings.domain}`;
        statusDiv.style.color = '#27ae60';
        fetchJiraTickets();
    } else {
        statusDiv.textContent = 'Not configured - Click Settings to setup';
        statusDiv.style.color = '#e74c3c';
    }
}

async function checkReporterConfiguration() {
    const settings = await ipcRenderer.invoke('store-get', 'jiraSettings');
    const statusDiv = document.getElementById('reporterStatus');

    if (settings && settings.domain && settings.email && settings.apiToken) {
        statusDiv.textContent = `Connected to ${settings.domain}`;
        statusDiv.style.color = '#27ae60';
        fetchReporterTickets();
    } else {
        statusDiv.textContent = 'Not configured - Click Settings to setup';
        statusDiv.style.color = '#e74c3c';
    }
}

// Store all tickets globally for filtering
let allJiraTickets = [];
let currentSelectedProject = null;
let jiraDomain = null;

// Generate consistent color for project key
function getProjectColor(projectKey) {
    // Hash the project key to get a consistent number
    let hash = 0;
    for (let i = 0; i < projectKey.length; i++) {
        hash = projectKey.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to HSL for better color distribution
    // Use hue range that avoids red/pink (which might look like errors)
    const hue = Math.abs(hash % 300); // 0-300 range, avoiding 300-360 (reds/pinks)
    const saturation = 65; // Medium saturation for subtle colors
    const lightness = 92; // Very light for backgrounds

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

async function fetchJiraTickets() {
    const settings = await ipcRenderer.invoke('store-get', 'jiraSettings');

    if (!settings || !settings.domain || !settings.email || !settings.apiToken) {
        alert('Please configure Jira settings first');
        return;
    }

    // Store domain for building ticket URLs
    jiraDomain = settings.domain;

    const statusDiv = document.getElementById('jiraStatus');
    statusDiv.textContent = 'Fetching tickets...';

    try {
        // Call main process to fetch tickets (avoids CORS/XSRF issues)
        const result = await ipcRenderer.invoke('fetch-jira-tickets', settings);

        if (result.success) {
            allJiraTickets = result.data.issues;
            displayProjectSidebar(allJiraTickets);
            // Show all tickets initially
            displayJiraTickets(allJiraTickets);
            statusDiv.textContent = `Found ${allJiraTickets.length} tickets`;
            statusDiv.style.color = '#27ae60';
        } else {
            console.error('Jira fetch error:', result.error);
            statusDiv.textContent = `Error: ${result.status || 'Unknown'} - Check credentials`;
            statusDiv.style.color = '#e74c3c';

            if (result.error) {
                console.error('Jira error details:', result.error);
            }
        }
    } catch (error) {
        console.error('Jira fetch error:', error);
        statusDiv.textContent = 'Error fetching tickets - check console';
        statusDiv.style.color = '#e74c3c';
    }
}

async function fetchJiraTicketsAlternative(settings, statusDiv) {
    try {
        const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64');
        
        // Try with a simpler JQL query
        const response = await axios({
            method: 'post',
            url: `https://${settings.domain}/rest/api/3/search`,
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

        displayJiraTickets(response.data.issues);
        statusDiv.textContent = `Found ${response.data.issues.length} tickets`;
        statusDiv.style.color = '#27ae60';
    } catch (error) {
        console.error('Alternative Jira fetch also failed:', error);
        statusDiv.textContent = 'Error fetching tickets';
        statusDiv.style.color = '#e74c3c';
    }
}

function displayProjectSidebar(issues) {
    const sidebar = document.getElementById('projectSidebar');
    sidebar.innerHTML = '';

    if (issues.length === 0) {
        return;
    }

    // Group tickets by project
    const projectGroups = {};
    issues.forEach(issue => {
        const projectKey = issue.fields.project.key;
        const projectName = issue.fields.project.name;

        if (!projectGroups[projectKey]) {
            projectGroups[projectKey] = {
                key: projectKey,
                name: projectName,
                count: 0,
                tickets: []
            };
        }
        projectGroups[projectKey].count++;
        projectGroups[projectKey].tickets.push(issue);
    });

    // Sort projects by key
    const sortedProjects = Object.values(projectGroups).sort((a, b) =>
        a.key.localeCompare(b.key)
    );

    // Create "All" tab
    const allTab = document.createElement('button');
    allTab.className = 'project-tab active';
    allTab.innerHTML = `
        All
        <span class="project-tab-count">${issues.length} tickets</span>
    `;
    allTab.addEventListener('click', () => {
        currentSelectedProject = null;
        displayJiraTickets(allJiraTickets);
        document.querySelectorAll('.project-tab').forEach(tab => tab.classList.remove('active'));
        allTab.classList.add('active');
    });
    sidebar.appendChild(allTab);

    // Create project tabs
    sortedProjects.forEach(project => {
        const tab = document.createElement('button');
        tab.className = 'project-tab';
        tab.title = project.name;
        tab.innerHTML = `
            ${project.key}
            <span class="project-tab-count">${project.count} tickets</span>
        `;
        tab.addEventListener('click', () => {
            currentSelectedProject = project.key;
            displayJiraTickets(project.tickets);
            document.querySelectorAll('.project-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
        sidebar.appendChild(tab);
    });
}

function displayJiraTickets(issues) {
    const container = document.getElementById('jiraTickets');
    container.innerHTML = '';

    if (issues.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No tickets found</p>';
        return;
    }

    issues.forEach(issue => {
        const btn = document.createElement('button');
        btn.className = 'task-btn jira-ticket';

        // Get project key and apply color
        const projectKey = issue.fields.project.key;
        const projectColor = getProjectColor(projectKey);
        btn.style.backgroundColor = projectColor;

        btn.innerHTML = `
            <span class="ticket-key">${issue.key}</span>
            <span class="ticket-summary">${issue.fields.summary}</span>
        `;
        btn.addEventListener('click', () => startTask(`${issue.key}: ${issue.fields.summary}`));

        // Add right-click context menu
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showJiraContextMenu(e, issue.key);
        });

        container.appendChild(btn);
    });
}

async function fetchReporterTickets() {
    const settings = await ipcRenderer.invoke('store-get', 'jiraSettings');

    if (!settings || !settings.domain || !settings.email || !settings.apiToken) {
        alert('Please configure Jira settings first');
        return;
    }

    // Store domain for building ticket URLs
    jiraDomain = settings.domain;

    const statusDiv = document.getElementById('reporterStatus');
    statusDiv.textContent = 'Fetching tickets...';

    try {
        // Call main process to fetch reporter tickets
        const result = await ipcRenderer.invoke('fetch-jira-reporter-tickets', settings);

        if (result.success) {
            displayReporterTickets(result.data.issues);
            statusDiv.textContent = `Found ${result.data.issues.length} tickets`;
            statusDiv.style.color = '#27ae60';
        } else {
            console.error('Jira reporter fetch error:', result.error);
            statusDiv.textContent = `Error: ${result.status || 'Unknown'} - Check credentials`;
            statusDiv.style.color = '#e74c3c';

            if (result.error) {
                console.error('Jira error details:', result.error);
            }
        }
    } catch (error) {
        console.error('Jira reporter fetch error:', error);
        statusDiv.textContent = 'Error fetching tickets - check console';
        statusDiv.style.color = '#e74c3c';
    }
}

function displayReporterTickets(issues) {
    const container = document.getElementById('reporterTickets');
    container.innerHTML = '';

    if (issues.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No tickets found</p>';
        return;
    }

    issues.forEach(issue => {
        const btn = document.createElement('button');
        btn.className = 'task-btn reporter-ticket';

        // Get project key and apply color
        const projectKey = issue.fields.project.key;
        const projectColor = getProjectColor(projectKey);
        btn.style.backgroundColor = projectColor;

        const assigneeName = issue.fields.assignee
            ? issue.fields.assignee.displayName
            : 'Unassigned';

        btn.innerHTML = `
            <span class="ticket-key">${issue.key}</span>
            <span class="ticket-summary">${issue.fields.summary}</span>
            <span class="ticket-assignee">Assignee: ${assigneeName}</span>
        `;
        btn.addEventListener('click', () => startTask(`${issue.key}: ${issue.fields.summary}`));

        // Add right-click context menu
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showJiraContextMenu(e, issue.key);
        });

        container.appendChild(btn);
    });
}

// Context menu for Jira tickets
function showJiraContextMenu(event, ticketKey) {
    // Remove any existing context menu
    const existingMenu = document.getElementById('jiraContextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'jiraContextMenu';
    menu.className = 'context-menu';

    // Use clientX/clientY for viewport-relative positioning
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.position = 'fixed';
    menu.style.zIndex = '10000';

    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = '🔗 Open in Jira';
    menuItem.addEventListener('click', async () => {
        await openJiraTicket(ticketKey);
        menu.remove();
    });

    menu.appendChild(menuItem);
    document.body.appendChild(menu);

    // Close menu when clicking elsewhere
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };

    // Use setTimeout to avoid immediate closure
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

async function openJiraTicket(ticketKey) {
    if (!jiraDomain) {
        alert('Jira domain not configured');
        return;
    }

    const ticketUrl = `https://${jiraDomain}/browse/${ticketKey}`;

    try {
        const result = await ipcRenderer.invoke('open-jira-ticket', ticketUrl);
        if (!result.success) {
            alert(`Failed to open Jira ticket: ${result.error}`);
        }
    } catch (error) {
        console.error('Error opening Jira ticket:', error);
        alert('Failed to open Jira ticket');
    }
}

async function openSettings() {
    try {
        await ipcRenderer.invoke('open-settings');
    } catch (error) {
        console.error('Error opening settings:', error);
        alert('Error opening settings. Please check the console for details.');
    }
}

async function showWeeklyReport() {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];

    // Get current week (Saturday to Friday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate days since last Saturday
    // If today is Saturday (6), daysSinceSaturday = 0
    // If today is Sunday (0), daysSinceSaturday = 1
    // If today is Monday (1), daysSinceSaturday = 2, etc.
    const daysSinceSaturday = currentDay === 6 ? 0 : (currentDay + 1);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceSaturday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);

    const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate < weekEnd;
    });

    // Sort entries by date, then by task
    weekEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let html = `
        <div class="report-week">
            <h3>Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</h3>
            <div class="report-entries">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Task</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let totalSeconds = 0;
    weekEntries.forEach(entry => {
        totalSeconds += entry.duration;
        const date = new Date(entry.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        html += `
            <tr>
                <td>${date}</td>
                <td>${entry.task}</td>
                <td>${formatDuration(entry.duration)}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
            <div class="report-total">
                <span>Total Week</span>
                <span>${formatDuration(totalSeconds)}</span>
            </div>
        </div>
    `;

    document.getElementById('reportContent').innerHTML = html;
    reportModal.style.display = 'block';
}

async function exportReport() {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
    
    // Get current week (Saturday to Friday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate days since last Saturday
    const daysSinceSaturday = currentDay === 6 ? 0 : (currentDay + 1);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceSaturday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);
    
    const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate < weekEnd;
    });
    
    // Create CSV with better formatting
    let csv = 'Date,Task,Duration (hours),Duration (minutes)\n';

    weekEntries.forEach(entry => {
        const hours = (entry.duration / 3600).toFixed(2);
        const minutes = Math.round(entry.duration / 60);
        // Format date as YYYY-MM-DD for better sorting in Excel
        const date = new Date(entry.date).toISOString().split('T')[0];
        csv += `"${date}","${entry.task}","${hours}","${minutes}"\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${weekStart.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Make deleteCustomTask available globally
window.deleteCustomTask = deleteCustomTask;

// ==========================================
// TIME ENTRY MANAGEMENT
// ==========================================

let currentEditingEntryId = null;

async function editTimeEntry(entryId) {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
    const entry = entries.find(e => e.id === entryId);

    if (!entry) {
        alert('Entry not found');
        return;
    }

    // Store the entry ID for later
    currentEditingEntryId = entryId;

    // Convert current duration to hours and minutes
    const currentHours = Math.floor(entry.duration / 3600);
    const currentMinutes = Math.floor((entry.duration % 3600) / 60);

    // Format date for input (YYYY-MM-DD)
    const entryDate = new Date(entry.date);
    const dateString = entryDate.toISOString().split('T')[0];

    // Populate the modal
    document.getElementById('editEntryTask').textContent = entry.task;
    document.getElementById('editDate').value = dateString;
    document.getElementById('editHours').value = currentHours;
    document.getElementById('editMinutes').value = currentMinutes;

    // Show the modal
    document.getElementById('editEntryModal').style.display = 'block';

    // Focus on hours input
    setTimeout(() => {
        document.getElementById('editHours').focus();
        document.getElementById('editHours').select();
    }, 100);
}

async function saveEditedEntry() {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
    const entry = entries.find(e => e.id === currentEditingEntryId);

    if (!entry) {
        alert('Entry not found');
        closeEditModal();
        return;
    }

    const newDateValue = document.getElementById('editDate').value;
    const newHours = parseInt(document.getElementById('editHours').value) || 0;
    const newMinutes = parseInt(document.getElementById('editMinutes').value) || 0;
    const newDuration = (newHours * 3600) + (newMinutes * 60);

    if (!newDateValue) {
        alert('Please select a date');
        return;
    }

    if (newDuration <= 0) {
        alert('Duration must be greater than 0');
        return;
    }

    // Update the entry with new date and duration
    const newDate = new Date(newDateValue);
    // Preserve the original time component
    const originalDate = new Date(entry.date);
    newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());

    entry.date = newDate.toISOString();
    entry.duration = newDuration;
    await ipcRenderer.invoke('store-set', 'timeEntries', entries);

    // Close modal and refresh both summaries
    closeEditModal();
    updateTodaySummary();
    updateWeekSummary();
}

function closeEditModal() {
    document.getElementById('editEntryModal').style.display = 'none';
    currentEditingEntryId = null;
}

let currentDeletingEntryId = null;

async function deleteTimeEntry(entryId) {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
    const entry = entries.find(e => e.id === entryId);

    if (!entry) {
        alert('Entry not found');
        return;
    }

    // Store the entry ID for later
    currentDeletingEntryId = entryId;

    // Populate the modal
    document.getElementById('deleteEntryTask').textContent = entry.task;
    document.getElementById('deleteEntryDuration').textContent = formatDuration(entry.duration);

    // Show the modal
    document.getElementById('deleteConfirmModal').style.display = 'block';
}

async function confirmDelete() {
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];

    // Remove the entry
    const filteredEntries = entries.filter(e => e.id !== currentDeletingEntryId);
    await ipcRenderer.invoke('store-set', 'timeEntries', filteredEntries);

    // Close modal and refresh both displays
    closeDeleteModal();
    updateTodaySummary();
    updateWeekSummary();
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
    currentDeletingEntryId = null;
}

// Make functions available globally
window.editTimeEntry = editTimeEntry;
window.deleteTimeEntry = deleteTimeEntry;

// ==========================================
// BULK DELETE FUNCTIONALITY
// ==========================================

function updateBulkActions(section) {
    const container = section === 'today' ? '#todaySummary' : '#weekSummary';
    const checkboxes = document.querySelectorAll(`${container} .entry-checkbox`);
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);

    const bulkActionsId = section === 'today' ? 'todayBulkActions' : 'weekBulkActions';
    const countId = section === 'today' ? 'todaySelectedCount' : 'weekSelectedCount';

    const bulkActions = document.getElementById(bulkActionsId);
    const countSpan = document.getElementById(countId);

    if (bulkActions && countSpan) {
        if (checkedBoxes.length > 0) {
            bulkActions.style.display = 'block';
            countSpan.textContent = checkedBoxes.length;
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

let pendingBulkDeleteIds = [];

async function bulkDeleteEntries(section) {
    const container = section === 'today' ? '#todaySummary' : '#weekSummary';
    const checkboxes = document.querySelectorAll(`${container} .entry-checkbox:checked`);
    const entryIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.entryId));

    if (entryIds.length === 0) return;

    // Store the IDs for deletion
    pendingBulkDeleteIds = entryIds;

    // Show styled confirmation modal
    const count = entryIds.length;
    document.getElementById('bulkDeleteCount').textContent = count;
    document.getElementById('bulkDeleteEntryText').textContent = count === 1 ? 'entry' : 'entries';
    document.getElementById('bulkDeleteModal').style.display = 'block';
}

async function confirmBulkDelete() {
    if (pendingBulkDeleteIds.length === 0) {
        closeBulkDeleteModal();
        return;
    }

    // Delete all selected entries
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
    const filteredEntries = entries.filter(e => !pendingBulkDeleteIds.includes(e.id));
    await ipcRenderer.invoke('store-set', 'timeEntries', filteredEntries);

    // Clear pending IDs
    pendingBulkDeleteIds = [];

    // Close modal
    closeBulkDeleteModal();

    // Refresh both displays
    await updateTodaySummary();
    await updateWeekSummary();
}

function closeBulkDeleteModal() {
    document.getElementById('bulkDeleteModal').style.display = 'none';
    pendingBulkDeleteIds = [];
}

// ==========================================
// TEAMS INTEGRATION
// ==========================================

function setupTeamsListeners() {
    // Listen for Teams call events from main process
    ipcRenderer.on('teams-call-started', (event, callInfo) => {
        handleTeamsCallStarted(callInfo);
    });

    ipcRenderer.on('teams-call-ended', (event, callRecord) => {
        handleTeamsCallEnded(callRecord);
    });

    ipcRenderer.on('teams-call-updated', (event, callInfo) => {
        handleTeamsCallUpdated(callInfo);
    });
}

function handleTeamsCallStarted(callInfo) {
    console.log('Teams call started:', callInfo);

    // Update Teams status indicator
    updateTeamsStatus('in-call', callInfo.title);

    // Save current task if one is running (DON'T stop it, just pause state)
    if (currentTask && !currentTask.includes('Teams:')) {
        preCallTask = currentTask;
        preCallStartTime = startTime;
        preCallElapsedSeconds = elapsedSeconds;
        console.log('Saved pre-call task:', preCallTask);

        // Clear timer and task display (but DON'T save entry yet)
        clearInterval(timerInterval);
        timerInterval = null;
        currentTask = null;
        startTime = null;
        elapsedSeconds = 0;
        isPaused = false;
        pausedTime = 0;

        currentTaskDisplay.textContent = 'No task selected';
        timerStatus.textContent = 'Stopped';
        timerDisplay.textContent = '00:00:00';

        pauseBtn.disabled = true;
        stopBtn.disabled = true;

        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    // Check if user wants automatic tracking
    const shouldAutoTrack = localStorage.getItem('teamsAutoTrack') !== 'false';

    if (!shouldAutoTrack) {
        showTeamsCallNotification(callInfo, false);
        return;
    }

    // Auto-start tracking the call (manually, NOT using startTask to avoid duplicate entries)
    const taskName = formatTeamsTaskName(callInfo);

    currentTask = taskName;
    startTime = Date.now();
    elapsedSeconds = 0;
    isPaused = false;
    pausedTime = 0;

    currentTaskDisplay.textContent = taskName;
    timerStatus.textContent = 'Running';

    pauseBtn.disabled = false;
    stopBtn.disabled = false;

    if (!timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
    }

    showTeamsCallNotification(callInfo, true);
}

async function handleTeamsCallEnded(callRecord) {
    console.log('Teams call ended:', callRecord);

    // Update Teams status indicator
    updateTeamsStatus('active', 'Monitoring for calls...');

    // Store the call record for later linking
    currentTeamsCallRecord = callRecord;

    // If we were tracking this call, stop it and get the entry ID
    if (currentTask && currentTask.includes('Teams:')) {
        console.log('Stopping Teams call task:', currentTask);

        // Manually save the entry and get its ID before stopping
        const duration = elapsedSeconds;
        const taskToSave = currentTask;

        // Create and save the entry
        const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
        const newEntry = {
            id: Date.now(),
            task: taskToSave,
            date: new Date().toISOString(),
            duration: duration,
            timestamp: Date.now()
        };

        entries.push(newEntry);
        await ipcRenderer.invoke('store-set', 'timeEntries', entries);

        // Store the entry ID for later linking
        pendingTeamsCallEntryId = newEntry.id;
        console.log('Created entry with ID:', pendingTeamsCallEntryId);

        // Now clear the timer state (without calling stopTask which would create duplicate entry)
        clearInterval(timerInterval);
        timerInterval = null;
        currentTask = null;
        startTime = null;
        elapsedSeconds = 0;
        isPaused = false;
        pausedTime = 0;

        currentTaskDisplay.textContent = 'No task selected';
        timerStatus.textContent = 'Stopped';
        timerDisplay.textContent = '00:00:00';

        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        pauseBtn.textContent = '⏸️ Pause';

        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    // Show modal to link to Jira ticket
    await showTeamsCallEndModal(callRecord);
}

function handleTeamsCallUpdated(callInfo) {
    // Update the task name if it changed (e.g., meeting title became available)
    if (currentTask && currentTask.includes('Teams:')) {
        const newTaskName = formatTeamsTaskName(callInfo);
        if (newTaskName !== currentTask) {
            currentTask = newTaskName;
            currentTaskDisplay.textContent = newTaskName;
        }
    }
}

function formatTeamsTaskName(callInfo) {
    let taskName = 'Teams: ' + callInfo.title;

    // Add participants if available and not "Unknown"
    if (callInfo.participants && callInfo.participants !== 'Unknown') {
        const participants = callInfo.participants.split(',').map(p => p.trim());
        if (participants.length <= 3) {
            taskName += ` (${callInfo.participants})`;
        } else {
            // Too many participants, just show count
            taskName += ` (${participants.length} people)`;
        }
    }

    return taskName;
}

function showTeamsCallNotification(callInfo, autoTracked) {
    const notification = document.createElement('div');
    notification.className = 'teams-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <strong>📞 Teams Call${autoTracked ? ' - Auto-tracking started' : ' Started'}</strong>
            <p>${callInfo.title}</p>
            ${callInfo.participants !== 'Unknown' ? `<p class="participants">With: ${callInfo.participants}</p>` : ''}
        </div>
    `;

    document.body.appendChild(notification);

    // Fade in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function showTeamsCallEndNotification(callRecord, taskResumed) {
    const duration = formatDuration(callRecord.duration);

    const notification = document.createElement('div');
    notification.className = 'teams-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <strong>📞 Teams Call Ended</strong>
            <p>Duration: ${duration}</p>
            ${taskResumed ? '<p style="opacity: 0.9;">✓ Resumed previous task</p>' : ''}
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

async function toggleTeamsMonitoring(enabled) {
    await ipcRenderer.invoke('teams-toggle-monitoring', enabled);
}

function updateTeamsStatus(status, message) {
    const indicator = document.getElementById('teamsIndicator');
    const statusText = document.getElementById('teamsStatusText');

    if (!indicator || !statusText) return;

    // Remove all status classes
    indicator.classList.remove('active', 'in-call');

    // Add appropriate class
    if (status === 'active') {
        indicator.classList.add('active');
    } else if (status === 'in-call') {
        indicator.classList.add('in-call');
    }

    statusText.textContent = message;
}

// ==========================================
// TEAMS CALL JIRA LINKING
// ==========================================

async function showTeamsCallEndModal(callRecord) {
    const modal = document.getElementById('teamsCallEndModal');
    const callInfo = document.getElementById('teamsCallEndInfo');
    const duration = formatDuration(callRecord.duration);

    // Show call information
    callInfo.innerHTML = `
        <strong>${callRecord.title}</strong>
        <div style="margin-top: 5px; font-size: 13px;">Duration: ${duration}</div>
    `;

    // Populate project dropdown
    await populateTeamsProjectDropdown();

    // Show the modal
    modal.style.display = 'block';
}

async function populateTeamsProjectDropdown() {
    const projectSelect = document.getElementById('teamsProjectSelect');
    const ticketSelect = document.getElementById('teamsTicketSelect');

    // Reset dropdowns
    projectSelect.innerHTML = '<option value="">Select a project...</option>';
    ticketSelect.innerHTML = '<option value="">Select a project first...</option>';
    ticketSelect.disabled = true;
    document.getElementById('confirmJiraLinkBtn').disabled = true;

    // Get unique projects from all Jira tickets
    if (!allJiraTickets || allJiraTickets.length === 0) {
        projectSelect.innerHTML = '<option value="">No Jira tickets loaded</option>';
        projectSelect.disabled = true;
        return;
    }

    projectSelect.disabled = false;

    // Group by project
    const projects = {};
    allJiraTickets.forEach(issue => {
        const key = issue.fields.project.key;
        const name = issue.fields.project.name;
        if (!projects[key]) {
            projects[key] = name;
        }
    });

    // Sort projects by key
    const sortedProjects = Object.keys(projects).sort();

    sortedProjects.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${key} - ${projects[key]}`;
        projectSelect.appendChild(option);
    });
}

function handleTeamsProjectChange() {
    const projectSelect = document.getElementById('teamsProjectSelect');
    const ticketSelect = document.getElementById('teamsTicketSelect');
    const confirmBtn = document.getElementById('confirmJiraLinkBtn');

    const selectedProject = projectSelect.value;

    if (!selectedProject) {
        ticketSelect.innerHTML = '<option value="">Select a project first...</option>';
        ticketSelect.disabled = true;
        confirmBtn.disabled = true;
        return;
    }

    // Filter tickets by selected project
    const projectTickets = allJiraTickets.filter(
        issue => issue.fields.project.key === selectedProject
    );

    ticketSelect.innerHTML = '<option value="">Select a ticket...</option>';
    ticketSelect.disabled = false;
    confirmBtn.disabled = true;

    projectTickets.forEach(issue => {
        const option = document.createElement('option');
        option.value = issue.key;
        option.textContent = `${issue.key}: ${issue.fields.summary}`;
        option.dataset.summary = issue.fields.summary;
        ticketSelect.appendChild(option);
    });
}

function handleTeamsTicketChange() {
    const ticketSelect = document.getElementById('teamsTicketSelect');
    const confirmBtn = document.getElementById('confirmJiraLinkBtn');

    confirmBtn.disabled = !ticketSelect.value;
}

async function confirmJiraLink() {
    const ticketSelect = document.getElementById('teamsTicketSelect');
    const selectedTicket = ticketSelect.value;

    console.log('confirmJiraLink called');
    console.log('selectedTicket:', selectedTicket);
    console.log('pendingTeamsCallEntryId:', pendingTeamsCallEntryId);
    console.log('currentTeamsCallRecord:', currentTeamsCallRecord);

    if (!selectedTicket || !pendingTeamsCallEntryId || !currentTeamsCallRecord) {
        console.log('Missing data, closing modal');
        closeTeamsCallEndModal();
        await resumePreCallTask(false);
        return;
    }

    // Get the ticket summary
    const selectedOption = ticketSelect.options[ticketSelect.selectedIndex];
    const ticketSummary = selectedOption.dataset.summary;

    console.log('Updating entry', pendingTeamsCallEntryId, 'to link to', selectedTicket);

    // Update the time entry with the Jira ticket + meeting title
    const entries = await ipcRenderer.invoke('store-get', 'timeEntries') || [];
    console.log('Total entries:', entries.length);

    const entry = entries.find(e => e.id === pendingTeamsCallEntryId);

    if (entry) {
        console.log('Found entry, current task:', entry.task);
        // Format: JIRA-123: Ticket Summary - Meeting Title
        const newTask = `${selectedTicket}: ${ticketSummary} - ${currentTeamsCallRecord.title}`;
        entry.task = newTask;
        console.log('New task will be:', newTask);

        await ipcRenderer.invoke('store-set', 'timeEntries', entries);
        console.log('Entry saved');

        // Immediately refresh the displays to show the updated entry
        console.log('Refreshing displays...');
        await updateTodaySummary();
        await updateWeekSummary();
        console.log('Displays refreshed');
    } else {
        console.error('Entry not found with ID:', pendingTeamsCallEntryId);
    }

    closeTeamsCallEndModal();
    await resumePreCallTask(true);
}

async function skipJiraLink() {
    closeTeamsCallEndModal();
    resumePreCallTask(false);
}

function closeTeamsCallEndModal() {
    document.getElementById('teamsCallEndModal').style.display = 'none';
    pendingTeamsCallEntryId = null;
    currentTeamsCallRecord = null;
}

async function resumePreCallTask(taskResumed) {
    // Resume pre-call task if one was saved
    if (preCallTask) {
        console.log('Resuming pre-call task:', preCallTask);

        // Restore the previous task state
        currentTask = preCallTask;
        startTime = Date.now() - (preCallElapsedSeconds * 1000);
        elapsedSeconds = preCallElapsedSeconds;
        isPaused = false;
        pausedTime = 0;

        currentTaskDisplay.textContent = preCallTask;
        timerStatus.textContent = 'Running';

        pauseBtn.disabled = false;
        stopBtn.disabled = false;

        // Highlight the resumed task
        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.task === preCallTask || btn.textContent.includes(preCallTask)) {
                btn.classList.add('active');
            }
        });

        if (!timerInterval) {
            timerInterval = setInterval(updateTimer, 1000);
        }

        // Clear the saved task
        preCallTask = null;
        preCallStartTime = null;
        preCallElapsedSeconds = 0;
    }

    // Refresh displays - AWAIT these async functions
    await updateTodaySummary();
    await updateWeekSummary();

    // Show notification
    if (currentTeamsCallRecord) {
        showTeamsCallEndNotification(currentTeamsCallRecord, taskResumed && preCallTask !== null);
    }
}