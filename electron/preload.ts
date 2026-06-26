import { contextBridge, ipcRenderer } from 'electron';
import type { TerminalEvent, TerminalTileConfig } from './terminal/types';

contextBridge.exposeInMainWorld('terminalApi', {
  createTerminal: (tile: TerminalTileConfig) =>
    ipcRenderer.invoke('terminal:create', tile),
  getDefaultCwd: () => ipcRenderer.invoke('terminal:get-default-cwd'),
  writeInput: (tileId: string, data: string) =>
    ipcRenderer.invoke('terminal:write-input', tileId, data),
  resizeTerminal: (tileId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', tileId, cols, rows),
  killTerminal: (tileId: string) =>
    ipcRenderer.invoke('terminal:kill', tileId),
  onTerminalEvent: (callback: (event: TerminalEvent) => void) => {
    const handler = (_: unknown, event: TerminalEvent) => callback(event);
    ipcRenderer.on('terminal:event', handler);
    return () => ipcRenderer.removeListener('terminal:event', handler);
  },
});
