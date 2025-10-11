// Live detection test - keeps running
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('🔴 LIVE Teams Detection Monitor');
console.log('Press Ctrl+C to stop\n');

let checkCount = 0;
let lastCallState = false;

async function check() {
  checkCount++;

  const script = `
    tell application "System Events"
      set windowTitle to ""

      -- Check for new Teams (MSTeams)
      if exists (process "MSTeams") then
        try
          set windowTitle to name of window 1 of process "MSTeams"
        end try
      end if

      -- Check for classic Teams
      if windowTitle is "" and exists (process "Microsoft Teams") then
        try
          set windowTitle to name of window 1 of process "Microsoft Teams"
        end try
      end if

      -- Check for Teams (generic)
      if windowTitle is "" and exists (process "Teams") then
        try
          set windowTitle to name of window 1 of process "Teams"
        end try
      end if

      return windowTitle
    end tell
  `;

  try {
    const { stdout } = await execPromise(`osascript -e '${script}'`);
    const windowTitle = stdout.trim();

    if (!windowTitle) {
      if (lastCallState) {
        console.log('\n❌ CALL ENDED');
        lastCallState = false;
      }
      return;
    }

    // Check if in call
    const callPatterns = [
      /\|\s*Microsoft Teams$/i,
      /Meeting\s*\|/i,
      /Call\s*\|/i,
      /\d+:\d+:\d+/
    ];

    const inCall = callPatterns.some(pattern => pattern.test(windowTitle));

    // State change detection
    if (inCall && !lastCallState) {
      console.log('\n🎉 CALL STARTED!');
      console.log('   Window:', windowTitle);

      // Extract meeting name
      let name = windowTitle
        .replace(/\s*\|\s*Microsoft Teams$/i, '')
        .replace(/\s*\d+:\d+:\d+.*$/, '')
        .trim();

      if (name.includes('|')) {
        name = name.split('|')[0].trim();
      }

      console.log('   Meeting:', name);
      console.log('   ⏱️  Timer should start now!\n');
      lastCallState = true;
    } else if (!inCall && lastCallState) {
      console.log('\n❌ CALL ENDED\n');
      lastCallState = false;
    } else if (inCall) {
      // Still in call, show heartbeat
      process.stdout.write(`\r📞 In call... (check #${checkCount})`);
    } else {
      // Not in call
      process.stdout.write(`\r⏹️  No call detected (check #${checkCount})`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Check immediately
check();

// Then every 2 seconds
setInterval(check, 2000);
