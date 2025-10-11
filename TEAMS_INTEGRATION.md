# Microsoft Teams Integration Guide

Your Time Tracker widget now automatically detects and logs time spent in Microsoft Teams calls!

## 🚀 Quick Start (No Setup Required!)

The **basic Teams call tracking works immediately** without any configuration:

1. Start your Time Tracker app
2. Join a Teams call
3. The app will automatically:
   - Detect when you're in a call
   - Show a notification
   - Start tracking time (if auto-track is enabled)
   - Log who you met with and for how long

## 📊 How It Works

### Window Monitoring (Default - No Setup)
The app monitors your active window to detect when you're in a Teams call. It detects:
- Call start and end times
- Meeting name from the window title
- Call duration

**Pros:**
- ✅ Works immediately, no setup
- ✅ No authentication required
- ✅ Captures all calls (scheduled and ad-hoc)

**Limitations:**
- ⚠️ Participant names may not be available for ad-hoc calls
- ⚠️ Meeting details depend on window title

### Graph API Integration (Optional - Enhanced Features)

For **full meeting details** including participant names and scheduled meeting titles:

1. Register an Azure AD application (instructions below) **- requires admin access or IT help**
2. Authenticate in Settings
3. Get rich meeting data from your calendar

**Additional Benefits:**
- ✅ Full participant lists
- ✅ Meeting organizer information
- ✅ Accurate meeting titles from calendar
- ✅ Meeting descriptions

**⚠️ Don't have Azure admin access?** No problem! The basic tracking works great without this. You can also ask your IT admin to set this up for you (see "Request IT Admin Setup" section below).

## ⚙️ Settings & Configuration

### Auto-Tracking

By default, Teams calls are tracked automatically. To change this:

1. Click **Settings** (⚙️)
2. Find **Teams Integration** section
3. Toggle **"Automatically track Teams calls"**
4. Click **Save Settings**

When auto-tracking is **disabled**, you'll still get notifications but need to manually start the timer.

### Setting Up Graph API (Optional)

To get enhanced meeting details:

> **📝 Note:** If you get an "access denied" error in Azure Portal, you don't have permission to register apps. Skip to "Request IT Admin Setup" below instead.

#### Option A: Self-Setup (If you have admin access)

**Step 1: Register Azure AD App**

