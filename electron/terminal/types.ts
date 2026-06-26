export type TileRole = 'builder' | 'tester' | 'reviewer' | 'server' | 'verifier' | 'plain';

export type TerminalStatus = 'idle' | 'running' | 'stopped' | 'error';

export interface TerminalTileConfig {
  id: string;
  workspaceId: string;
  title: string;
  role: TileRole;
  cwd: string;
  shell: string;
  shellArgs: string[];
  command?: string;
  status?: TerminalStatus;
}

export interface TerminalTileState extends TerminalTileConfig {
  status: TerminalStatus;
  pid?: number;
}

export type TerminalEventType = 'output' | 'exit' | 'status' | 'error';

export interface TerminalEvent {
  tileId: string;
  type: TerminalEventType;
  data?: string | number;
  exitCode?: number;
  message?: string;
}

export interface IpcTerminalApi {
  createTerminal(tile: TerminalTileConfig): Promise<{ success: boolean; error?: string }>;
  getDefaultCwd(): Promise<string>;
  writeInput(tileId: string, data: string): Promise<void>;
  resizeTerminal(tileId: string, cols: number, rows: number): Promise<void>;
  killTerminal(tileId: string): Promise<void>;
  onTerminalEvent(callback: (event: TerminalEvent) => void): () => void;
}

declare global {
  interface Window {
    terminalApi: IpcTerminalApi;
  }
}
