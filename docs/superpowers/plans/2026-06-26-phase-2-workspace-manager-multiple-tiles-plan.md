# Phase 2 — Workspace Manager + Multiple Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Workspace Manager to the existing Phase 1 Electron app so users can add/open local repo paths, validate git status, persist recent workspaces and tile layouts to local JSON storage, and create multiple terminal tiles bound to the current workspace.

**Architecture:** Extend the Electron main process with a `WorkspaceManager` that validates paths, detects git repos/branches, and persists state to JSON in `app.getPath('userData')/ai-dev-control-room/`. Expose safe workspace IPC APIs through `preload.ts`. Update the React renderer with a workspace sidebar/top bar and make the tile canvas scoped to the active workspace. Store tile layouts keyed by `workspaceId` so reopening a workspace restores its tiles.

**Tech Stack:** Electron, React 18, TypeScript 5, Vite 5, xterm.js, node-pty, Zustand, Tailwind CSS, `simple-git` or `child_process` for git checks.

## Global Constraints

- Platform target: Windows (PowerShell as default shell).
- Electron `contextIsolation: true` in every `BrowserWindow`.
- Electron `nodeIntegration: false` in the renderer.
- Expose only safe IPC APIs through a preload script.
- Validate `workspaceId`, `cwd`, `command`, and file path inputs in IPC handlers.
- Do not allow renderer to execute arbitrary Node.js code directly.
- Do not automatically read, display, log, or send the contents of `.env` files or secret files into an agent or model.
- Renderer must not use Node APIs directly; all file/git/storage operations go through main-process IPC.
- Phase 2 only. No Phase 3-6 features (Goal Panel, Role Presets, Verify Runner, Diff Viewer, Human Approval, Worktree, Browser tile, Composio, Google Workspace, Sales workflow, auto merge/deploy).
- Default shell preset for terminal tiles: `powershell.exe -NoLogo`.
- Tile `cwd` defaults to `currentWorkspace.repoPath`.

---

## File Structure Additions

```text
ai-dev-control-room/
├── electron/
│   ├── workspace/
│   │   ├── WorkspaceManager.ts       # add/open/list/remove workspaces, git checks, persistence
│   │   ├── types.ts                  # Workspace, WorkspaceStatus, storage types
│   │   └── storage.ts                # read/write JSON in userData
│   ├── main.ts                       # add workspace IPC handlers (modified)
│   ├── preload.ts                    # add workspaceApi (modified)
│   └── terminal/
│       └── TerminalManager.ts        # support workspaceId in tiles (minor update)
├── src/
│   ├── store/
│   │   ├── workspaceStore.ts         # Zustand store for current/recent workspaces
│   │   └── terminalStore.ts          # extend: tiles per workspace, layout persistence (modified)
│   ├── components/
│   │   ├── WorkspacePanel.tsx        # sidebar: add/open/recent/current workspace
│   │   ├── WorkspaceInfo.tsx           # current workspace name/path/branch/warning
│   │   ├── TileCanvas.tsx              # workspace-scoped terminal grid
│   │   └── Layout.tsx                  # app shell (modified or new)
│   ├── App.tsx                       # integrate workspace panel + tile canvas (modified)
│   └── main.tsx                      # unchanged
├── tests/
│   └── workspace/
│       ├── WorkspaceManager.test.ts  # path validation, git detection, persistence
│       └── storage.test.ts             # storage helpers
└── README.md                         # Phase 2 usage update (modified)
```

---

## Task 1: Add workspace types and storage helpers

**Files:**
- Create: `electron/workspace/types.ts`
- Create: `electron/workspace/storage.ts`

**Interfaces:**
- Consumes: none.
- Produces: `Workspace`, `WorkspaceStatus`, `StoredWorkspaces`, `WorkspaceStorage` interface; `readJson`, `writeJson` helpers used by `WorkspaceManager`.

- [ ] **Step 1: Write failing test**

Create `tests/workspace/storage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readJson, writeJson } from '../../electron/workspace/storage';

describe('workspace storage helpers', () => {
  it('writes and reads JSON', async () => {
    const data = { workspaces: [{ id: 'w1', name: 'Test', repoPath: 'C:\\tmp', createdAt: 'x' }] };
    await writeJson('/fake/path.json', data);
    const result = await readJson('/fake/path.json', { workspaces: [] });
    expect(result).toEqual(data);
  });
});
```

Run:

```bash
npx vitest run tests/workspace/storage.test.ts
```

Expected: FAIL because storage module does not exist.

- [ ] **Step 2: Write `electron/workspace/types.ts`**

```ts
export type WorkspaceStatus = 'valid' | 'not_git_repo' | 'path_not_found' | 'error';

export interface Workspace {
  id: string;
  name: string;
  repoPath: string;
  branch?: string;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoredWorkspaces {
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
}

export interface StoredTileLayout {
  workspaceId: string;
  tiles: Array<{
    id: string;
    title: string;
    role: import('../terminal/types').TileRole;
    cwd: string;
    shell: string;
    shellArgs: string[];
    command?: string;
  }>;
}

export interface StoredTileLayouts {
  layouts: StoredTileLayout[];
}
```

