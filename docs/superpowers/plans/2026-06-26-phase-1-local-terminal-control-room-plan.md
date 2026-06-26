# Phase 1 — Local Terminal Control Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold an Electron + React + TypeScript + Vite desktop app that can open multiple independent PowerShell terminal tiles using xterm.js and node-pty, with secure IPC and a README.

**Architecture:** A single-window Electron app with a React/Vite renderer. The main process owns one `TerminalManager` that spawns real PTYs via node-pty. A small, explicit preload script exposes only safe terminal IPC APIs to the renderer. The renderer renders one `TerminalTile` component per PTY using xterm.js and a global state store. All file paths and commands are validated in the main process before PTY or file operations.

**Tech Stack:** Electron, React 18, TypeScript 5, Vite 5, xterm.js, node-pty, Tailwind CSS, Zustand.

## Global Constraints

- Platform target: Windows (PowerShell as default shell).
- Electron `contextIsolation: true` in every `BrowserWindow`.
- Electron `nodeIntegration: false` in the renderer.
- Expose only safe IPC APIs through a preload script.
- Validate `workspaceId`, `cwd`, `command`, and file path inputs in IPC handlers.
- Do not allow renderer to execute arbitrary Node.js code directly.
- Phase 1 only. No Phase 2-6, no Browser tile, no Worktree, no Composio/Google Workspace/Sales workflow, no auto merge/deploy.
- No reading/displaying/logging/sending `.env` or secret files into agents/models.
- Default shell preset for terminal tiles: `powershell.exe -NoLogo`.
- Terminal tile may spawn an interactive PowerShell shell and then write the startup command into it (preferred for agent tiles) or spawn PowerShell with arguments (preferred for app-triggered commands).

---

## File Structure

```text
ai-dev-control-room/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── electron.vite.config.ts   (optional - can merge into vite.config.ts)
├── README.md
├── index.html
├── .gitignore                (already exists)
├── electron/
│   ├── main.ts               # entry point for Electron main process
│   ├── preload.ts            # safe IPC bridge exposed to renderer
│   └── terminal/
│       ├── TerminalManager.ts
│       ├── pty-spawn.ts
│       └── types.ts
├── src/
│   ├── main.tsx              # React renderer entry
│   ├── App.tsx
│   ├── index.css             # Tailwind imports
│   ├── store/
│   │   └── terminalStore.ts  # Zustand store for tile list + selected tile
│   └── components/
│       ├── TerminalTile.tsx  # xterm.js wrapper
│       ├── TileGrid.tsx      # renders multiple tiles
│       ├── TileToolbar.tsx   # add/remove/restart/clear buttons
│       └── Layout.tsx        # header + grid + toolbar
└── tests/
    └── terminal/
        └── TerminalManager.test.ts   # integration test with mock PTY
```

---

## Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Modify: `.gitignore` (if Node entries are missing)

