import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow;
let currentProjectPath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          },
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: handleOpenProject,
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: handleSaveProject,
        },
        {
          label: 'Export Project...',
          accelerator: 'CmdOrCtrl+E',
          click: handleExportProject,
        },
        { type: 'separator' },
        {
          label: 'Import Project...',
          accelerator: 'CmdOrCtrl+I',
          click: handleImportProject,
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            mainWindow.webContents.send('menu-help');
          },
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Monday Writer',
              message: 'Monday Writer v1.0.0',
              detail: 'A modern writing application with AI integration.\nBuilt with React, Electron, and Tailwind CSS.',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  // Add Command Palette
  template.splice(2, 0, {
    label: 'Go',
    submenu: [
      {
        label: 'Command Palette...',
        accelerator: 'CmdOrCtrl+K',
        click: () => {
          mainWindow.webContents.send('open-command-palette');
        },
      },
    ],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function handleOpenProject() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    properties: ['openDirectory'],
    message: 'Select project folder',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const projectPath = result.filePaths[0];
    currentProjectPath = projectPath;
    
    try {
      // Read all markdown files from project
      const files = await readProjectFiles(projectPath);
      mainWindow.webContents.send('project-loaded', { projectPath, files });
    } catch (error) {
      dialog.showErrorBox('Error Opening Project', error.message);
    }
  }
}

async function handleSaveProject() {
  if (!currentProjectPath) {
    return handleExportProject();
  }

  mainWindow.webContents.send('save-project-requested', currentProjectPath);
}

async function handleExportProject() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Export Project',
    properties: ['openDirectory', 'createDirectory'],
    message: 'Select or create export folder',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const exportPath = result.filePaths[0];
    mainWindow.webContents.send('export-project-requested', exportPath);
  }
}

async function handleImportProject() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Project',
    properties: ['openDirectory'],
    message: 'Select project folder to import',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const projectPath = result.filePaths[0];
    
    try {
      const files = await readProjectFiles(projectPath);
      mainWindow.webContents.send('import-project', { projectPath, files });
    } catch (error) {
      dialog.showErrorBox('Error Importing Project', error.message);
    }
  }
}

async function readProjectFiles(projectPath) {
  const files = new Map();
  
  async function readDir(dirPath, relativePath = '') {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      
      if (entry.isDirectory()) {
        await readDir(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.promises.readFile(fullPath, 'utf-8');
        files.set(relPath, content);
      }
    }
  }
  
  await readDir(projectPath);
  return Object.fromEntries(files);
}

// IPC Handlers
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return result;
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:readDir', async (event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return {
      success: true,
      entries: entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      })),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:export', async (event, exportPath, files) => {
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const fullPath = path.join(exportPath, relativePath);
      const dir = path.dirname(fullPath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(fullPath, content, 'utf-8');
    }
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Export Complete',
      message: 'Project exported successfully!',
      detail: `Exported to: ${exportPath}`,
      buttons: ['OK'],
    });
    
    return { success: true };
  } catch (error) {
    dialog.showErrorBox('Export Error', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:commit', async (event, message, operations) => {
  // Optional Git integration
  // This would require simple-git or similar library
  // For now, just log the commit
  console.log('Git commit requested:', message, operations);
  return { success: true, message: 'Git integration not yet implemented' };
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle protocol for development
if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