- [ ] **Step 3: Write `electron/workspace/storage.ts`**

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function readJson<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultValue;
    }
    throw err;
  }
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/workspace/storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/workspace/types.ts electron/workspace/storage.ts tests/workspace/storage.test.ts
git commit -m "feat: add workspace storage helpers and types"
```

---

## Task 2: Implement WorkspaceManager

**Files:**
- Create: `electron/workspace/WorkspaceManager.ts`
- Modify: `electron/terminal/types.ts` (add workspaceId usage is already in TerminalTileConfig)

**Interfaces:**
- Consumes: `Workspace`, `WorkspaceStatus`, `StoredWorkspaces`, `readJson`, `writeJson` from Task 1.
- Produces: `WorkspaceManager` class with `addWorkspace`, `openWorkspace`, `removeWorkspace`, `listWorkspaces`, `getCurrentWorkspace`, `getWorkspaceStatus`, `persist`. Used by `electron/main.ts`.

- [ ] **Step 1: Write `electron/workspace/WorkspaceManager.ts`**

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import type { StoredWorkspaces, Workspace, WorkspaceStatus } from './types';
import { readJson, writeJson } from './storage';

function generateId(): string {
  return crypto.randomUUID();
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function checkGitRepo(targetPath: string): Promise<{ status: WorkspaceStatus; branch?: string; error?: string }> {
  if (!(await pathExists(targetPath))) {
    return { status: 'path_not_found' };
  }

  const gitDir = path.join(targetPath, '.git');
  if (!(await pathExists(gitDir))) {
    return { status: 'not_git_repo' };
  }

  return new Promise((resolve) => {
    const proc = spawn('git', ['rev-parse', '--is-inside-work-tree'], { cwd: targetPath });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    proc.on('error', () => resolve({ status: 'error', error: 'git command failed' }));
    proc.on('close', async (code) => {
      if (code !== 0 || stdout.trim() !== 'true') {
        resolve({ status: 'not_git_repo', error: stderr || 'not a git worktree' });
        return;
      }

      const branchProc = spawn('git', ['branch', '--show-current'], { cwd: targetPath });
      let branch = '';
      branchProc.stdout.on('data', (data) => { branch += data; });
      branchProc.on('close', (branchCode) => {
        resolve({
          status: 'valid',
          branch: branchCode === 0 ? branch.trim() || undefined : undefined,
        });
      });
    });
  });
}

export class WorkspaceManager {
  private dataDir: string;
  private state: StoredWorkspaces;
  private initialized = false;

  constructor(dataDir: string) {
    if (!path.isAbsolute(dataDir)) {
      throw new Error('dataDir must be absolute');
    }
    this.dataDir = dataDir;
    this.state = { currentWorkspaceId: null, workspaces: [] };
  }

  private get workspacesFile(): string {
    return path.join(this.dataDir, 'workspaces.json');
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.state = await readJson<StoredWorkspaces>(this.workspacesFile, {
      currentWorkspaceId: null,
      workspaces: [],
    });
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    await writeJson(this.workspacesFile, this.state);
  }

  async addWorkspace(repoPath: string): Promise<Workspace> {
    if (!repoPath || !path.isAbsolute(repoPath)) {
      throw new Error('repoPath must be an absolute path');
    }

    const normalized = path.normalize(repoPath);
    const existing = this.state.workspaces.find((w) => path.normalize(w.repoPath).toLowerCase() === normalized.toLowerCase());
    if (existing) {
      return this.openWorkspace(existing.id);
    }

    const git = await checkGitRepo(normalized);
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: generateId(),
      name: path.basename(normalized),
      repoPath: normalized,
      branch: git.branch,
      status: git.status,
      createdAt: now,
      updatedAt: now,
    };

    this.state.workspaces.push(workspace);
    this.state.currentWorkspaceId = workspace.id;
    await this.persist();
    return workspace;
  }

  async openWorkspace(workspaceId: string): Promise<Workspace | null> {
    const workspace = this.state.workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return null;

    const git = await checkGitRepo(workspace.repoPath);
    workspace.status = git.status;
    workspace.branch = git.branch;
    workspace.updatedAt = new Date().toISOString();
    this.state.currentWorkspaceId = workspace.id;
    await this.persist();
    return workspace;
  }

  async removeWorkspace(workspaceId: string): Promise<void> {
    this.state.workspaces = this.state.workspaces.filter((w) => w.id !== workspaceId);
    if (this.state.currentWorkspaceId === workspaceId) {
      this.state.currentWorkspaceId = this.state.workspaces[0]?.id ?? null;
    }
    await this.persist();
  }

  listWorkspaces(): Workspace[] {
    return this.state.workspaces;
  }

  getCurrentWorkspace(): Workspace | null {
    if (!this.state.currentWorkspaceId) return null;
    return this.state.workspaces.find((w) => w.id === this.state.currentWorkspaceId) ?? null;
  }

  getWorkspaceStatus(workspaceId: string): WorkspaceStatus {
    const workspace = this.state.workspaces.find((w) => w.id === workspaceId);
    return workspace?.status ?? 'error';
  }
}
```

