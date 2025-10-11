# Teams Integration - What's New

## 🎉 Major Feature Addition: Microsoft Teams Call Tracking

Your time tracker now automatically detects and logs Microsoft Teams calls!

## 📦 New Files Added

### Core Services
- **`teams-monitor.js`** - Monitors active windows to detect Teams calls
- **`teams-graph-service.js`** - Microsoft Graph API integration for meeting details

### Documentation
- **`TEAMS_INTEGRATION.md`** - Complete setup and usage guide
- **`CHANGELOG_TEAMS.md`** - This file
- **`test-teams.js`** - Dependency verification script

### Modified Files
- **`main.js`** - Integrated Teams monitoring service
- **`src/renderer.js`** - Added Teams event handlers and UI updates
- **`src/index.html`** - Added Teams status indicator
- **`src/settings.html`** - Added Teams configuration section
- **`src/styles.css`** - Added Teams notification and status styles
- **`README.md`** - Added Teams feature description
- **`package.json`** - Added required dependencies

## 📋 New Dependencies

```json
{
  "@azure/msal-node": "^3.8.0",
  "@microsoft/microsoft-graph-client": "^3.0.7",
  "active-win": "^8.2.1",
  "node-fetch": "^2.7.0"
}
```

## ✨ Features Implemented

### 1. Automatic Call Detection
- Monitors active window for Teams application
- Detects call start/end based on window title patterns
- Works immediately without configuration

### 2. Auto-Tracking
- Automatically starts timer when joining Teams calls
- Automatically stops when leaving calls
- Configurable in Settings (can be disabled)

### 3. Meeting Details
- **Basic (No setup required):**
  - Call duration
  - Meeting title from window

- **Enhanced (With Graph API):**
  - Full participant list
  - Meeting organizer
  - Scheduled meeting title
  - Meeting description

### 4. Visual Feedback
- **Status Indicator:** Shows monitoring status (active/in-call)
- **Toast Notifications:** Pop-up when calls start/end
- **Task Display:** Teams calls shown as "Teams: [Meeting Name] ([Participants])"

### 5. Settings Integration
- Teams configuration section in Settings
- Auto-track toggle
- Optional Azure AD credentials for Graph API
- Device code authentication flow

### 6. Reporting
- Teams calls appear in daily summary
- Included in weekly reports
- Exportable to CSV
- Format: `Teams: Meeting Name (Participants) - Duration`

## 🔧 Technical Implementation

### Architecture
```
Main Process (main.js)
├── TeamsCallMonitor (teams-monitor.js)
│   ├── Window monitoring (active-win)
│   ├── Call detection logic
│   └── IPC events to renderer
│
└── TeamsGraphService (teams-graph-service.js)
    ├── MSAL authentication
    ├── Graph API calls
    └── Meeting data enrichment

Renderer Process (renderer.js)
├── Teams event listeners
├── Auto-tracking logic
├── Notification display
└── Status updates
```

### Call Detection Algorithm
1. Check active window every 3 seconds
2. Identify Teams application
3. Parse window title for call indicators:
   - "| Microsoft Teams" suffix
   - Time counter (HH:MM:SS)
   - "Meeting" or "Call" keywords
4. Track state transitions (not-in-call → in-call → not-in-call)
5. Emit events to renderer process

### Meeting Enrichment Flow
1. Call detected via window monitoring
2. Query Graph API for current meetings
3. Match by time window
4. Extract participants, title, organizer
5. Update task display with rich data

## 🎯 User Experience

### Default Behavior (Zero Config)
```
1. User joins Teams call
   ↓
2. App detects call via window title
   ↓
3. Notification appears: "Teams Call - Auto-tracking started"
   ↓
4. Timer starts automatically
   ↓
5. Call logged with duration and title
```

### With Graph API
```
1. User joins scheduled meeting
   ↓
2. App detects call via window title
   ↓
3. App queries Graph API for meeting details
   ↓
4. Task name updated: "Teams: Sprint Planning (Alice, Bob, Charlie)"
   ↓
5. Rich metadata logged
```

## 🔒 Privacy & Security

