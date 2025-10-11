# How to Restart and Test Teams Detection

## The Problem
The app was running with old code that doesn't check for "MSTeams" (new Teams client).

## The Fix
We've updated the code to detect:
- ✅ MSTeams (new Teams - what you're using)
- ✅ Microsoft Teams (classic)
- ✅ Teams (generic)

## How to Apply the Fix

### 1. Quit the App Completely
In the terminal where the app is running:
- Press `Ctrl+C` to stop it
- Make sure it fully exits

### 2. Restart with Fresh Code
```bash
npm start
```

### 3. Open Developer Console (Important!)
Once the app window opens:
- Press: `Cmd+Option+I` (macOS)
- Click on the **Console** tab

You should see:
```
🍎 Starting Teams call monitor (macOS AppleScript version)...
   Checking for Teams processes: MSTeams, Microsoft Teams, Teams
   Monitoring every 3 seconds...
```

### 4. Join a Teams Call
- You're already in one! The app should detect it immediately
- Watch the Console for:
```
📱 Teams window: Meeting compact view | Meeting with Josh Smith | ...
Teams call started: Meeting compact view | ...
```

### 5. Check the App
You should see:
- 🔴 Teams status indicator turns RED (in-call)
- 📞 Notification: "Teams Call - Auto-tracking started"
- ⏱️ Timer starts automatically
- Current task shows: "Teams: Meeting compact view"

## If It Still Doesn't Work

### Check Console for Errors
Look in the Console (Cmd+Option+I) for:
- ❌ Any red error messages
- ⚠️ Permission warnings

### Verify Teams is Detected
Run this in a separate terminal:
```bash
node test-applescript.js
```

Should show:
```
✅ Teams window detected!
🎉 CALL DETECTED!
```

### Grant Automation Permission
If you see "not allowed" errors:
1. System Settings → Privacy & Security → Automation
2. Find "Terminal" or "Electron"
3. Enable "System Events"
4. Restart the app

## Expected Behavior

### When You Join a Call:
1. Console shows: `📱 Teams window: [meeting name]`
2. Console shows: `Teams call started: [meeting name]`
3. Notification pops up
4. Timer starts
5. Status indicator turns red

### When You Leave a Call:
1. Console shows: `Teams call ended`
2. Notification shows duration
3. Timer stops
4. Time is saved
5. Status indicator turns green

## Debugging Commands

### See what Teams process is running:
```bash
osascript -e 'tell application "System Events" to get name of every process' | tr ',' '\n' | grep -i teams
```

Should show: `MSTeams`

### Test detection manually:
```bash
node test-applescript.js
```

### Check if monitoring is enabled:
Look in Console for the startup message when app launches.

## Still Not Working?

Share the Console output (Cmd+Option+I → Console tab) so I can see what's happening!