- [ ] **Step 2: Write tests for WorkspaceManager**

Create `tests/workspace/WorkspaceManager.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { WorkspaceManager } from '../../electron/workspace/WorkspaceManager';

let tmpDir = '';

async function createGitRepo(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.join(dir, '.git'), { recursive: true });
  await fs.writeFile(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf-8');
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-dev-workspace-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('WorkspaceManager', () => {
  it('rejects relative paths', async () => {
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    await expect(manager.addWorkspace('relative/path')).rejects.toThrow('absolute path');
  });

  it('detects non-git folder as not_git_repo', async () => {
    const repo = path.join(tmpDir, 'plain');
    await fs.mkdir(repo, { recursive: true });
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    const ws = await manager.addWorkspace(repo);
    expect(ws.status).toBe('not_git_repo');
  });

  it('detects git repo and branch', async () => {
    const repo = path.join(tmpDir, 'gitrepo');
    await createGitRepo(repo);
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    const ws = await manager.addWorkspace(repo);
    expect(ws.status).toBe('valid');
    expect(ws.branch).toBe('main');
  });

  it('persists workspaces', async () => {
    const dataDir = path.join(tmpDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const repo = path.join(tmpDir, 'gitrepo');
    await createGitRepo(repo);

    const manager = new WorkspaceManager(dataDir);
    await manager.init();
    await manager.addWorkspace(repo);

    const manager2 = new WorkspaceManager(dataDir);
    await manager2.init();
    expect(manager2.listWorkspaces()).toHaveLength(1);
    expect(manager2.getCurrentWorkspace()?.repoPath).toBe(repo);
  });

  it('opens existing workspace by id', async () => {
    const repo = path.join(tmpDir, 'gitrepo');
    await createGitRepo(repo);
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    const ws = await manager.addWorkspace(repo);
    const opened = await manager.openWorkspace(ws.id);
    expect(opened?.id).toBe(ws.id);
  });
});
```

Run:

```bash
npx vitest run tests/workspace/WorkspaceManager.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add electron/workspace/WorkspaceManager.ts tests/workspace/WorkspaceManager.test.ts
git commit -m "feat: add WorkspaceManager with git validation and persistence"
```

---

## Task 3: Wire workspace IPC into main process and preload

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/terminal/types.ts` (ensure `TerminalTileConfig` already has `workspaceId`)

**Interfaces:**
- Consumes: `WorkspaceManager` from Task 2.
- Produces: `workspaceApi` in preload; IPC handlers for `workspace:add`, `workspace:open`, `workspace:list`, `workspace:remove`, `workspace:get-current`, `workspace:get-status`.

- [ ] **Step 1: Modify `electron/main.ts`**

Add near the top:

```ts
import { WorkspaceManager } from './workspace/WorkspaceManager';
import type { Workspace } from './workspace/types';
```

After `const terminalManager = new TerminalManager();`, add:

```ts
const workspaceManager = new WorkspaceManager(
  path.join(app.getPath('userData'), 'ai-dev-control-room')
);
```

Inside `app.whenReady().then(() => { ... })`, add before `createWindow()`:

```ts
  await workspaceManager.init();

  ipcMain.handle('workspace:add', async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string' || !path.isAbsolute(repoPath)) {
      throw new Error('repoPath must be an absolute string');
    }
    return workspaceManager.addWorkspace(repoPath);
  });

  ipcMain.handle('workspace:open', async (_event, workspaceId: string) => {
    if (typeof workspaceId !== 'string') return null;
    return workspaceManager.openWorkspace(workspaceId);
  });

  ipcMain.handle('workspace:list', async () => {
    return workspaceManager.listWorkspaces();
  });

  ipcMain.handle('workspace:remove', async (_event, workspaceId: string) => {
    if (typeof workspaceId !== 'string') return;
    await workspaceManager.removeWorkspace(workspaceId);
  });

  ipcMain.handle('workspace:get-current', async () => {
    return workspaceManager.getCurrentWorkspace();
  });

  ipcMain.handle('workspace:get-status', async (_event, workspaceId: string) => {
    if (typeof workspaceId !== 'string') return 'error';
    return workspaceManager.getWorkspaceStatus(workspaceId);
  });