- **Local-only data storage** - No cloud sync
- **Credentials encrypted** - Using electron-store
- **No call recording** - Only metadata tracked
- **Optional Graph API** - Basic tracking works without it
- **User credentials** - Uses your own Microsoft account

## 📊 Data Schema

### Time Entry (Teams Call)
```javascript
{
  id: 1234567890,
  task: "Teams: Sprint Planning (Alice, Bob, Charlie)",
  date: "2025-10-10T14:30:00.000Z",
  duration: 3600, // seconds
  timestamp: 1234567890,
  // Optional metadata if Graph API enabled:
  metadata: {
    meetingId: "AAMkAG...",
    organizer: "Alice Smith",
    participants: ["Alice", "Bob", "Charlie"],
    isScheduled: true
  }
}
```

### Teams Settings
```javascript
{
  enabled: true,
  autoTrack: true,
  // Optional for Graph API:
  clientId: "xxxxxxxx-xxxx-...",
  tenantId: "xxxxxxxx-xxxx-...",
  clientSecret: "encrypted-secret",
  accessToken: "encrypted-token"
}
```

## 🐛 Known Limitations

1. **Window focus required**: Detection works best when Teams is active window
2. **Title-based detection**: Relies on Teams window title format (may change with Teams updates)
3. **macOS permissions**: May require Screen Recording permission on macOS
4. **Ad-hoc calls**: Participant names unavailable without Graph API
5. **Call type detection**: Cannot distinguish audio-only vs video calls

## 🚀 Future Enhancements

### Planned
- [ ] Support for Slack calls
- [ ] Zoom meeting detection
- [ ] Google Meet integration
- [ ] Call type detection (audio/video)
- [ ] Automatic meeting categorization
- [ ] Integration with Jira ticket tracking

### Under Consideration
- [ ] Call recording summaries (with user consent)
- [ ] Participant role detection (presenter vs attendee)
- [ ] Screen share time tracking
- [ ] Focus time detection (calls vs deep work)
- [ ] Weekly meeting analytics

## 📖 Usage Examples

### Example 1: Standup Meeting
```
9:00 AM - Join "Daily Standup"
App: Starts tracking "Teams: Daily Standup (Team A)"
9:15 AM - Leave call
Result: 15 minutes logged
```

### Example 2: Client Call
```
2:00 PM - Join "Q4 Review - Acme Corp"
App: Starts tracking "Teams: Q4 Review - Acme Corp (8 people)"
3:30 PM - Leave call
Result: 1h 30m logged, included in weekly report
```

### Example 3: Manual Override
```
10:00 AM - Join unnamed call
App: Auto-starts "Teams: Teams Call"
User: Stops timer, creates custom task "Client: Emergency Support"
User: Manually tracks under custom task
Result: Time logged to preferred category
```

## ✅ Testing Checklist

Before using in production:

- [ ] Install dependencies: `npm install`
- [ ] Run test script: `node test-teams.js`
- [ ] Start app: `npm start`
- [ ] Join a test Teams call
- [ ] Verify notification appears
- [ ] Verify timer starts automatically
- [ ] Leave call and verify timer stops
- [ ] Check daily summary for Teams entry
- [ ] Test Settings → Teams section
- [ ] Toggle auto-track and verify behavior
- [ ] (Optional) Test Graph API authentication

## 🆘 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Calls not detected | Ensure Teams window is active; check console for errors |
| No participants shown | Normal without Graph API; complete Azure setup for details |
| Auto-track not working | Check Settings → "Automatically track Teams calls" is enabled |
| Authentication fails | Verify Azure credentials; check client secret hasn't expired |
| App crashes on startup | Run `node test-teams.js` to verify dependencies |

## 📞 Support

For detailed help, see:
- [TEAMS_INTEGRATION.md](TEAMS_INTEGRATION.md) - Complete guide
- [README.md](README.md) - General app documentation
- Console logs (Ctrl+Shift+I / Cmd+Option+I) for debugging

---

**Version:** 2.0.0 (Teams Integration)
**Date:** October 2025
**Author:** Time Tracker Team
