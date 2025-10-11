# Quick Start - Teams Call Tracking

## ✅ You're Ready to Go! (No Setup Needed)

The Teams call tracking works **immediately** without any Azure setup or admin permissions.

### Start Using It Now

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Join a Teams call** (any call - scheduled or ad-hoc)

3. **Watch it work:**
   - You'll see: "📞 Teams Call - Auto-tracking started"
   - Timer starts automatically
   - When you leave: tracking stops, time is saved

4. **Check your logs:**
   - Daily Summary shows: `Teams: [Meeting Name] - [Duration]`
   - Weekly Report includes all Teams calls
   - Export to CSV for timesheets

### What You Get (No Setup)

✅ Automatic call detection
✅ Auto-start/stop tracking
✅ Meeting title from window
✅ Call duration
✅ Included in all reports

### What You DON'T Get (Without Azure)

❌ Participant names (shows "Unknown")
❌ Calendar meeting details

**This is totally fine for most use cases!** The app still tracks:
- When calls happen
- How long they last
- Meeting names
- Total time in meetings

## 🔧 Settings (Optional)

### Toggle Auto-Tracking

If you want to manually start/stop Teams calls:

1. Click Settings ⚙️
2. Uncheck "Automatically track Teams calls"
3. Save

Now you'll get notifications but need to click to start tracking.

### Enable Auto-Tracking (Default)

Leave it checked (default) and calls start tracking automatically!

## 📊 How It Looks

### In Daily Summary:
```
Teams: Daily Standup               15m
Teams: Sprint Planning             45m
Teams: Client Demo                 1h 30m
Total Today                        8h 15m
```

### In Weekly Report:
```
Teams: Team Meetings               5h 30m
Teams: Client Calls                3h 45m
General Projects                   25h 15m
```

## 🎯 Typical Workflow

**Monday 9:00 AM** - Join "Daily Standup"
→ App: Starts tracking
→ You: Do nothing, just attend the call

**Monday 9:15 AM** - Leave call
→ App: Stops tracking, saves 15 minutes

**Monday 10:00 AM** - Join "Sprint Planning"
→ App: Starts tracking again

**Friday 5:00 PM** - Click "Weekly Report"
→ See: All Teams calls logged automatically
→ Export to CSV for your timesheet

## ❓ Common Questions

### Q: Do I need Azure AD setup?
**A:** No! It works great without it. Azure is only for participant names.

### Q: Will it track all my calls?
**A:** Yes - scheduled meetings, ad-hoc calls, everything.

### Q: What if I don't want auto-tracking?
**A:** Turn it off in Settings. You'll still get notifications.

### Q: Can I edit the meeting names?
**A:** Yes! Stop the auto-tracked call, create a custom task, start tracking there.

### Q: Does it work with the app minimized?
**A:** Yes! As long as the app is running.

### Q: What about privacy?
**A:** Everything stays on your computer. No data sent anywhere.

## 🚀 Advanced: Add Participant Names (Optional)

If you want participant names in your logs, you have two options:

### Option 1: If You Have Azure Access
Follow the full setup in [TEAMS_INTEGRATION.md](TEAMS_INTEGRATION.md)

### Option 2: If You Don't Have Azure Access
Send this to your IT team:

> Hi IT,
>
> Can you create an Azure AD app registration for my time tracker?
>
> **Permissions needed (delegated, read-only):**
> - Calendars.Read
> - OnlineMeetings.Read
> - User.Read
>
> I'll need the Client ID, Tenant ID, and a Client Secret.
>
> Thanks!

Once they provide credentials, enter in Settings → Teams Integration.

## 📝 That's It!

You're all set. Just use the app and it'll track your Teams calls automatically.

For detailed docs: [TEAMS_INTEGRATION.md](TEAMS_INTEGRATION.md)
For troubleshooting: See the main guide's Troubleshooting section
