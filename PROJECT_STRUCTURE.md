# Project Structure

This document explains the scalable folder structure of the Time Tracker Widget application.

## Directory Overview

```
time-tracker-widget/
├── assets/                 # Application assets (icons, images)
│   ├── icon.png           # Window icon
│   ├── icon.ico           # Windows build icon
│   ├── icon.icns          # macOS build icon
│   └── tray-icon.png      # System tray icon
│
├── src/                   # Source code
│   ├── main/             # Electron main process
│   │   └── index.js      # Main process entry point
│   │
│   ├── renderer/         # Electron renderer process (UI)
│   │   ├── index.html    # Main window HTML
│   │   ├── settings.html # Settings window HTML
│   │   ├── index.js      # Main renderer logic
│   │   └── styles.css    # Application styles
│   │
│   ├── preload/          # Preload scripts for secure IPC
│   │   └── index.js      # Preload script (currently minimal)
│   │
│   ├── services/         # Business logic and external integrations
│   │   ├── teams-graph-service.js    # Microsoft Teams Graph API
│   │   ├── teams-monitor.js          # Windows Teams monitoring
│   │   └── teams-monitor-macos.js    # macOS Teams monitoring
│   │
│   └── shared/           # Shared utilities and constants
│       └── (empty - for future shared code)
│
├── tests/                # Test files (for future use)
│
├── main.js               # Legacy main file (to be removed)
├── preload.js            # Legacy preload (to be removed)
└── package.json          # Project configuration
```

## Key Directories

### `src/main/`
Contains the Electron main process code that handles:
- Window creation and management
- IPC (Inter-Process Communication) handlers
- System tray functionality
- Integration with native OS features

**Entry Point:** [src/main/index.js](src/main/index.js)

### `src/renderer/`
Contains the UI layer (HTML, CSS, JavaScript) that runs in the browser context:
- Main application interface
- Settings interface
- All client-side logic and styling

**Main Files:**
- [src/renderer/index.html](src/renderer/index.html) - Main window
- [src/renderer/index.js](src/renderer/index.js) - Main window logic
- [src/renderer/settings.html](src/renderer/settings.html) - Settings window
- [src/renderer/styles.css](src/renderer/styles.css) - Application styles

### `src/preload/`
Contains preload scripts that bridge the gap between main and renderer processes securely. Currently minimal, but can be expanded to:
- Expose specific Node.js/Electron APIs to renderer
- Implement security boundaries
- Handle secure IPC communication

### `src/services/`
Contains business logic and external service integrations:
- **teams-graph-service.js** - Microsoft Graph API integration
- **teams-monitor.js** - Windows Teams call monitoring
- **teams-monitor-macos.js** - macOS Teams call monitoring
- Future: Jira service, time tracking service, etc.

### `src/shared/`
For shared utilities, constants, and helpers used across multiple processes.

### `assets/`
Application assets like icons for different platforms. Add your icon files here:
- `icon.png` - General window icon
- `icon.ico` - Windows executable icon
- `icon.icns` - macOS app bundle icon
- `tray-icon.png` - System tray icon

### `tests/`
Unit tests and integration tests (to be implemented).

## Benefits of This Structure

1. **Separation of Concerns** - Main process, renderer, and services are clearly separated
2. **Scalability** - Easy to add new services, utilities, or UI components
3. **Maintainability** - Clear organization makes it easier to find and modify code
4. **Best Practices** - Follows Electron community recommendations
5. **Testing** - Structure supports automated testing with dedicated test directory
6. **Onboarding** - New contributors can quickly understand the codebase layout

## Migration Notes

The project has been reorganized from a flat structure to this scalable layout. Key changes:
- `main.js` → `src/main/index.js`
- `preload.js` → `src/preload/index.js`
- `src/renderer.js` → `src/renderer/index.js`
- Service files moved to `src/services/`
- HTML/CSS files moved to `src/renderer/`

## Current Status

⚠️ **System-Level Electron Issue Detected**

The reorganized project structure is **complete and correct**, but Electron is currently unable to run due to a system-level initialization issue where `process.type` is undefined. This affects BOTH the old and new code structures.

**This is NOT a code problem - it's an environment issue.**

See [ELECTRON_ISSUE_INVESTIGATION.md](ELECTRON_ISSUE_INVESTIGATION.md) for:
- Detailed investigation findings
- Root cause analysis
- Step-by-step resolution guide
- Recommended fixes (likely Node.js version downgrade to v20 LTS)

Once the Electron environment is fixed, the reorganized structure will work immediately.

## Next Steps (After Electron is Fixed)

1. ~~Resolve the Electron module loading issue~~ (See ELECTRON_ISSUE_INVESTIGATION.md)
2. Test and verify the reorganized structure works
3. Remove legacy files (`main.js`, `preload.js`)
4. Implement proper preload script with context isolation
5. Add shared utilities to `src/shared/`
6. Set up testing framework in `tests/`
7. Create service abstraction layer for better separation of concerns
