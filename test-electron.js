const { app, BrowserWindow } = require('electron');

console.log('App loaded:', typeof app);
console.log('BrowserWindow loaded:', typeof BrowserWindow);

app.whenReady().then(() => {
  console.log('App is ready!');
  app.quit();
});
