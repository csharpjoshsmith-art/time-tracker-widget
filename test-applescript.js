// Test AppleScript Teams detection
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('🍎 Testing AppleScript Teams Detection\n');

async function test() {
  const script = `
    tell application "System Events"
      set teamsRunning to false
      set windowTitle to ""

      -- Check for new Teams (MSTeams)
      if exists (process "MSTeams") then
        set teamsRunning to true
        try
          set windowTitle to name of window 1 of process "MSTeams"
        end try
      end if

      -- Check for classic Teams (Microsoft Teams)
      if windowTitle is "" and exists (process "Microsoft Teams") then
        set teamsRunning to true
        try
          set windowTitle to name of window 1 of process "Microsoft Teams"
        end try
      end if

      -- Check for Teams (generic name)
      if windowTitle is "" and exists (process "Teams") then
        set teamsRunning to true
        try
          set windowTitle to name of window 1 of process "Teams"
        end try
      end if

      return windowTitle
    end tell
  `;

  try {
    console.log('Running AppleScript...\n');

    const { stdout, stderr } = await execPromise(`osascript -e '${script}'`);

    if (stderr) {
      console.error('⚠️  Errors:', stderr);
    }

    const windowTitle = stdout.trim();

    if (!windowTitle) {
      console.log('❌ No Teams window found');
      console.log('   Make sure Teams is running and has a window open');
      return;
    }

    console.log('✅ Teams window detected!');
    console.log('   Title:', windowTitle);

    // Check call patterns
    const callPatterns = [
      { name: 'Microsoft Teams suffix', regex: /\|\s*Microsoft Teams$/i },
      { name: 'Meeting keyword', regex: /Meeting\s*\|/i },
      { name: 'Call keyword', regex: /Call\s*\|/i },
      { name: 'Time counter', regex: /\d+:\d+:\d+/ }
    ];

    console.log('\n🔎 Call detection:');
    let inCall = false;

    callPatterns.forEach(pattern => {
      const matches = pattern.regex.test(windowTitle);
      console.log(`   ${matches ? '✅' : '  '} ${pattern.name}: ${matches ? 'MATCH' : 'no match'}`);
      if (matches) inCall = true;
    });

    if (inCall) {
      console.log('\n🎉 CALL DETECTED!');

      // Extract meeting name (same logic as in teams-monitor-macos.js)
      let name = windowTitle
        .replace(/\s*\|\s*Microsoft Teams$/i, '')
        .replace(/\s*-\s*Microsoft Teams$/i, '')
        .replace(/\s*\d+:\d+:\d+.*$/, '')
        .trim();

      // Teams often shows: "Meeting Name | Organization | Email | Microsoft Teams"
      // Extract just the first part (meeting name)
      if (name.includes('|')) {
        const parts = name.split('|');
        name = parts[0].trim();
      }

      if (!name || name === 'Microsoft Teams' || name === 'Teams') {
        name = 'Teams Call';
      }

      console.log('   Extracted meeting name:', name);
      console.log('\n✅ Time Tracker will log this as: "Teams: ' + name + '"');
    } else {
      console.log('\n ℹ️  Teams is running but no call detected');
      console.log('   Window title doesn\'t match call patterns');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('not allowed') || error.message.includes('not authorized')) {
      console.log('\n🔐 PERMISSION ISSUE!');
      console.log('\nTo fix:');
      console.log('1. Open System Settings → Privacy & Security');
      console.log('2. Click "Automation" on the left');
      console.log('3. Find Terminal or your app');
      console.log('4. Enable "System Events"');
      console.log('5. Restart and try again');
    }
  }
}

test();
