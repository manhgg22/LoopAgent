import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TerminalManager } from './terminal/TerminalManager';
import type { TerminalTileConfig } from './terminal/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const terminalManager = new TerminalManager();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('terminal:get-default-cwd', () => {
    return process.cwd();
  });

  ipcMain.handle('terminal:create', async (_event, tile: TerminalTileConfig) => {
    if (!tile.id || !tile.workspaceId) {
      return { success: false, error: 'Missing tile/workspace id' };
    }
    if (!tile.cwd || !path.isAbsolute(tile.cwd)) {
      return { success: false, error: 'cwd must be absolute' };
    }
    if (!tile.shell || tile.shell.includes('\\') || tile.shell.includes('/')) {
      // Phase 1 only allows shell name; paths require explicit opt-in later
      return { success: false, error: 'shell must be a simple executable name' };
    }
    return terminalManager.create(tile);
  });

  ipcMain.handle('terminal:write-input', async (_event, tileId: string, data: string) => {
    if (typeof tileId !== 'string' || typeof data !== 'string') return;
    terminalManager.write(tileId, data);
  });

  ipcMain.handle('terminal:resize', async (_event, tileId: string, cols: number, rows: number) => {
    if (typeof tileId !== 'string' || typeof cols !== 'number' || typeof rows !== 'number') return;
    terminalManager.resize(tileId, cols, rows);
  });

  ipcMain.handle('terminal:kill', async (_event, tileId: string) => {
    if (typeof tileId !== 'string') return;
    terminalManager.kill(tileId);
  });

  terminalManager.on('event', (event) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('terminal:event', event);
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
