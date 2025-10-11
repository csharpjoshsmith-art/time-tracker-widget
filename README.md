# Time Tracker Widget

A desktop time tracking application for Windows with Jira integration.

## Setup Instructions

### 1. Install Additional Dependencies

Since we added new packages, run this command in your project folder:

```bash
npm install @electron/remote --save
```

### 2. Create the Project Structure

Make sure you have all these files in your project:

```
time-tracker-widget/
├── main.js
├── package.json
├── src/
│   ├── index.html
│   ├── styles.css
│   ├── renderer.js
│   └── settings.html
└── assets/ (optional, for icons)
```

### 3. Replace Your Files

Replace the content of your existing files with the code I provided:
- `main.js` - Main Electron process
- `package.json` - Dependencies and scripts
- `src/index.html` - Main UI
- `src/styles.css` - Styling
- `src/renderer.js` - Application logic
- `src/settings.html` - Settings page

### 4. Run the Application

```bash
npm start
```

## First Time Setup

1. **Click the Settings Button** (⚙️) in the top right
2. **Enter your Jira credentials:**
   - Domain: Your Jira URL without https:// (e.g., `yourcompany.atlassian.net`)
   - Email: Your Jira login email
   - API Token: Generate from [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
3. **Test Connection** to verify it works
4. **Save Settings**

## Features

### ✅ Core Functionality
- **Quick Task Buttons**: Start tracking predefined tasks instantly
- **Active Timer**: Real-time tracking with hours:minutes:seconds display
- **Pause/Resume**: Pause your timer without losing time
- **Lunch Break**: Dedicated button for lunch tracking
- **Custom Tasks**: Add your own task categories

### 📞 Microsoft Teams Integration **NEW!**
- **Automatic call detection**: Knows when you join/leave Teams calls
- **Auto-tracking**: Automatically starts timer when calls begin
- **Meeting details**: Logs call title and duration
- **Zero-config**: Works immediately without setup - NO admin permissions needed!
- **Optional enhancement**: Add Azure AD for participant names
- **macOS optimized**: Uses AppleScript for reliable detection

[📖 Quick Start Guide](QUICK_START.md) | [📖 Full Documentation](TEAMS_INTEGRATION.md) | [🍎 macOS Setup](MACOS_SETUP.md) | [🪟 Windows Setup](WINDOWS_SETUP.md)

### 🎫 Jira Integration
- Automatically fetches tickets assigned to you
- Updates on demand with refresh button
- Displays ticket key and summary
- Works with Jira Cloud

### 📊 Reporting
- **Today's Summary**: See what you've worked on today
- **Weekly Report**: Friday-to-Friday week view
- **Export to CSV**: Download reports for external use

### 👥 Multi-User Support
- Each user configures their own Jira credentials
- Settings stored locally per machine
- Easy to switch between users

## How to Use

### Starting a Timer
1. Click any task button (Quick Tasks, Jira Tickets, or Custom Tasks)
2. Timer starts immediately
3. Task is highlighted in purple

### Pausing Work
- Click **Pause** to temporarily stop (timer keeps the time)
- Click **Resume** to continue
- Great for quick breaks!

### Stopping a Task
- Click **Stop** when finished with a task
- Time is automatically saved
- Timer resets to 00:00:00

### Lunch Breaks
- Click **Lunch Break** button to track lunch time separately
- Tracks like any other task

### Adding Custom Tasks
1. Type task name in the input field under "Custom Tasks"
2. Click **Add** or press Enter
3. New task appears as a clickable button
4. Delete tasks with the ✕ button

### Viewing Reports
1. Click **Weekly Report** button at the bottom
2. See all time grouped by task
3. Click **Export CSV** to download
4. Week runs Friday night to Friday night

## Troubleshooting

### Settings window won't open
Make sure `@electron/remote` is installed:
```bash
npm install @electron/remote --save
```

### Jira tickets not loading
1. Check your internet connection
2. Verify Jira credentials in Settings
3. Click "Test Connection" to diagnose
4. Make sure your Jira domain is correct (no https://)

### Timer not updating
This shouldn't happen, but if it does:
1. Stop the current task
2. Close and restart the application

### Data Storage
All data is stored locally in your user folder:
- Windows: `C:\Users\YourName\AppData\Roaming\time-tracker-widget\`
- Settings and time entries are in JSON format

## Building for Distribution

To create an installer for sharing with team members:

```bash
npm run build-win
```

The installer will be in the `dist` folder.

## Tips for Team Deployment

1. Each team member installs the app
2. Each person configures their own Jira settings
3. Time entries are stored locally (not shared)
4. You can share the installer file, everyone uses the same app

## Customization

### Changing Quick Task Buttons
Edit `src/index.html`, find the "Quick Tasks" section:
```html
<button class="task-btn" data-task="Your Task Name">🔖 Your Task Name</button>
```

### Changing Week Start Day
Currently set to Friday. To change, edit the `showWeeklyReport()` function in `src/renderer.js`.

### Adding More Features
The codebase is well-structured for additions:
- `main.js`: Electron main process
- `renderer.js`: All application logic
- `settings.html`: Settings page
- `styles.css`: All styling

## Support

For issues or questions, check:
- Electron documentation: https://www.electronjs.org/docs
- Jira API docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

## Future Enhancements (Ideas)
- Daily time goals and notifications
- Project categories and color coding
- Integration with other tools (GitHub, GitLab, etc.)
- Automatic idle detection
- Pomodoro timer mode
- Team dashboard (if you add a backend)

Enjoy tracking your time! 🎉