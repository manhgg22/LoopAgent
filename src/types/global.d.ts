import type { TerminalEvent, TerminalTileConfig } from '../../electron/terminal/types';
import type { Workspace, WorkspaceStatus, StoredTileLayout } from '../../electron/workspace/types';

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
      saveTileLayout(layout: StoredTileLayout): Promise<void>;
    };
  }
}