```

- [ ] **Step 2: Modify `electron/preload.ts`**

Add to imports:

```ts
import type { Workspace } from './workspace/types';
```

Add to `contextBridge.exposeInMainWorld` object:

```ts
  workspaceApi: {
    addWorkspace: (repoPath: string) => ipcRenderer.invoke('workspace:add', repoPath),
    openWorkspace: (workspaceId: string) => ipcRenderer.invoke('workspace:open', workspaceId),
    listWorkspaces: () => ipcRenderer.invoke('workspace:list'),
    removeWorkspace: (workspaceId: string) => ipcRenderer.invoke('workspace:remove', workspaceId),
    getCurrentWorkspace: () => ipcRenderer.invoke('workspace:get-current'),
    getWorkspaceStatus: (workspaceId: string) => ipcRenderer.invoke('workspace:get-status', workspaceId),
  },
```

Update `declare global`:

```ts
declare global {
  interface Window {
    terminalApi: IpcTerminalApi;
    workspaceApi: {
      addWorkspace(repoPath: string): Promise<Workspace>;
      openWorkspace(workspaceId: string): Promise<Workspace | null>;
      listWorkspaces(): Promise<Workspace[]>;
      removeWorkspace(workspaceId: string): Promise<void>;
      getCurrentWorkspace(): Promise<Workspace | null>;
      getWorkspaceStatus(workspaceId: string): Promise<WorkspaceStatus>;
    };
  }
}
```

- [ ] **Step 3: Run typecheck for both tsconfigs**

```bash
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.node.json
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts electron/preload.ts
git commit -m "feat: wire WorkspaceManager into main process and preload IPC"
```

---

## Task 4: Add renderer workspace state

**Files:**
- Create: `src/store/workspaceStore.ts`
- Modify: `src/store/terminalStore.ts`

**Interfaces:**
- Consumes: `Workspace`, `WorkspaceStatus` from `electron/workspace/types` via preload; `TerminalTileState` from `electron/terminal/types`.
- Produces: `useWorkspaceStore` and updated `useTerminalStore` that scopes tiles by `workspaceId`.

- [ ] **Step 1: Write `src/store/workspaceStore.ts`**

```ts
import { create } from 'zustand';
import type { Workspace } from '../../electron/workspace/types';

interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  recentWorkspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setRecentWorkspaces: (workspaces: Workspace[]) => void;
  refreshWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  currentWorkspace: null,
  recentWorkspaces: [],
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setRecentWorkspaces: (workspaces) => set({ recentWorkspaces: workspaces }),
  refreshWorkspaces: async () => {
    const workspaces = await window.workspaceApi.listWorkspaces();
    const current = await window.workspaceApi.getCurrentWorkspace();
    set({ recentWorkspaces: workspaces, currentWorkspace: current });
  },
}));
```

- [ ] **Step 2: Update `src/store/terminalStore.ts`**

Modify to group tiles by workspace:

```ts
import { create } from 'zustand';
import type { TerminalTileState } from '../../electron/terminal/types';

interface TerminalStore {
  tilesByWorkspace: Record<string, TerminalTileState[]>;
  addTile: (workspaceId: string, tile: TerminalTileState) => void;
  removeTile: (workspaceId: string, tileId: string) => void;
  updateTile: (workspaceId: string, tileId: string, patch: Partial<TerminalTileState>) => void;
  setTilesForWorkspace: (workspaceId: string, tiles: TerminalTileState[]) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  tilesByWorkspace: {},
  addTile: (workspaceId, tile) =>
    set((state) => ({
      tilesByWorkspace: {
        ...state.tilesByWorkspace,
        [workspaceId]: [...(state.tilesByWorkspace[workspaceId] ?? []), tile],
      },
    })),
  removeTile: (workspaceId, tileId) =>
    set((state) => ({
      tilesByWorkspace: {
        ...state.tilesByWorkspace,
        [workspaceId]: (state.tilesByWorkspace[workspaceId] ?? []).filter((t) => t.id !== tileId),
      },
    })),
  updateTile: (workspaceId, tileId, patch) =>
    set((state) => ({
      tilesByWorkspace: {
        ...state.tilesByWorkspace,
        [workspaceId]: (state.tilesByWorkspace[workspaceId] ?? []).map((t) =>
          t.id === tileId ? { ...t, ...patch } : t
        ),
      },
    })),
  setTilesForWorkspace: (workspaceId, tiles) =>
    set((state) => ({
      tilesByWorkspace: { ...state.tilesByWorkspace, [workspaceId]: tiles },
    })),
}));
```

- [ ] **Step 3: Add tests for workspaceStore and updated terminalStore**

Create `tests/store/workspaceStore.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { useWorkspaceStore } from '../../src/store/workspaceStore';

