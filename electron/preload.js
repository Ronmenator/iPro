const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File system operations
  fs: {
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  },
  
  // Dialog operations
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  },
  
  // Project operations
  project: {
    export: (exportPath, files) => ipcRenderer.invoke('project:export', exportPath, files),
  },
  
  // Git operations
  git: {
    commit: (message, operations) => ipcRenderer.invoke('git:commit', message, operations),
  },
  
  // Listen to main process events
  on: (channel, callback) => {
    const validChannels = [
      'menu-new-project',
      'menu-help',
      'open-command-palette',
      'project-loaded',
      'save-project-requested',
      'export-project-requested',
      'import-project',
    ];
    
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Remove listener
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // Check if running in Electron
  isElectron: true,
});

