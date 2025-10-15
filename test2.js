try {
  const electron = require('electron');
  console.log('Type of electron:', typeof electron);
  console.log('Electron keys:', Object.keys(electron || {}).slice(0, 20));
  if (electron && electron.app) {
    console.log('App exists!');
    electron.app.whenReady().then(() => {
      console.log('Ready!');
      electron.app.quit();
    });
  } else {
    console.log('No app found');
  }
} catch (e) {
  console.error('Error:', e.message);
}