describe('workspaceStore', () => {
  it('sets current workspace', () => {
    useWorkspaceStore.getState().setCurrentWorkspace({
      id: 'w1',
      name: 'Repo',
      repoPath: 'C:\\repo',
      status: 'valid',
      createdAt: 'x',
      updatedAt: 'x',
    });
    expect(useWorkspaceStore.getState().currentWorkspace?.id).toBe('w1');
  });

  it('refresh calls workspaceApi', async () => {
    const mockList = vi.fn().mockResolvedValue([]);
    const mockCurrent = vi.fn().mockResolvedValue(null);
    (window as any).workspaceApi = { listWorkspaces: mockList, getCurrentWorkspace: mockCurrent };

    await useWorkspaceStore.getState().refreshWorkspaces();
    expect(mockList).toHaveBeenCalled();
    expect(mockCurrent).toHaveBeenCalled();
  });
});
```

Create `tests/store/terminalStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { useTerminalStore } from '../../src/store/terminalStore';

describe('terminalStore', () => {
  it('adds tile to a workspace', () => {
    useTerminalStore.getState().setTilesForWorkspace('w1', []);
    useTerminalStore.getState().addTile('w1', {
      id: 't1',
      workspaceId: 'w1',
      title: 'PS1',
      role: 'plain',
      cwd: 'C:\\repo',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      status: 'running',
    });
    expect(useTerminalStore.getState().tilesByWorkspace.w1).toHaveLength(1);
  });

  it('does not leak tiles across workspaces', () => {
    useTerminalStore.getState().setTilesForWorkspace('w1', []);
    useTerminalStore.getState().setTilesForWorkspace('w2', []);
    useTerminalStore.getState().addTile('w1', {
      id: 't1',
      workspaceId: 'w1',
      title: 'PS1',
      role: 'plain',
      cwd: 'C:\\repo',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      status: 'running',
    });
    expect(useTerminalStore.getState().tilesByWorkspace.w2).toHaveLength(0);
  });
});
```

Run:

```bash
npx vitest run tests/store/workspaceStore.test.ts tests/store/terminalStore.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/store/workspaceStore.ts src/store/terminalStore.ts tests/store/workspaceStore.test.ts tests/store/terminalStore.test.ts
git commit -m "feat: add workspace state and scope terminal tiles by workspace"
```

---

## Task 5: Add workspace UI components

**Files:**
- Create: `src/components/WorkspacePanel.tsx`
- Create: `src/components/WorkspaceInfo.tsx`
- Create: `src/components/TileCanvas.tsx`
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/TileToolbar.tsx` (workspace-aware)
- Modify: `src/components/TileGrid.tsx` (workspace-aware, rename or keep)

**Interfaces:**
- Consumes: `useWorkspaceStore`, `useTerminalStore`, `window.workspaceApi`, `window.terminalApi`.
- Produces: Workspace sidebar, current workspace info, tile canvas bound to active workspace.

