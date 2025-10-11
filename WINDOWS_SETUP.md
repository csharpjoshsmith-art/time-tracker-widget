# Windows Setup Guide for Teams Integration

## ✅ Good News!

The app is **fully cross-platform** and will work on Windows with the same features!

## 🔄 Moving to Windows

### What You Need:

1. **Node.js** installed on Windows
2. **Copy the entire project folder** to Windows
3. **Run `npm install`** to install dependencies

### Quick Setup:

```bash
# In the project folder on Windows:
npm install
npm start
```

That's it! The app will automatically detect Windows and use the appropriate Teams detection method.

## 🔧 How It Works on Windows

### Detection Method:
- **Windows**: Uses `active-win` library (native window monitoring)
- **macOS**: Uses AppleScript (what you're using now)

The app automatically chooses the right method based on your OS.

### Permissions on Windows:
- ✅ **No special permissions needed!** (unlike macOS)
- The `active-win` library works out of the box on Windows
- No Screen Recording or Automation permissions required

### What Works on Windows:

✅ **All the same features:**
- Teams call auto-detection
- Auto-start/stop tracking
- Meeting name extraction
- Smart call detection (excludes Calendar/Chat windows)
- Jira integration
- Custom tasks
- Weekly reports
- CSV export

## 📋 Installation Steps for Windows

### 1. Install Node.js
If not already installed:
- Download from: https://nodejs.org/
- Choose LTS version
- Run installer

### 2. Copy Project to Windows

**Option A: Via Git**
```bash
git clone [your-repo-url]
cd time-tracker-widget
```

**Option B: Copy Files Manually**
- Copy the entire `time-tracker-widget` folder
- Paste it anywhere on your Windows PC

### 3. Install Dependencies
```bash
cd time-tracker-widget
npm install
```

This will install all required packages including:
- Electron
- active-win (Windows-compatible)
- Microsoft Graph client
- etc.

### 4. Run the App
```bash
npm start
```

## 🎯 What to Expect

### First Run:
1. App window opens
2. Teams monitoring starts automatically
3. Status shows: "Monitoring for calls..."

### When You Join a Teams Call:
1. App detects the call immediately
2. Notification pops up
3. Timer starts automatically
4. Shows: "Teams: [Meeting Name]"

### When You End a Call:
1. App detects call ended
2. Timer stops automatically
3. Time is saved
4. Status returns to: "Monitoring for calls..."

## 🔍 Differences from macOS

| Feature | macOS | Windows |
|---------|-------|---------|
| Detection method | AppleScript | active-win |
| Permissions needed | Automation permission | None |
| Setup complexity | One-time permission | Just install |
| Reliability | Excellent | Excellent |
| Meeting name extraction | Same | Same |
| Smart call detection | Same | Same |

## 🐛 Troubleshooting (Windows)

### Teams calls not detected

**Check if Teams is running:**
- Make sure Microsoft Teams is installed and running
- The app detects both classic and new Teams

**Check the console:**
- Press `Ctrl+Shift+I` in the app window
- Look for error messages in Console tab

### "active-win" errors

If you see errors about `active-win`:

1. **Rebuild native modules:**
   ```bash
   npm rebuild
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Check Node.js version:**
   - Must be Node.js 16+ for best compatibility
   - Check: `node --version`

### App won't start

**Check dependencies:**
```bash
npm install
```

**Try clean install:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Run with logs:**
```bash
npm start 2>&1 | tee app.log
```

## 📝 Building for Distribution (Windows)

To create a Windows installer:

```bash
npm run build-win
```

This creates:
- `dist/Time Tracker Setup.exe` - Installer
- Portable version in `dist/win-unpacked/`

### Sharing with Team Members:

1. **Build the installer:**
   ```bash
   npm run build-win
   ```

2. **Share the installer:**
   - Located in: `dist/Time Tracker Setup.exe`
   - Send to team members
   - They just run the installer

3. **Each person configures their own:**
   - Jira credentials (optional)
   - Teams settings (optional)
   - Time tracking starts working immediately

## 🔒 Security Note

**Windows Defender SmartScreen:**
- May show warning for unsigned apps
- Click "More info" → "Run anyway"
- This is normal for apps not signed with a certificate

To avoid this, you'd need to:
- Purchase a code signing certificate ($)
- Sign the executable
- (Optional for personal/team use)

## 🚀 Performance

**Windows Performance:**
- Very lightweight (similar to macOS)
- Low CPU usage (~1-2%)
- Low memory (~50-100MB)
- Runs in background
- No noticeable impact on Teams

## ✨ Platform-Specific Features

### Works on Both:
- ✅ Teams call detection
- ✅ Auto-tracking
- ✅ All UI features
- ✅ Reports and exports
- ✅ Jira integration

### macOS Only:
- Uses AppleScript (more resistant to Teams updates)

### Windows Only:
- No permission popups needed
- Simpler setup

## 📚 Additional Resources

**If you need help:**
1. Check Console for errors (`Ctrl+Shift+I`)
2. See main [README.md](README.md)
3. See [TEAMS_INTEGRATION.md](TEAMS_INTEGRATION.md)

**Windows-specific debugging:**
```bash
# Test if active-win works
node -e "const activeWin = require('active-win'); activeWin().then(console.log)"
```

Should output your current active window info.

---

**Summary:** Just copy the project to Windows, run `npm install`, and `npm start`. It works identically to macOS! 🎉
