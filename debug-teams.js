// Debug script to test Teams call detection
const activeWin = require('active-win');

console.log('🔍 Teams Call Detection Debugger\n');
console.log('This will check your active window every 2 seconds.');
console.log('Make sure Teams is your active window and you\'re in a call.\n');
console.log('Press Ctrl+C to stop.\n');

let checkCount = 0;

async function debugCheck() {
  checkCount++;
  console.log(`\n=== Check #${checkCount} ===`);

  try {
    const window = await activeWin();

    if (!window) {
      console.log('❌ No active window detected');
      console.log('   → This might be a permissions issue on macOS');
      return;
    }

    console.log('✅ Active Window Detected:');
    console.log('   Title:', window.title);
    console.log('   Owner:', window.owner?.name);
    console.log('   App:', window.platform === 'macos' ? window.owner?.bundleId : 'N/A');

    // Check if it's Teams
    const isTeamsWindow = window.owner?.name?.toLowerCase().includes('teams') ||
                         window.title?.toLowerCase().includes('teams');

    if (isTeamsWindow) {
      console.log('\n📞 Teams window detected!');

      // Check call detection patterns
      const callPatterns = [
        { name: 'Microsoft Teams suffix', regex: /\|\s*Microsoft Teams$/i },
        { name: 'Meeting keyword', regex: /Meeting\s*\|/i },
        { name: 'Call keyword', regex: /Call\s*\|/i },
        { name: 'Time counter', regex: /\d+:\d+:\d+/ }
      ];

      let inCall = false;
      console.log('\n🔎 Checking call patterns:');

      callPatterns.forEach(pattern => {
        const matches = pattern.regex.test(window.title);
        console.log(`   ${matches ? '✅' : '❌'} ${pattern.name}: ${matches ? 'MATCH' : 'no match'}`);
        if (matches) inCall = true;
      });

      if (inCall) {
        console.log('\n🎉 CALL DETECTED!');
        console.log('   Meeting name:', extractMeetingName(window.title));
      } else {
        console.log('\n⚠️  Teams is active but NO CALL DETECTED');
        console.log('   This could mean:');
        console.log('   - Not currently in a call');
        console.log('   - Window title pattern is different');
        console.log('   - Teams is in a lobby/waiting room');
      }
    } else {
      console.log('\n❌ Not a Teams window');
      console.log('   Switch to Teams and join a call to test');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('denied') || error.message.includes('permission')) {
      console.log('\n🔐 PERMISSION ISSUE DETECTED!');
      console.log('\nTo fix on macOS:');
      console.log('1. Open System Settings/Preferences');
      console.log('2. Go to Privacy & Security → Screen Recording');
      console.log('3. Enable permission for:');
      console.log('   - Terminal (if running via npm start)');
      console.log('   - Electron (if running the built app)');
      console.log('   - Or your code editor (VS Code, etc.)');
      console.log('\n4. Restart the app after granting permission');
    }
  }
}

function extractMeetingName(windowTitle) {
  let name = windowTitle
    .replace(/\s*\|\s*Microsoft Teams$/i, '')
    .replace(/\s*-\s*Microsoft Teams$/i, '')
    .replace(/\s*\d+:\d+:\d+.*$/, '')
    .trim();

  if (!name || name === 'Microsoft Teams' || name === 'Teams') {
    name = 'Teams Call';
  }

  return name;
}

// Run check immediately
debugCheck();

// Then every 2 seconds
setInterval(debugCheck, 2000);
