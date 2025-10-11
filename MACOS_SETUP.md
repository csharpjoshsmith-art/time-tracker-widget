# macOS Setup Guide for Teams Integration

## ✅ Good News!

The Teams integration now works on macOS using AppleScript - a more reliable method than the original approach!

## 🔧 Required Permission (One-Time Setup)

For the app to detect Teams calls on macOS, you need to grant **Automation** permission:

### Step 1: First Run

1. Start the app:
   ```bash
   npm start
   ```

2. Join a Teams call

3. If you see an error or nothing happens, continue to Step 2

### Step 2: Grant Automation Permission

You might see a popup asking for permission. If so:
- Click **"OK"** or **"Allow"**

If you don't see a popup or accidentally denied it:

1. **Open System Settings** (or System Preferences on older macOS)

2. **Navigate to Privacy & Security**

3. **Click "Automation" in the sidebar**

4. **Find your app in the list:**
   - If running via `npm start`: Look for **"Terminal"** or **"iTerm"**
   - If running built app: Look for **"Electron"** or **"Time Tracker"**

5. **Enable "System Events"** checkbox

6. **Restart the Time Tracker app**

### Step 3: Test It

1. Restart the app: `npm start`
2. Join a Teams call
3. You should see: "📞 Teams Call - Auto-tracking started"
4. Meeting name: "Meeting with Josh Smith" (cleanly extracted!)

## 📋 How It Works on macOS

The macOS version uses AppleScript to:
1. Check if Teams is running
2. Get the window title
3. Extract the meeting name
4. Detect call start/end

**Advantages:**
- ✅ More reliable than window monitoring
- ✅ Works even when Teams is not focused
- ✅ No Screen Recording permission needed
- ✅ Clean meeting name extraction

**What you'll see:**
```
Original window: "Meeting with Josh Smith | Matthews International Corporation | josmith@matw.com | Microsoft Teams"
Extracted name: "Meeting with Josh Smith"
```

## 🐛 Troubleshooting

### Teams calls not detected

**Check if Teams is running:**
```bash
node test-applescript.js
```

This will show:
- ✅ If Teams is detected
- ✅ The window title
- ✅ If a call is active

### "Not authorized" error

You need to grant Automation permission:
1. System Settings → Privacy & Security → Automation
2. Enable System Events for your app
3. Restart

### Multiple Teams processes

If you have both "Microsoft Teams" and "Teams" (new version):
- The script checks both
- Whichever has an active window will be detected

### Window title format changed

If Microsoft changes the window title format, we might need to update the detection patterns. Run:
```bash
node test-applescript.js
```

And share the output so we can update the patterns.

## 🔒 Privacy Note

The AppleScript only accesses:
- Whether Teams is running (process list)
- The window title of Teams (same as you see in the window bar)

No other data is accessed. Everything stays local on your machine.

## 🚀 You're All Set!

The app is now configured for macOS. It will:
- ✅ Detect Teams calls automatically
- ✅ Extract clean meeting names
- ✅ Start/stop tracking automatically
- ✅ Work reliably in the background

Just run `npm start` and join a call to see it work!