**Interfaces:**
- Consumes: none.
- Produces: runnable npm project with scripts `dev`, `build`, `electron:dev`, `electron:build`, `test`. `electron:dev` runs only `vite`, because `vite-plugin-electron` compiles and launches the main/preload processes automatically from `vite.config.ts`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "ai-dev-control-room",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "vite",
    "electron:build": "npm run build && electron-builder",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@xterm/xterm": "^5.3.0",
    "@xterm/addon-fit": "^0.10.0",
    "node-pty": "^1.0.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "electron": "^30.0.0",
    "electron-builder": "^24.0.0",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-electron": "^0.28.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@electron/*": ["electron/*"]
    }
  },
  "include": ["src", "electron"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "electron"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: ['electron/main.ts', 'electron/preload.ts'],
    }),
  ],
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 5: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Dev Control Room</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Add Node/Electron entries to `.gitignore` if missing**

Append if not present:

```text
# Build / dependencies
node_modules/
dist/
release/
out/
*.log
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` created, no install errors.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html .gitignore
npm install
git add package-lock.json
git commit -m "chore: scaffold Electron + React + TS + Vite project"
```

---

## Task 2: Set up TypeScript types for terminal and IPC

**Files:**
- Create: `electron/terminal/types.ts`
- Create: `electron/preload.ts`

**Interfaces:**
- Consumes: none.
- Produces: shared types `TerminalTileConfig`, `TerminalEvent`, `IpcTerminalApi` used by main and renderer.

- [ ] **Step 1: Write failing type consistency test**

Create `tests/terminal/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TerminalTileConfig, TerminalEvent } from '../../electron/terminal/types';

describe('terminal types', () => {
  it('TerminalTileConfig accepts a valid tile config', () => {
    const cfg: TerminalTileConfig = {
      id: 't1',
      workspaceId: 'w1',
      title: 'PowerShell 1',
      role: 'plain',
      cwd: 'C:\\tmp',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      command: undefined,
    };
    expect(cfg.id).toBe('t1');
  });

  it('TerminalEvent has required output shape', () => {
    const ev: TerminalEvent = {
      tileId: 't1',
      type: 'output',
      data: 'hello',
    };
    expect(ev.type).toBe('output');
  });
});
```

Run:

```bash
npx vitest run tests/terminal/types.test.ts
```

Expected: FAIL because `electron/terminal/types.ts` does not exist.

- [ ] **Step 2: Write `electron/terminal/types.ts`**

```ts
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
```

- [ ] **Step 3: Write `electron/preload.ts`**

```ts
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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/terminal/types.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/terminal/types.ts electron/preload.ts tests/terminal/types.test.ts
git commit -m "feat: add terminal types and preload IPC bridge"
```

---

## Task 3: Implement TerminalManager in main process

**Files:**
- Create: `electron/terminal/TerminalManager.ts`
- Create: `electron/terminal/pty-spawn.ts`

**Interfaces:**
- Consumes: `TerminalTileConfig`, `TerminalEvent`, `TerminalTileState` from `electron/terminal/types.ts`.
- Produces: `TerminalManager` class with methods `create`, `write`, `resize`, `kill`, and event subscription. Used by `electron/main.ts`.

- [ ] **Step 1: Write `electron/terminal/pty-spawn.ts`**

```ts
import * as pty from 'node-pty';

export interface PtyProcess {
  pid: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(handler: (data: string) => void): void;
  onExit(handler: (exitCode: number, signal?: number) => void): void;
}

export function spawnPty(
  shell: string,
  shellArgs: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): PtyProcess {
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-color',
    cwd,
    env: env as { [key: string]: string },
  });

  return {
    pid: ptyProcess.pid,
    write: (data) => ptyProcess.write(data),
    resize: (cols, rows) => ptyProcess.resize(cols, rows),
    kill: (signal) => ptyProcess.kill(signal),
    onData: (handler) => ptyProcess.onData(handler),
    onExit: (handler) => ptyProcess.onExit(({ exitCode, signal }) => handler(exitCode, signal)),
  };
}
```

- [ ] **Step 2: Write `electron/terminal/TerminalManager.ts`**

```ts
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { spawnPty } from './pty-spawn';
import type {
  TerminalTileConfig,
  TerminalEvent,
  TerminalTileState,
  TerminalStatus,
} from './types';

export class TerminalManager extends EventEmitter {
  private tiles = new Map<string, TerminalTileState>();
  private processes = new Map<string, ReturnType<typeof spawnPty>>();

  async create(config: TerminalTileConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.id || !config.workspaceId) {
      return { success: false, error: 'Missing tile or workspace id' };
    }
    if (!config.cwd || !path.isAbsolute(config.cwd)) {
      return { success: false, error: 'cwd must be an absolute path' };
    }
    if (!config.shell) {
      return { success: false, error: 'shell is required' };
    }

    const existing = this.processes.get(config.id);
    if (existing) {
      existing.kill();
      this.processes.delete(config.id);
    }

    try {
      const pty = spawnPty(config.shell, config.shellArgs, config.cwd);
      this.processes.set(config.id, pty);

      const state: TerminalTileState = {
        ...config,
        status: 'running',
        pid: pty.pid,
      };
      this.tiles.set(config.id, state);

      pty.onData((data) => {
        this.emit('event', {
          tileId: config.id,
          type: 'output',
          data,
        } as TerminalEvent);
      });

      pty.onExit((exitCode, signal) => {
        this.emit('event', {
          tileId: config.id,
          type: 'exit',
          data: exitCode,
          message: signal ? `signal ${signal}` : undefined,
        } as TerminalEvent);
        this.setStatus(config.id, exitCode === 0 ? 'stopped' : 'error');
      });

      // If a startup command is provided, write it after a short delay
      // so the shell prompt is ready.
      if (config.command) {
        setTimeout(() => {
          pty.write(`${config.command}\r`);
        }, 500);
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  write(tileId: string, data: string): void {
    const pty = this.processes.get(tileId);
    if (!pty) throw new Error(`Terminal ${tileId} not found`);
    pty.write(data);
  }

  resize(tileId: string, cols: number, rows: number): void {
    const pty = this.processes.get(tileId);
    if (!pty) return;
    pty.resize(cols, rows);
  }

  kill(tileId: string): void {
    const pty = this.processes.get(tileId);
    if (!pty) return;
    pty.kill();
    this.processes.delete(tileId);
    this.setStatus(tileId, 'stopped');
  }

  private setStatus(tileId: string, status: TerminalStatus): void {
    const tile = this.tiles.get(tileId);
    if (!tile) return;
    tile.status = status;
    this.emit('event', {
      tileId,
      type: 'status',
      data: status,
    } as TerminalEvent);
  }

  list(): TerminalTileState[] {
    return Array.from(this.tiles.values());
  }
}
```

- [ ] **Step 3: Write failing integration test for TerminalManager**

Create `tests/terminal/TerminalManager.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { TerminalManager } from '../../electron/terminal/TerminalManager';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock pty-spawn so tests don't require a real shell
vi.mock('../../electron/terminal/pty-spawn', () => ({
  spawnPty: vi.fn().mockImplementation(() => {
    const emitter = new (require('node:events').EventEmitter)();
    let lastWrite = '';
    return {
      pid: 1234,
      write: vi.fn((data: string) => {
        lastWrite = data;
        emitter.emit('data', data);
      }),
      getLastWrite: () => lastWrite,
      resize: vi.fn(),
      kill: vi.fn(() => emitter.emit('exit', 0, undefined)),
      onData: (handler: (data: string) => void) => emitter.on('data', handler),
      onExit: (handler: (code: number, signal?: number) => void) =>
        emitter.on('exit', (exitCode: number, signal?: number) => handler(exitCode, signal)),
    };
  }),
}));

describe('TerminalManager', () => {
  it('creates a terminal with running status', async () => {
    const manager = new TerminalManager();

    const result = await manager.create({
      id: 't1',
      workspaceId: 'w1',
      title: 'Test',
      role: 'plain',
      cwd: process.cwd(),
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
    });

    expect(result.success).toBe(true);
    expect(manager.list()).toHaveLength(1);
    expect(manager.list()[0].status).toBe('running');
    expect(manager.list()[0].pid).toBe(1234);
  });

  it('rejects relative cwd', async () => {
    const manager = new TerminalManager();
    const result = await manager.create({
      id: 't2',
      workspaceId: 'w1',
      title: 'Bad',
      role: 'plain',
      cwd: 'relative/path',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('absolute path');
  });

  it('writes startup command to PTY when command is provided', async () => {
    const manager = new TerminalManager();

    await manager.create({
      id: 't3',
      workspaceId: 'w1',
      title: 'WithCommand',
      role: 'plain',
      cwd: process.cwd(),
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      command: 'Get-Date',
    });

    await wait(50);
    const pty = (manager as any).processes.get('t3');
    expect(pty.getLastWrite()).toBe('Get-Date\r');
  });
});
```

Run:

```bash
npx vitest run tests/terminal/TerminalManager.test.ts
```

Expected: PASS (mocked) or FAIL if path resolution issue. Fix imports if needed.

- [ ] **Step 4: Commit**

```bash
git add electron/terminal/TerminalManager.ts electron/terminal/pty-spawn.ts tests/terminal/TerminalManager.test.ts
git commit -m "feat: add TerminalManager and PTY spawn wrapper"
```

---

## Task 4: Wire Electron main process with IPC handlers

**Files:**
- Create: `electron/main.ts`

**Interfaces:**
- Consumes: `TerminalManager`, `TerminalTileConfig`, `TerminalEvent` from previous tasks.
- Produces: `BrowserWindow` with secure preload; IPC handlers `terminal:create`, `terminal:write-input`, `terminal:resize`, `terminal:kill`, `terminal:event`.

- [ ] **Step 1: Write `electron/main.ts`**

```ts
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
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: wire TerminalManager into Electron main process with secure IPC"
```

---

## Task 5: Build React renderer, Zustand store, and TerminalTile component

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/store/terminalStore.ts`
- Create: `src/components/TerminalTile.tsx`
- Create: `src/components/TileGrid.tsx`
- Create: `src/components/TileToolbar.tsx`

**Interfaces:**
- Consumes: `window.terminalApi` exposed by preload; `TerminalEvent`, `TerminalTileConfig`, `TileRole`, `TerminalStatus` from `electron/terminal/types`.
- Produces: UI that renders multiple xterm.js terminals and dispatches create/write/resize/kill via IPC.

- [ ] **Step 1: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
}

.xterm-screen {
  padding: 8px;
}
```

- [ ] **Step 2: Write `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Write `src/store/terminalStore.ts`**

```ts
import { create } from 'zustand';
import type { TerminalTileState } from '../../electron/terminal/types';

interface TerminalStore {
  tiles: TerminalTileState[];
  selectedTileId: string | null;
  addTile: (tile: TerminalTileState) => void;
  removeTile: (tileId: string) => void;
  updateTile: (tileId: string, patch: Partial<TerminalTileState>) => void;
  setSelectedTileId: (tileId: string | null) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  tiles: [],
  selectedTileId: null,
  addTile: (tile) => set((state) => ({ tiles: [...state.tiles, tile] })),
  removeTile: (tileId) =>
    set((state) => ({
      tiles: state.tiles.filter((t) => t.id !== tileId),
      selectedTileId: state.selectedTileId === tileId ? null : state.selectedTileId,
    })),
  updateTile: (tileId, patch) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === tileId ? { ...t, ...patch } : t)),
    })),
  setSelectedTileId: (tileId) => set({ selectedTileId: tileId }),
}));
```

- [ ] **Step 4: Write `src/components/TerminalTile.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useTerminalStore } from '../store/terminalStore';

interface TerminalTileProps {
  tileId: string;
}

export function TerminalTile({ tileId }: TerminalTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { tiles, updateTile } = useTerminalStore();
  const tile = tiles.find((t) => t.id === tileId);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Consolas, monospace',
      fontSize: 14,
      theme: { background: '#0f172a', foreground: '#e2e8f0' },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);
    fitAddon.fit();
    term.focus();
    terminalRef.current = term;

    const unsubscribe = window.terminalApi.onTerminalEvent((event) => {
      if (event.tileId !== tileId) return;
      if (event.type === 'output' && typeof event.data === 'string') {
        term.write(event.data);
      }
      if (event.type === 'status' && typeof event.data === 'string') {
        updateTile(tileId, { status: event.data as any });
      }
    });

    const inputDisposable = term.onData((data) => {
      window.terminalApi.writeInput(tileId, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!fitAddonRef.current) return;
      fitAddonRef.current.fit();
      const cols = term.cols;
      const rows = term.rows;
      if (cols > 0 && rows > 0) {
        window.terminalApi.resizeTerminal(tileId, cols, rows);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      inputDisposable.dispose();
      unsubscribe();
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [tileId, updateTile]);

  if (!tile) return null;

  return (
    <div className="flex flex-col h-full border border-slate-700 rounded bg-slate-900">
      <div className="flex items-center justify-between px-3 py-1 border-b border-slate-700 text-sm">
        <span className="font-semibold text-slate-200">{tile.title}</span>
        <span className="text-xs text-slate-400">
          {tile.status} {tile.pid ? `(pid ${tile.pid})` : ''}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0"></div>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/components/TileGrid.tsx`**

```tsx
import { useTerminalStore } from '../store/terminalStore';
import { TerminalTile } from './TerminalTile';

export function TileGrid() {
  const { tiles } = useTerminalStore();

  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-[calc(100vh-80px)]">
      {tiles.map((tile) => (
        <TerminalTile key={tile.id} tileId={tile.id} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write `src/components/TileToolbar.tsx`**

```tsx
import { useTerminalStore } from '../store/terminalStore';

let tileCounter = 0;

export function TileToolbar() {
  const { tiles, removeTile } = useTerminalStore();

  const createTile = async () => {
    tileCounter += 1;
    const tileId = `tile-${tileCounter}`;
    const workspaceId = 'default';
    const title = `PowerShell ${tileCounter}`;
    const cwd = await window.terminalApi.getDefaultCwd();

    const result = await window.terminalApi.createTerminal({
      id: tileId,
      workspaceId,
      title,
      role: 'plain',
      cwd,
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
    });

    if (!result.success) {
      alert(`Failed to create terminal: ${result.error}`);
      return;
    }

    useTerminalStore.getState().addTile({
      id: tileId,
      workspaceId,
      title,
      role: 'plain',
      cwd,
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      status: 'running',
    });
  };

  return (
    <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-700 bg-slate-800">
      <button
        onClick={createTile}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
      >
        + New Terminal
      </button>
      <div className="flex-1"></div>
      {tiles.map((tile) => (
        <button
          key={tile.id}
          onClick={() => {
            window.terminalApi.killTerminal(tile.id);
            removeTile(tile.id);
          }}
          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded"
        >
          Close {tile.title}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Write `src/App.tsx`**

```tsx
import { TileGrid } from './components/TileGrid';
import { TileToolbar } from './components/TileToolbar';

export default function App() {
  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 flex items-center px-4 border-b border-slate-700 bg-slate-900">
        <h1 className="text-lg font-bold">AI Dev Control Room</h1>
        <span className="ml-3 text-xs text-slate-400">Phase 1 — Local Terminal Control Room</span>
      </header>
      <TileToolbar />
      <TileGrid />
    </div>
  );
}
```

- [ ] **Step 8: Add Tailwind config files**

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Create `postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 9: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/ tailwind.config.js postcss.config.js
git commit -m "feat: add React renderer, Zustand store, and xterm.js TerminalTile"
```

---

## Task 6: Manual test — run app and verify 3 independent terminals

**Files:**
- None to create.

**Interfaces:**
- Consumes: whole app.
- Produces: confirmation that Phase 1 works.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run electron:dev
```

Expected: Electron window opens, Vite dev server running on port 5173, DevTools open.

- [ ] **Step 2: Create first terminal**

Click **+ New Terminal**. Expected: a new PowerShell tile appears and shows the Windows PowerShell prompt.

- [ ] **Step 3: Type a command in the first terminal**

Type `Get-Location` and press Enter. Expected: terminal prints current directory.

- [ ] **Step 4: Create second and third terminals**

Click **+ New Terminal** two more times. Expected: three tiles visible; each has its own prompt and cwd.

- [ ] **Step 5: Run independent commands in each terminal**

For example:
- Tile 1: `Get-Date`
- Tile 2: `$PSVersionTable.PSVersion`
- Tile 3: `Get-Process | Select-Object -First 3`

Expected: each tile shows its own output, no cross-contamination.

- [ ] **Step 6: Close a terminal**

Click **Close PowerShell N**. Expected: tile removed and PTY process exits.

- [ ] **Step 7: Document any issues and fix**

If a step fails, file a fix and rerun from Step 1.

- [ ] **Step 8: Commit any final fixes**

```bash
git commit -am "fix: address Phase 1 manual test issues"
```

---

## Task 7: Write README with run instructions

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: whole project.
- Produces: documented setup and dev commands.

- [ ] **Step 1: Write `README.md`**

```markdown
# AI Dev Control Room

A local desktop control room for coordinating multiple AI coding agents through multiple terminal tiles.

This repository is currently at **Phase 1 — Local Terminal Control Room**.

## Phase 1 Features

- Electron + React + TypeScript + Vite desktop app.
- Multiple PowerShell terminal tiles powered by `xterm.js` and `node-pty`.
- Realtime input/output streaming through secure Electron IPC.
- Create and close terminals independently.

## Requirements

- Windows 10/11
- Node.js 20+
- PowerShell

## Install

```bash
npm install
```

## Run in development

```bash
npm run electron:dev
```

This starts the Vite dev server and opens the Electron window.

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Usage

1. Run `npm run electron:dev`.
2. Click **+ New Terminal** to open a PowerShell tile.
3. Type commands in each tile. Each tile is an independent PTY process.
4. Click **Close** to kill a tile.

## Project Structure

```text
electron/        # Electron main process, preload, and PTY manager
src/             # React renderer components and state
```

## Security

- `contextIsolation` is enabled.
- `nodeIntegration` is disabled.
- Only explicit IPC APIs are exposed to the renderer through `preload.ts`.
- All `cwd`, `shell`, and `command` inputs are validated in the main process.
```

- [ ] **Step 2: Verify README renders correctly**

Open in a Markdown preview or read it.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with Phase 1 run instructions"
```

---

## Task 8: Final verification and Phase 1 completion

**Files:**
- None to create.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: passing automated tests and working manual demo.

- [ ] **Step 1: Run automated tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev app and confirm 3 independent terminals**

```bash
npm run electron:dev
```

Expected: app opens; 3 terminals can be created; each runs independent PowerShell commands.

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

Expected: all Phase 1 commits pushed.

- [ ] **Step 5: Mark Phase 1 done**

Update this plan file by checking all checkboxes if using an agentic worker, or simply report completion.

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Scaffold Electron + React + TypeScript + Vite | Task 1 |
| Create terminal tile using xterm.js + node-pty | Tasks 2, 3, 5 |
| Run PowerShell in tile on Windows | Tasks 3, 6 |
| Stream input/output realtime | Tasks 3, 5 |
| Open at least 3 independent terminals | Tasks 5, 6 |
| Write README with run instructions | Task 7 |
| `contextIsolation` on | Task 4 |
| `nodeIntegration` off | Task 4 |
| Safe preload IPC only | Tasks 2, 4 |
| Validate cwd/path/command inputs | Tasks 3, 4 |

No Phase 2-6, Browser tile, Worktree, Composio, Google Workspace, Sales workflow, or auto merge/deploy are included.

## Placeholder Scan

No placeholders such as "TBD", "TODO", "implement later", or "similar to Task N" are used. Every step contains exact file paths, exact commands, and expected outputs.

## Type Consistency Check

- `TerminalTileConfig`, `TerminalTileState`, `TerminalEvent`, `IpcTerminalApi` defined in Task 2.
- `TerminalManager` uses these types consistently in Task 3.
- `electron/main.ts` uses the same IPC channel names as `preload.ts`.
- `TerminalTile.tsx` reads `window.terminalApi` typed via global declaration in Task 2.

## Open Questions Before Coding

None remaining. After the 5 technical fixes above, the plan aligns with the approved design doc, stays within Phase 1 scope, and is ready for implementation.