1. Go to [Azure Portal - App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **"New registration"**
3. Fill in:
   - **Name**: "Time Tracker Integration" (or any name)
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: Select "Public client/native (mobile & desktop)" → `http://localhost`
4. Click **Register**

#### Step 2: Configure Permissions

1. In your new app, go to **"API permissions"**
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"** → **"Delegated permissions"**
4. Add these permissions:
   - `Calendars.Read`
   - `OnlineMeetings.Read`
   - `User.Read`
5. Click **"Add permissions"**
6. Click **"Grant admin consent"** (requires admin - or request from IT)

#### Step 3: Enable Public Client Flow

1. Go to **"Authentication"**
2. Scroll to **"Advanced settings"**
3. Toggle **"Allow public client flows"** to **Yes**
4. Click **Save**

#### Step 4: Create Client Secret

1. Go to **"Certificates & secrets"**
2. Click **"New client secret"**
3. Add description: "Time Tracker"
4. Choose expiration (recommend 24 months)
5. Click **Add**
6. **Copy the secret value immediately** (you won't see it again!)

#### Step 5: Get Your IDs

1. Go to **"Overview"**
2. Copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**

#### Step 6: Configure Time Tracker

1. Open Time Tracker **Settings**
2. In **Teams Integration** section, enter:
   - **Azure Client ID**: Your Application ID
   - **Azure Tenant ID**: Your Directory ID
   - **Azure Client Secret**: The secret you copied
3. Click **"🔐 Authenticate with Teams"**
4. Follow the authentication prompts in the terminal/console
5. Click **Save Settings**

#### Option B: Request IT Admin Setup

If you don't have permission to register Azure apps, send this email to your IT team:

---

**Subject:** Request: Azure AD App Registration for Time Tracking Tool

Hi IT Team,

I'm using a time tracking application that integrates with Microsoft Teams to automatically log meeting time. To enable participant names in my time logs, I need an Azure AD app registration.

**What I need:**
- An Azure AD app registration with these **delegated permissions**:
  - `Calendars.Read`
  - `OnlineMeetings.Read`
  - `User.Read`
- Public client flow enabled
- A client secret

**Why this is safe:**
- These permissions only access MY calendar and meetings (not organization-wide)
- Data is stored locally on my device only
- No data leaves my computer
- This is read-only access to my own calendar

**What you'll provide me:**
- Application (Client) ID
- Directory (Tenant) ID
- Client Secret

**Documentation:**
- [Register an application with Microsoft identity platform](https://docs.microsoft.com/en-us/graph/auth-register-app-v2)
- [Delegated permissions reference](https://docs.microsoft.com/en-us/graph/permissions-reference)

Thank you for your help!

---

Once IT provides the credentials, enter them in Settings → Teams Integration.

## 📱 Using Teams Integration

### Automatic Mode (Recommended)

1. Join any Teams call
2. You'll see a notification: "📞 Teams Call - Auto-tracking started"
3. The timer starts automatically
4. When you leave the call, tracking stops automatically

### Manual Mode

1. Join a Teams call
2. You'll see a notification: "📞 Teams Call Started"
3. Click on the Teams call in your task list to start tracking
4. Click Stop when done

### Viewing Tracked Calls

Teams calls appear in your reports as:
- `Teams: Meeting Name`
- `Teams: Meeting Name (John Doe, Jane Smith)` (with participants)
- `Teams: Meeting Name (5 people)` (for large meetings)

Example time entries:
```
Teams: Sprint Planning (Sarah, Mike, Alex)    1h 30m
Teams: 1:1 with Manager (John Doe)           30m
Teams: Client Demo (8 people)                1h 15m
```

## 🔧 Troubleshooting

### Teams calls not being detected

**Check:**
1. Ensure Teams is running and you're in a call
2. The app detects calls based on window titles
3. Make sure the Time Tracker app is running in the background
4. Check the Teams status indicator in the app (should show green when monitoring)

**Try:**
- Restart the Time Tracker app
- Join a test call
- Check the console logs for errors

### Authentication fails

**Common issues:**
1. **Wrong credentials**: Double-check Client ID, Tenant ID, and Secret
2. **Expired secret**: Client secrets expire - create a new one
3. **Missing permissions**: Ensure all Graph API permissions are added
4. **No admin consent**: Some organizations require admin approval

**Solution:**
- Verify credentials in Azure Portal
- Recreate client secret if expired
- Contact IT admin for permission consent

### Participants not showing

**If you see "Unknown" for participants:**

**Without Graph API:**
- Expected for ad-hoc calls
- Window title doesn't include participant info

**With Graph API:**
- Ensure authentication succeeded
- Check that meeting is in your calendar
- Verify `Calendars.Read` permission is granted

**Solution:**
- Complete Graph API setup (optional)
- Make sure calls are scheduled meetings (not ad-hoc)

### Calls tracked even when disabled

**Check:**
1. Settings → Teams Integration
2. Uncheck "Automatically track Teams calls"
3. Click Save Settings

You'll still get notifications, but won't auto-start the timer.

## 🔒 Privacy & Security

### What data is collected?
- **Local only**: All data is stored locally on your machine
- **Call metadata**: Start time, end time, duration, meeting title
- **Participant names**: Only if Graph API is configured
- **No recording**: The app does NOT record audio, video, or call content

### Where is data stored?
- **Windows**: `C:\Users\YourName\AppData\Roaming\time-tracker-widget\`
- **macOS**: `~/Library/Application Support/time-tracker-widget/`
- **Encrypted**: Credentials are stored securely using electron-store

### Can my employer see this?
- The app is **local-only** - no data is sent to any server
- Graph API access uses **your credentials** - appears as you accessing your own calendar
- Time entries are **stored only on your device**

## 💡 Tips & Best Practices

### For Best Results:

1. **Enable auto-tracking**: Saves you from forgetting to start the timer
2. **Use scheduled meetings**: More accurate titles and participant lists
3. **Name your meetings clearly**: Window titles reflect meeting names
4. **Keep app running**: The app needs to be running to detect calls

### Weekly Workflow:

1. Let the app automatically track all Teams calls
2. At end of week, click **"Weekly Report"**
3. Review all Teams meetings tracked
4. Export to CSV if needed for timesheets

### Integration with Workflows:

Teams calls automatically integrate with:
- Your daily summary
- Weekly reports
- CSV exports
- Existing Jira tickets (if tracking both)

## 🎯 Advanced Features

### Custom Meeting Names

You can manually edit tracked Teams calls:
1. The call is tracked automatically
2. If you want to rename it, stop the current task
3. Add a custom task with your preferred name
4. Start tracking under the new name

### Combining with Jira

If you're also using Jira integration:
1. Join a Teams call about JIRA-123
2. Stop the auto-tracked Teams call
3. Start tracking under the Jira ticket
4. Time is logged to the specific ticket

### Call Detection Patterns

The app detects Teams calls using these window title patterns:
- "Meeting Name | Microsoft Teams"
- Presence of timer (00:05:23) in title
- "Call | Microsoft Teams"
- "Meeting | Microsoft Teams"

## 📝 Examples

### Example 1: Daily Standup
```
You: Join "Daily Standup" Teams call at 9:00 AM
App: 📞 Teams Call - Auto-tracking started
     Teams: Daily Standup (Alice, Bob, Charlie)

You: Leave call at 9:15 AM
App: 📞 Teams Call Ended - Duration: 15m

Report shows: "Teams: Daily Standup (Alice, Bob, Charlie) - 15m"
```

### Example 2: Client Meeting
```
You: Join "Q4 Review with Acme Corp" at 2:00 PM
App: Auto-starts tracking
     Teams: Q4 Review with Acme Corp (8 people)

You: Leave call at 3:30 PM
App: Stops tracking automatically

Report shows: "Teams: Q4 Review with Acme Corp (8 people) - 1h 30m"
```

### Example 3: Ad-hoc Call (No Calendar Event)
```
You: Someone calls you directly in Teams
App: 📞 Teams Call - Auto-tracking started
     Teams: Teams Call

You: End call after 10 minutes
App: Stops tracking

Report shows: "Teams: Teams Call - 10m"
```

## 🆘 Getting Help

### Check Logs
Open the app and press:
- **Windows/Linux**: `Ctrl+Shift+I`
- **macOS**: `Cmd+Option+I`

Look in the Console tab for error messages.

### Common Log Messages

**✅ Good:**
```
Teams call started: Sprint Planning
Enriched call with Graph data
```

**⚠️ Warning:**
```
No Teams Graph API credentials configured
// This is OK - basic tracking still works
```

**❌ Error:**
```
Error checking Teams status: ...
// Something is wrong - check troubleshooting section
```

## 🚀 Future Enhancements

Planned features:
- Slack call integration
- Zoom meeting detection
- Google Meet support
- Call recording summaries (with consent)
- Automatic meeting categorization

## 📄 License & Credits

Built with:
- [Electron](https://www.electronjs.org/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [active-win](https://github.com/sindresorhus/active-win) for window detection

---

**Need more help?** Check the main README.md or open an issue on GitHub.
