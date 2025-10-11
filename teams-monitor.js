const activeWin = require('active-win');
const { ipcMain } = require('electron');

class TeamsCallMonitor {
  constructor(store) {
    this.store = store;
    this.isInCall = false;
    this.currentCall = null;
    this.checkInterval = null;
    this.callStartTime = null;
    this.mainWindow = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  start() {
    console.log('Starting Teams call monitor...');
    // Check every 3 seconds for Teams activity
    this.checkInterval = setInterval(() => this.checkTeamsStatus(), 3000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkTeamsStatus() {
    try {
      const window = await activeWin();

      if (!window) return;

      // Check if Teams is the active window
      const isTeamsWindow = window.owner?.name?.toLowerCase().includes('teams') ||
                           window.title?.toLowerCase().includes('teams');

      if (!isTeamsWindow) {
        // If we were in a call and Teams is no longer active, still monitor
        // (call might be minimized)
        return;
      }

      // Detect if in a call based on window title patterns
      // Use smart detection to avoid false positives
      const inCall = this.isInCallWindow(window.title);

      // Detect transition into call
      if (inCall && !this.isInCall) {
        this.handleCallStart(window.title);
      }
      // Detect transition out of call
      else if (!inCall && this.isInCall) {
        this.handleCallEnd();
      }
      // Update call info if still in call (title might change)
      else if (inCall && this.isInCall) {
        this.updateCallInfo(window.title);
      }

    } catch (error) {
      console.error('Error checking Teams status:', error);
    }
  }

  handleCallStart(windowTitle) {
    console.log('Teams call started:', windowTitle);

    this.isInCall = true;
    this.callStartTime = Date.now();

    // Extract meeting name from title
    const meetingName = this.extractMeetingName(windowTitle);

    this.currentCall = {
      title: meetingName,
      participants: 'Unknown', // Will be populated from Graph API if available
      startTime: this.callStartTime,
      windowTitle: windowTitle
    };

    // Notify renderer process
    if (this.mainWindow) {
      this.mainWindow.webContents.send('teams-call-started', this.currentCall);
    }

    // Attempt to fetch meeting details from Graph API
    this.enrichCallWithGraphData();
  }

  handleCallEnd() {
    console.log('Teams call ended');

    if (!this.currentCall) return;

    const duration = Math.floor((Date.now() - this.callStartTime) / 1000);

    const callRecord = {
      ...this.currentCall,
      endTime: Date.now(),
      duration: duration
    };

    // Notify renderer process
    if (this.mainWindow) {
      this.mainWindow.webContents.send('teams-call-ended', callRecord);
    }

    this.isInCall = false;
    this.currentCall = null;
    this.callStartTime = null;
  }

  updateCallInfo(windowTitle) {
    // Update meeting name if it changes during call
    const meetingName = this.extractMeetingName(windowTitle);
    if (this.currentCall && meetingName !== this.currentCall.title) {
      this.currentCall.title = meetingName;
      this.currentCall.windowTitle = windowTitle;
    }
  }

  isInCallWindow(windowTitle) {
    // Exclude known non-call windows
    const nonCallWindows = [
      /^Calendar\s*\|/i,              // Calendar view
      /^Chat\s*\|/i,                  // Chat view
      /^Teams\s*\|/i,                 // General Teams view
      /^Activity\s*\|/i,              // Activity feed
      /^Calls\s*\|/i,                 // Calls history (not active call)
      /^Files\s*\|/i,                 // Files view
      /^Apps\s*\|/i,                  // Apps view
    ];

    // If it matches a non-call window, it's not a call
    if (nonCallWindows.some(pattern => pattern.test(windowTitle))) {
      return false;
    }

    // Positive indicators of being in a call
    const callIndicators = [
      /Meeting\s+with\s+/i,           // "Meeting with [name]"
      /Meeting\s+compact\s+view/i,    // "Meeting compact view" (Meet Now)
      /\d+:\d+:\d+/,                   // Time counter (00:05:23)
      /^Call\s+with\s+/i,             // "Call with [name]"
      /\|\s*Meeting\s+stage/i,        // Meeting stage indicator
    ];

    return callIndicators.some(pattern => pattern.test(windowTitle));
  }

  extractMeetingName(windowTitle) {
    // Remove common suffixes
    let name = windowTitle
      .replace(/\s*\|\s*Microsoft Teams$/i, '')
      .replace(/\s*-\s*Microsoft Teams$/i, '')
      .replace(/\s*\d+:\d+:\d+.*$/, '') // Remove timer
      .trim();

    // Teams often shows: "Meeting Name | Organization | Email | Microsoft Teams"
    // Extract just the first part (meeting name)
    if (name.includes('|')) {
      const parts = name.split('|');
      name = parts[0].trim();
    }

    // If empty or generic, use a default
    if (!name || name === 'Microsoft Teams' || name === 'Teams') {
      name = 'Teams Call';
    }

    return name;
  }

  async enrichCallWithGraphData() {
    // This will be called to fetch meeting details from Graph API
    try {
      const graphService = require('./teams-graph-service');
      const settings = this.store.get('teamsSettings');

      if (!settings || !settings.accessToken) {
        console.log('No Teams Graph API credentials configured');
        return;
      }

      // Try to find the current meeting
      const meetings = await graphService.getCurrentMeetings(settings.accessToken);

      if (meetings && meetings.length > 0) {
        // Match meeting by approximate time
        const now = Date.now();
        const currentMeeting = meetings.find(m => {
          const start = new Date(m.start.dateTime).getTime();
          const end = new Date(m.end.dateTime).getTime();
          return start <= now && end >= now;
        });

        if (currentMeeting) {
          this.currentCall.title = currentMeeting.subject || this.currentCall.title;
          this.currentCall.participants = currentMeeting.attendees
            ?.map(a => a.emailAddress.name)
            .join(', ') || 'Unknown';
          this.currentCall.meetingId = currentMeeting.id;

          console.log('Enriched call with Graph data:', this.currentCall);

          // Notify renderer of updated info
          if (this.mainWindow) {
            this.mainWindow.webContents.send('teams-call-updated', this.currentCall);
          }
        }
      }
    } catch (error) {
      console.error('Error enriching call with Graph data:', error);
      // Silently fail - we'll just use the window title
    }
  }

  getCurrentCall() {
    return this.currentCall;
  }

  isCurrentlyInCall() {
    return this.isInCall;
  }
}

module.exports = TeamsCallMonitor;
