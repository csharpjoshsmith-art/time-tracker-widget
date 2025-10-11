const { ipcRenderer } = require('electron');
const axios = require('axios');

// State Management
let timerInterval = null;
let currentTask = null;
let startTime = null;
let elapsedSeconds = 0;
let isPaused = false;
let pausedTime = 0;

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
    updateTodaySummary();
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

    // Group by task
    const taskTotals = {};
    todayEntries.forEach(entry => {
        if (!taskTotals[entry.task]) {
            taskTotals[entry.task] = 0;
        }
        taskTotals[entry.task] += entry.duration;
    });

    let html = '';
    let totalSeconds = 0;

    Object.entries(taskTotals).forEach(([task, seconds]) => {
        totalSeconds += seconds;
        html += `
            <div class="summary-item">
                <span>${task}</span>
                <span>${formatDuration(seconds)}</span>
            </div>
        `;
    });

    html += `
        <div class="summary-item">
            <span>Total Today</span>
            <span>${formatDuration(totalSeconds)}</span>
        </div>
    `;

    summaryBox.innerHTML = html;
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
    console.log('Context menu triggered for ticket:', ticketKey);

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

    console.log('Menu position:', event.clientX, event.clientY);

    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = '🔗 Open in Jira';
    menuItem.addEventListener('click', async () => {
        console.log('Menu item clicked');
        await openJiraTicket(ticketKey);
        menu.remove();
    });

    menu.appendChild(menuItem);
    document.body.appendChild(menu);

    console.log('Context menu added to body');

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
    
    // Get current week (Friday to Friday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 5 = Friday
    const daysSinceFriday = currentDay >= 5 ? currentDay - 5 : currentDay + 2;
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceFriday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate < weekEnd;
    });
    
    // Group by task
    const taskTotals = {};
    weekEntries.forEach(entry => {
        if (!taskTotals[entry.task]) {
            taskTotals[entry.task] = 0;
        }
        taskTotals[entry.task] += entry.duration;
    });
    
    // Sort by duration
    const sorted = Object.entries(taskTotals).sort((a, b) => b[1] - a[1]);
    
    let html = `
        <div class="report-week">
            <h3>Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</h3>
    `;
    
    let totalSeconds = 0;
    sorted.forEach(([task, seconds]) => {
        totalSeconds += seconds;
        html += `
            <div class="report-task">
                <span>${task}</span>
                <span>${formatDuration(seconds)}</span>
            </div>
        `;
    });
    
    html += `
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
    
    // Get current week
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceFriday = currentDay >= 5 ? currentDay - 5 : currentDay + 2;
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceFriday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate < weekEnd;
    });
    
    // Create CSV
    let csv = 'Task,Date,Duration (hours),Duration (minutes)\n';
    
    weekEntries.forEach(entry => {
        const hours = (entry.duration / 3600).toFixed(2);
        const minutes = Math.round(entry.duration / 60);
        const date = new Date(entry.date).toLocaleDateString();
        csv += `"${entry.task}","${date}","${hours}","${minutes}"\n`;
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

    // Check if user wants automatic tracking
    const shouldAutoTrack = localStorage.getItem('teamsAutoTrack') !== 'false';

    if (!shouldAutoTrack) {
        showTeamsCallNotification(callInfo, false);
        return;
    }

    // Auto-start tracking the call
    const taskName = formatTeamsTaskName(callInfo);
    startTask(taskName);

    showTeamsCallNotification(callInfo, true);
}

function handleTeamsCallEnded(callRecord) {
    console.log('Teams call ended:', callRecord);

    // Update Teams status indicator
    updateTeamsStatus('active', 'Monitoring for calls...');

    // If we were tracking this call, stop it
    if (currentTask && currentTask.includes('Teams:')) {
        stopTask();
    }

    showTeamsCallEndNotification(callRecord);
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

function showTeamsCallEndNotification(callRecord) {
    const duration = formatDuration(callRecord.duration);

    const notification = document.createElement('div');
    notification.className = 'teams-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <strong>📞 Teams Call Ended</strong>
            <p>Duration: ${duration}</p>
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