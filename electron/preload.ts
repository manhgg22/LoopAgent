import { contextBridge, ipcRenderer } from 'electron';
import type { TerminalEvent, TerminalTileConfig } from './terminal/types';
import type { Workspace, WorkspaceStatus, StoredTileLayout } from './workspace/types';
import type { VerifyResult } from './verify/types';

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

contextBridge.exposeInMainWorld('workspaceApi', {
  addWorkspace: (repoPath: string) => ipcRenderer.invoke('workspace:add', repoPath),
  openWorkspace: (workspaceId: string) => ipcRenderer.invoke('workspace:open', workspaceId),
  listWorkspaces: () => ipcRenderer.invoke('workspace:list'),
  removeWorkspace: (workspaceId: string) => ipcRenderer.invoke('workspace:remove', workspaceId),
  getCurrentWorkspace: () => ipcRenderer.invoke('workspace:get-current'),
  getWorkspaceStatus: (workspaceId: string) => ipcRenderer.invoke('workspace:get-status', workspaceId),
  loadTileLayout: (workspaceId: string) => ipcRenderer.invoke('workspace:load-layout', workspaceId),
  saveTileLayout: (layout: StoredTileLayout) => ipcRenderer.invoke('workspace:save-layout', layout),
});

contextBridge.exposeInMainWorld('verifyApi', {
  runVerify: (workspaceId: string, taskId: string) =>
    ipcRenderer.invoke('verify:run', workspaceId, taskId),
});

declare global {
  interface Window {
    terminalApi: {
      createTerminal(tile: TerminalTileConfig): Promise<{ success: boolean; error?: string }>;
      getDefaultCwd(): Promise<string>;
      writeInput(tileId: string, data: string): Promise<void>;
      resizeTerminal(tileId: string, cols: number, rows: number): Promise<void>;
      killTerminal(tileId: string): Promise<void>;
      onTerminalEvent(callback: (event: TerminalEvent) => void): () => void;
    };
    workspaceApi: {
      addWorkspace(repoPath: string): Promise<Workspace>;
      openWorkspace(workspaceId: string): Promise<Workspace | null>;
      listWorkspaces(): Promise<Workspace[]>;
      removeWorkspace(workspaceId: string): Promise<void>;
      getCurrentWorkspace(): Promise<Workspace | null>;
      getWorkspaceStatus(workspaceId: string): Promise<WorkspaceStatus>;
      loadTileLayout(workspaceId: string): Promise<StoredTileLayout>;
      saveTileLayout(layout: StoredTileLayout): Promise<{ success: boolean; error?: string }>;
    };
    verifyApi: {
      runVerify(workspaceId: string, taskId: string): Promise<{ success: true; result: VerifyResult } | { success: false; error: string }>;
    };
  }
}
