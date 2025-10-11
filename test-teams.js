// Quick test script to verify Teams integration dependencies
console.log('Testing Teams Integration Dependencies...\n');

try {
  console.log('✓ Testing active-win...');
  const activeWin = require('active-win');
  console.log('  active-win loaded successfully');

  console.log('✓ Testing @microsoft/microsoft-graph-client...');
  const { Client } = require('@microsoft/microsoft-graph-client');
  console.log('  Graph client loaded successfully');

  console.log('✓ Testing @azure/msal-node...');
  const { ConfidentialClientApplication } = require('@azure/msal-node');
  console.log('  MSAL loaded successfully');

  console.log('✓ Testing electron-store...');
  const Store = require('electron-store');
  console.log('  electron-store loaded successfully');

  console.log('\n✅ All Teams integration dependencies are installed correctly!');
  console.log('\nNext steps:');
  console.log('1. Run: npm start');
  console.log('2. Join a Teams call to test automatic detection');
  console.log('3. Check Settings for optional Graph API setup');
  console.log('\nFor detailed setup instructions, see: TEAMS_INTEGRATION.md');

} catch (error) {
  console.error('\n❌ Error loading dependencies:');
  console.error(error.message);
  console.error('\nPlease run: npm install');
  process.exit(1);
}