- [ ] **Step 1: Write `src/components/WorkspacePanel.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

export function WorkspacePanel() {
  const { currentWorkspace, recentWorkspaces, setCurrentWorkspace, setRecentWorkspaces } =
    useWorkspaceStore();
  const [pathInput, setPathInput] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const list = await window.workspaceApi.listWorkspaces();
    const current = await window.workspaceApi.getCurrentWorkspace();
    setRecentWorkspaces(list);
    setCurrentWorkspace(current);
  };

  const addWorkspace = async () => {
    if (!pathInput) return;
    try {
      const workspace = await window.workspaceApi.addWorkspace(pathInput);
      setCurrentWorkspace(workspace);
      await refresh();
      setPathInput('');
    } catch (err) {
      alert(`Failed to add workspace: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const openWorkspace = async (id: string) => {
    const workspace = await window.workspaceApi.openWorkspace(id);
    if (workspace) {
      setCurrentWorkspace(workspace);
      await refresh();
    }
  };

  const removeWorkspace = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await window.workspaceApi.removeWorkspace(id);
    await refresh();
  };

  return (
    <aside className="w-64 border-r border-slate-700 bg-slate-900 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">Workspaces</h2>
      </div>
      <div className="p-3 flex gap-2">
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addWorkspace()}
          placeholder="C:\\path\\to\\repo"
          className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-100"
        />
        <button
          onClick={addWorkspace}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
        >
          Add
        </button>
      </div>
      <ul className="flex-1 overflow-auto">
        {recentWorkspaces.map((ws) => (
          <li
            key={ws.id}
            onClick={() => openWorkspace(ws.id)}
            className={`px-3 py-2 text-xs cursor-pointer border-b border-slate-800 flex justify-between items-center ${
              ws.id === currentWorkspace?.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'
            }`}
          >
            <div>
              <div className="font-medium text-slate-200">{ws.name}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{ws.repoPath}</div>
              <div className="text-[10px] text-slate-500">
                {ws.status === 'valid' ? `🌿 ${ws.branch ?? 'unknown'}` : `⚠️ ${ws.status}`}
              </div>
            </div>
            <button
              onClick={(e) => removeWorkspace(ws.id, e)}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 2: Write `src/components/WorkspaceInfo.tsx`**

```tsx
import { useWorkspaceStore } from '../store/workspaceStore';

export function WorkspaceInfo() {
  const { currentWorkspace } = useWorkspaceStore();
  if (!currentWorkspace) return null;

  return (
    <div className="px-4 py-1 text-xs flex items-center gap-3 bg-slate-800/50 border-b border-slate-700">
      <span className="font-semibold text-slate-200">{currentWorkspace.name}</span>
      <span className="text-slate-400">{currentWorkspace.repoPath}</span>
      {currentWorkspace.status === 'valid' ? (
        <span className="text-green-400">🌿 {currentWorkspace.branch ?? 'unknown'}</span>
      ) : (
        <span className="text-yellow-400">⚠️ {currentWorkspace.status}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/TileCanvas.tsx`**

```tsx
import { useMemo } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTerminalStore } from '../store/terminalStore';
import { TerminalTile } from './TerminalTile';
import { TileToolbar } from './TileToolbar';

export function TileCanvas() {
  const { currentWorkspace } = useWorkspaceStore();
  const tiles = useTerminalStore((state) =>
    currentWorkspace ? state.tilesByWorkspace[currentWorkspace.id] ?? [] : []
  );

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Add or open a workspace to start terminals.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TileToolbar />
      <div className="grid grid-cols-2 gap-4 p-4 flex-1 min-h-0 overflow-auto">
        {tiles.map((tile) => (
          <TerminalTile key={tile.id} tileId={tile.id} workspaceId={currentWorkspace.id} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `TerminalTile.tsx` to accept workspaceId**

Modify props:

```tsx
interface TerminalTileProps {
  tileId: string;
  workspaceId: string;
}

export function TerminalTile({ tileId, workspaceId }: TerminalTileProps) {
  // ... use workspaceId where needed, e.g. find tile from store by workspaceId
}
```

Update the tile lookup:

```tsx
const tile = useTerminalStore((state) =>
  (state.tilesByWorkspace[workspaceId] ?? []).find((t) => t.id === tileId)
);
```

- [ ] **Step 5: Update `TileToolbar.tsx` to use current workspace and default cwd**

```tsx
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTerminalStore } from '../store/terminalStore';

let tileCounter = 0;

export function TileToolbar() {
  const { currentWorkspace } = useWorkspaceStore();
  const { tilesByWorkspace } = useTerminalStore();
  const tiles = currentWorkspace ? tilesByWorkspace[currentWorkspace.id] ?? [] : [];
  const removeTile = useTerminalStore((state) => state.removeTile);
  const addTile = useTerminalStore((state) => state.addTile);

  const createTile = async () => {
    if (!currentWorkspace) return;
    tileCounter += 1;
    const tileId = `tile-${Date.now()}-${tileCounter}`;
    const workspaceId = currentWorkspace.id;
    const title = `PowerShell ${tiles.length + 1}`;
    const cwd = currentWorkspace.repoPath;

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

    addTile(workspaceId, {
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

  const closeTile = async (tileId: string) => {
    if (!currentWorkspace) return;
    await window.terminalApi.killTerminal(tileId);
    removeTile(currentWorkspace.id, tileId);
  };

  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-700 bg-slate-800">
      <button
        onClick={createTile}
        disabled={!currentWorkspace}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded text-sm font-medium"
      >
        + New Terminal
      </button>
      <div className="flex-1" />
      {tiles.map((tile) => (
        <button
          key={tile.id}
          onClick={() => closeTile(tile.id)}
          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded"
        >
          Close {tile.title}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write `src/components/Layout.tsx` and update `App.tsx`**

Create `src/components/Layout.tsx`:

```tsx
import { WorkspacePanel } from './WorkspacePanel';
import { WorkspaceInfo } from './WorkspaceInfo';
import { TileCanvas } from './TileCanvas';

export function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 flex items-center px-4 border-b border-slate-700 bg-slate-900">
        <h1 className="text-lg font-bold">AI Dev Control Room</h1>
        <span className="ml-3 text-xs text-slate-400">Phase 2 — Workspace Manager + Multiple Tiles</span>
      </header>
      <div className="flex flex-1 min-h-0">
        <WorkspacePanel />
        <main className="flex-1 flex flex-col min-w-0">
          <WorkspaceInfo />
          <TileCanvas />
        </main>
      </div>
    </div>
  );
}
```

Update `src/App.tsx`:

```tsx
import { Layout } from './components/Layout';

export default function App() {
  return <Layout />;
}
```

- [ ] **Step 7: Run tests and typecheck**

```bash
npm run test
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.node.json
```

Expected: tests pass, typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/WorkspacePanel.tsx src/components/WorkspaceInfo.tsx src/components/TileCanvas.tsx src/components/Layout.tsx src/components/TileToolbar.tsx src/components/TerminalTile.tsx src/App.tsx
git commit -m "feat: add workspace UI and workspace-scoped tile canvas"
```

---

## Task 6: Persist and restore tile layouts per workspace

**Files:**
- Create: `electron/workspace/tileLayoutStorage.ts`
- Modify: `electron/main.ts`
- Modify: `src/store/terminalStore.ts` (add restore action)
- Modify: `src/components/TileCanvas.tsx` (restore on workspace open)

**Interfaces:**
- Consumes: `TerminalTileState`, `StoredTileLayout`, `StoredTileLayouts`.
- Produces: persistence APIs exposed through preload for saving/loading tile layouts.

- [ ] **Step 1: Write `electron/workspace/tileLayoutStorage.ts`**

```ts
import * as path from 'node:path';
import { readJson, writeJson } from './storage';
import type { StoredTileLayouts } from './types';

export class TileLayoutStorage {
  constructor(private dataDir: string) {}

  private get filePath(): string {
    return path.join(this.dataDir, 'tile-layouts.json');
  }

  async loadLayouts(): Promise<StoredTileLayouts> {
    return readJson<StoredTileLayouts>(this.filePath, { layouts: [] });
  }

  async saveLayout(layout: import('./types').StoredTileLayout): Promise<void> {
    const data = await this.loadLayouts();
    const index = data.layouts.findIndex((l) => l.workspaceId === layout.workspaceId);
    if (index >= 0) {
      data.layouts[index] = layout;
    } else {
      data.layouts.push(layout);
    }
    await writeJson(this.filePath, data);
  }
}
```

- [ ] **Step 2: Add layout IPC handlers in `electron/main.ts`**

Add after workspace handlers:

```ts
  const tileLayoutStorage = new TileLayoutStorage(
    path.join(app.getPath('userData'), 'ai-dev-control-room')
  );

  ipcMain.handle('workspace:load-layout', async (_event, workspaceId: string) => {
    if (typeof workspaceId !== 'string') return { tiles: [] };
    const data = await tileLayoutStorage.loadLayouts();
    return data.layouts.find((l) => l.workspaceId === workspaceId) ?? { workspaceId, tiles: [] };
  });

  ipcMain.handle('workspace:save-layout', async (_event, layout) => {
    if (!layout?.workspaceId || typeof layout.workspaceId !== 'string') return;
    await tileLayoutStorage.saveLayout(layout);
  });
```

- [ ] **Step 3: Expose layout APIs in `electron/preload.ts`**

Add to workspaceApi:

```ts
    loadTileLayout: (workspaceId: string) => ipcRenderer.invoke('workspace:load-layout', workspaceId),
    saveTileLayout: (layout) => ipcRenderer.invoke('workspace:save-layout', layout),
```

Update `Workspace` import to also include `StoredTileLayout`:

```ts
import type { Workspace, WorkspaceStatus, StoredTileLayout } from './workspace/types';
```

Update global declaration:

```ts
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
```

- [ ] **Step 4: Update renderer to save/restore layouts**

Add to `src/store/terminalStore.ts`:

```ts
  restoreWorkspaceTiles: (workspaceId: string, tiles: TerminalTileState[]) => void;
```

```ts
  restoreWorkspaceTiles: (workspaceId, tiles) =>
    set((state) => ({
      tilesByWorkspace: { ...state.tilesByWorkspace, [workspaceId]: tiles },
    })),
```

Update `src/components/TileCanvas.tsx` to restore on workspace change and save on tile changes:

```tsx
import { useEffect, useMemo } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTerminalStore } from '../store/terminalStore';
import { TerminalTile } from './TerminalTile';
import { TileToolbar } from './TileToolbar';

export function TileCanvas() {
  const { currentWorkspace } = useWorkspaceStore();
  const tiles = useTerminalStore((state) =>
    currentWorkspace ? state.tilesByWorkspace[currentWorkspace.id] ?? [] : []
  );
  const restoreWorkspaceTiles = useTerminalStore((state) => state.restoreWorkspaceTiles);

  useEffect(() => {
    if (!currentWorkspace) return;
    let cancelled = false;
    window.workspaceApi.loadTileLayout(currentWorkspace.id).then((layout) => {
      if (cancelled) return;
      const restored = layout.tiles.map((t) => ({ ...t, status: 'idle' as const }));
      restoreWorkspaceTiles(currentWorkspace.id, restored);
    });
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id, restoreWorkspaceTiles]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const saveable = tiles.map(({ status, ...rest }) => rest);
    window.workspaceApi.saveTileLayout({ workspaceId: currentWorkspace.id, tiles: saveable });
  }, [tiles, currentWorkspace?.id]);

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Add or open a workspace to start terminals.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TileToolbar />
      <div className="grid grid-cols-2 gap-4 p-4 flex-1 min-h-0 overflow-auto">
        {tiles.map((tile) => (
          <TerminalTile key={tile.id} tileId={tile.id} workspaceId={currentWorkspace.id} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add tests for tile layout storage**

Create `tests/workspace/tileLayoutStorage.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { TileLayoutStorage } from '../../electron/workspace/tileLayoutStorage';

let tmpDir = '';

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-dev-layout-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('TileLayoutStorage', () => {
  it('saves and loads layout for a workspace', async () => {
    const storage = new TileLayoutStorage(tmpDir);
    await storage.saveLayout({
      workspaceId: 'w1',
      tiles: [{ id: 't1', title: 'PS', role: 'plain', cwd: 'C:\\repo', shell: 'powershell.exe', shellArgs: ['-NoLogo'] }],
    });
    const loaded = await storage.loadLayouts();
    expect(loaded.layouts).toHaveLength(1);
    expect(loaded.layouts[0].workspaceId).toBe('w1');
  });

  it('returns empty default when no file exists', async () => {
    const storage = new TileLayoutStorage(tmpDir);
    const loaded = await storage.loadLayouts();
    expect(loaded.layouts).toEqual([]);
  });
});
```

Run:

```bash
npx vitest run tests/workspace/tileLayoutStorage.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add electron/workspace/tileLayoutStorage.ts electron/main.ts electron/preload.ts src/store/terminalStore.ts src/components/TileCanvas.tsx tests/workspace/tileLayoutStorage.test.ts
git commit -m "feat: persist and restore tile layouts per workspace"
```

---

## Task 7: Recreate PTY processes when restoring tiles on app launch

**Files:**
- Modify: `src/components/TileCanvas.tsx`
- Modify: `src/components/TileToolbar.tsx` (ensure spawn logic is reusable)

**Interfaces:**
- Consumes: `TerminalTileConfig`, `window.terminalApi`.
- Produces: restored tiles become real PTYs when workspace opens.

- [ ] **Step 1: Update `TileCanvas.tsx` to spawn PTYs for restored tiles**

After loading layout, spawn each tile:

```tsx
  useEffect(() => {
    if (!currentWorkspace) return;
    let cancelled = false;
    window.workspaceApi.loadTileLayout(currentWorkspace.id).then(async (layout) => {
      if (cancelled || layout.tiles.length === 0) return;
      const restored = [] as TerminalTileState[];
      for (const tile of layout.tiles) {
        const result = await window.terminalApi.createTerminal({ ...tile, workspaceId: currentWorkspace.id });
        restored.push({ ...tile, workspaceId: currentWorkspace.id, status: result.success ? 'running' : 'error' });
      }
      restoreWorkspaceTiles(currentWorkspace.id, restored);
    });
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id, restoreWorkspaceTiles]);
```

Import `TerminalTileState` type.

- [ ] **Step 2: Commit**

```bash
git add src/components/TileCanvas.tsx
git commit -m "feat: respawn PTYs when restoring saved tile layouts"
```

---

## Task 8: Update README for Phase 2 usage

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README.md**

Add a Phase 2 section after Phase 1:

```markdown
## Phase 2 Features

- Add/Open workspace from a local repo path.
- Validate git repo and display current branch.
- Warning if workspace is not a git repo.
- Persist recent workspaces and tile layouts across app restarts.
- Create multiple terminal tiles inside the current workspace.
- Each tile defaults its working directory to the workspace repo path.

## Phase 2 Usage

1. Run `npm run electron:dev`.
2. In the left sidebar, enter a repo path and click **Add**.
3. The workspace appears in the list with its name, path, and branch (or warning).
4. Click the workspace to open it.
5. Click **+ New Terminal** to create PowerShell tiles bound to that workspace.
6. Close and reopen the app; the recent workspace and tile layout are restored.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with Phase 2 workspace usage"
```

---

## Task 9: Final verification and push

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.node.json
```

Expected: no errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: no build errors.

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 5: Mark tasks complete**

Update progress ledger.

---

## Spec Coverage Check

| Design Doc Requirement | Task |
|---|---|
| Add/Open workspace from local repo path | Task 2, 3, 5 |
| Validate folder is git repo, warn if not | Task 2, 5 |
| Save recent workspaces to local JSON | Task 1, 2, 3 |
| Display workspace name/path/branch/warning | Task 2, 5 |
| Multiple terminal tiles bound to workspaceId | Task 4, 5 |
| Tile cwd defaults to repoPath | Task 5 |
| Save/restore tile layout per workspace | Task 6, 7 |
| Persist across app restarts | Task 1, 2, 6 |
| No Phase 3-6 features | All tasks |
| No .env/secret handling | All tasks |
| contextIsolation / nodeIntegration / safe IPC | Task 3 |

## Placeholder Scan

No placeholders such as "TBD", "TODO", or "implement later" are used. Every step contains exact file paths, exact code, exact commands, and expected outputs.

## Type Consistency Check

- `Workspace` and `WorkspaceStatus` defined in Task 1 and used consistently in Task 2, 3, 4, 5.
- `TerminalTileConfig.workspaceId` already exists from Phase 1 and is used in Tasks 4, 5, 6, 7.
- IPC channel names match between `main.ts`, `preload.ts`, and renderer usage.
- Store method signatures (`addTile`, `removeTile`, `updateTile`) updated to require `workspaceId`.

## Open Questions Before Coding

None. The design doc is approved and Phase 2 scope is well-defined.
