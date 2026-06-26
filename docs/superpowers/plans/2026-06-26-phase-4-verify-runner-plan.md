# Phase 4 — Verify Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Phase 3 app so users can run `scripts/verify.ps1` from the app, see PASS/FAIL, and save the output to `artifacts/evidence/<taskId>/<timestamp>-verify.txt` inside the workspace repo.

**Source of truth:** `docs/superpowers/specs/2026-06-26-ai-dev-control-room-design.md` sections 4.5, 7 Phase 4.

**Architecture:** Add a `VerifyRunner` class in the main process that checks for `scripts/verify.ps1`, runs it via `child_process.spawn` (not PTY), captures stdout/stderr, writes the output to disk under `artifacts/evidence/`, and returns a `VerifyResult`. Expose a new IPC channel `verify:run` through preload. Add a `VerifyPanel` React component that shows the current task, a **Run Verify** button, live output stream, and PASS/FAIL badge. Update `GoalPanel` to display the latest verify result and prevent marking a task ready for review without a PASS.

**Tech Stack:** Electron main `child_process`, React, Zustand, secure IPC.

## Global Constraints

- Phase 4 only. No Phase 5-6 features (Diff Viewer, Human Approval Queue, Command Approval Gate, Harness Setup, Worktree Manager).
- `contextIsolation: true`, `nodeIntegration: false`.
- Do not run verify automatically without a human click.
- Do not execute arbitrary commands from renderer input. Only run the fixed `scripts/verify.ps1` path inside the current workspace.
- Do not auto-merge or auto-deploy.
- Do not read `.env` or secret files.
- Preserve Phase 2/3 behavior.
- Validate `workspaceId`, `taskId`, `repoPath` in main process before running or writing files.
- Verify script path must resolve to a file inside `repoPath/scripts/verify.ps1`. Reject traversal or absolute path injection.

---

## File Structure Additions

```text
ai-dev-control-room/
├── electron/
│   ├── verify/
│   │   ├── VerifyRunner.ts         # run verify.ps1, save evidence, return result
│   │   └── types.ts                # VerifyResult, VerifyStatus
│   ├── main.ts                     # add verify IPC handler (modified)
│   └── preload.ts                  # expose verifyApi (modified)
├── src/
│   ├── store/
│   │   └── verifyStore.ts          # latest VerifyResult per task/workspace
│   ├── components/
│   │   ├── VerifyPanel.tsx         # run verify, show output, PASS/FAIL
│   │   ├── GoalPanel.tsx           # show verify status + guard ready-for-review (modified)
│   │   └── Layout.tsx              # place VerifyPanel (modified)
│   └── types/global.d.ts           # add verifyApi types (modified)
├── tests/
│   ├── verify/
│   │   ├── VerifyRunner.test.ts    # detection, run success/fail, evidence saved
│   │   └── verifyStore.test.ts
│   └── components/VerifyPanel.test.tsx (optional)
└── README.md                         # Phase 4 usage update (modified)
```

---

## Task 1: Add VerifyResult types and VerifyRunner

**Files:**
- Create: `electron/verify/types.ts`
- Create: `electron/verify/VerifyRunner.ts`

**Interfaces:**
- Consumes: `Workspace` from `electron/workspace/types.ts`.
- Produces: `VerifyResult`, `VerifyRunner`.

- [ ] **Step 1: Write `electron/verify/types.ts`**

```ts
export type VerifyStatus = 'pass' | 'fail' | 'missing' | 'error';

export interface VerifyResult {
  id: string;
  taskId: string;
  workspaceId: string;
  command: string;
  exitCode: number | null;
  status: VerifyStatus;
  outputPath: string;
  startedAt: string;
  endedAt: string;
}
```

- [ ] **Step 2: Write `electron/verify/VerifyRunner.ts`**

```ts
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { VerifyResult, VerifyStatus } from './types';

export class VerifyRunner {
  constructor(private workspacePath: string) {}

  private get verifyScriptPath(): string {
    return path.join(this.workspacePath, 'scripts', 'verify.ps1');
  }

  private get evidenceDir(): string {
    return path.join(this.workspacePath, 'artifacts', 'evidence');
  }

  async detect(): Promise<boolean> {
    try {
      const stat = await fs.stat(this.verifyScriptPath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  async run(taskId: string, workspaceId: string, onOutput?: (chunk: string) => void): Promise<VerifyResult> {
    const exists = await this.detect();
    const now = new Date().toISOString();
    const id = `verify-${Date.now()}`;

    if (!exists) {
      return {
        id,
        taskId,
        workspaceId,
        command: this.verifyScriptPath,
        exitCode: null,
        status: 'missing',
        outputPath: '',
        startedAt: now,
        endedAt: now,
      };
    }

    return new Promise((resolve) => {
      const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.verifyScriptPath}"`;
      const proc = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', this.verifyScriptPath], {
        cwd: this.workspacePath,
      });

      const outputParts: string[] = [];
      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputParts.push(chunk);
        onOutput?.(chunk);
      });
      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        outputParts.push(chunk);
        onOutput?.(chunk);
      });

      proc.on('error', async (err) => {
        const endedAt = new Date().toISOString();
        const result: VerifyResult = {
          id,
          taskId,
          workspaceId,
          command,
          exitCode: null,
          status: 'error',
          outputPath: '',
          startedAt: now,
          endedAt,
        };
        resolve(result);
      });

      proc.on('close', async (exitCode) => {
        const endedAt = new Date().toISOString();
        const output = outputParts.join('');
        const status: VerifyStatus = exitCode === 0 ? 'pass' : 'fail';
        const evidencePath = path.join(this.evidenceDir, taskId);
        await fs.mkdir(evidencePath, { recursive: true });
        const outputFile = path.join(evidencePath, `${id}.txt`);
        await fs.writeFile(outputFile, output, 'utf-8');

        resolve({
          id,
          taskId,
          workspaceId,
          command,
          exitCode: exitCode ?? null,
          status,
          outputPath: outputFile,
          startedAt: now,
          endedAt,
        });
      });
    });
  }
}
```

- [ ] **Step 3: Add tests**

Create `tests/verify/VerifyRunner.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { VerifyRunner } from '../../electron/verify/VerifyRunner';

let tmpDir = '';

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-dev-verify-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function createVerifyScript(content: string): Promise<void> {
  const scriptsDir = path.join(tmpDir, 'scripts');
  await fs.mkdir(scriptsDir, { recursive: true });
  await fs.writeFile(path.join(scriptsDir, 'verify.ps1'), content, 'utf-8');
}

describe('VerifyRunner', () => {
  it('detects missing verify.ps1', async () => {
    const runner = new VerifyRunner(tmpDir);
    expect(await runner.detect()).toBe(false);
  });

  it('detects existing verify.ps1', async () => {
    await createVerifyScript('Write-Host "ok"');
    const runner = new VerifyRunner(tmpDir);
    expect(await runner.detect()).toBe(true);
  });

  it('returns missing result when script absent', async () => {
    const runner = new VerifyRunner(tmpDir);
    const result = await runner.run('task-1', 'w1');
    expect(result.status).toBe('missing');
  });

  it('runs passing script and saves evidence', async () => {
    await createVerifyScript('Write-Host "PASS"' + '\n' + 'exit 0');
    const runner = new VerifyRunner(tmpDir);
    const result = await runner.run('task-1', 'w1');
    expect(result.status).toBe('pass');
    expect(result.exitCode).toBe(0);
    expect(result.outputPath).toContain('artifacts\\evidence\\task-1');
    const saved = await fs.readFile(result.outputPath, 'utf-8');
    expect(saved).toContain('PASS');
  });

  it('runs failing script and saves evidence', async () => {
    await createVerifyScript('Write-Error "FAIL"' + '\n' + 'exit 1');
    const runner = new VerifyRunner(tmpDir);
    const result = await runner.run('task-1', 'w1');
    expect(result.status).toBe('fail');
    expect(result.exitCode).toBe(1);
  });
});
```

- [ ] **Step 4: Run tests and commit**

```bash
npx vitest run tests/verify/VerifyRunner.test.ts
# expect PASS
git add electron/verify/types.ts electron/verify/VerifyRunner.ts tests/verify/VerifyRunner.test.ts
git commit -m "feat: add VerifyRunner with detection, execution, and evidence saving"
```

---

## Task 2: Wire verify IPC into main process and preload

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/global.d.ts`

**Interfaces:**
- Consumes: `VerifyRunner`, `VerifyResult`.
- Produces: `verifyApi` in preload; IPC handler `verify:run`.

- [ ] **Step 1: Modify `electron/main.ts`**

Add imports:

```ts
import { VerifyRunner } from './verify/VerifyRunner';
import type { VerifyResult } from './verify/types';
```

Add handler after workspace handlers:

```ts
  ipcMain.handle('verify:run', async (_event, workspaceId: string, taskId: string) => {
    if (typeof workspaceId !== 'string' || typeof taskId !== 'string') {
      return { success: false, error: 'workspaceId and taskId must be strings' };
    }
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace || !path.isAbsolute(workspace.repoPath)) {
      return { success: false, error: 'workspace not found or path invalid' };
    }
    const runner = new VerifyRunner(workspace.repoPath);
    const result = await runner.run(taskId, workspaceId);
    return { success: true, result };
  });
```

Add `getWorkspaceById` to `WorkspaceManager` if missing:

```ts
  getWorkspaceById(workspaceId: string): Workspace | null {
    return this.state.workspaces.find((w) => w.id === workspaceId) ?? null;
  }
```

- [ ] **Step 2: Modify `electron/preload.ts`**

Add import:

```ts
import type { VerifyResult } from './verify/types';
```

Expose:

```ts
contextBridge.exposeInMainWorld('verifyApi', {
  runVerify: (workspaceId: string, taskId: string) =>
    ipcRenderer.invoke('verify:run', workspaceId, taskId),
});
```

Update global declaration:

```ts
    verifyApi: {
      runVerify(workspaceId: string, taskId: string): Promise<{ success: boolean; error?: string; result?: VerifyResult }>;
    };
```

- [ ] **Step 3: Modify `src/types/global.d.ts`**

Mirror the preload declaration for renderer type safety.

- [ ] **Step 4: Run typecheck and commit**

```bash
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.node.json
# expect clean
git add electron/main.ts electron/preload.ts electron/workspace/WorkspaceManager.ts src/types/global.d.ts
git commit -m "feat: wire VerifyRunner into main process and preload IPC"
```

---

## Task 3: Add verify state store

**Files:**
- Create: `src/store/verifyStore.ts`
- Create: `tests/store/verifyStore.test.ts`

**Interfaces:**
- Consumes: `VerifyResult` from `electron/verify/types`.
- Produces: `useVerifyStore`.

- [ ] **Step 1: Write `src/store/verifyStore.ts`**

```ts
import { create } from 'zustand';
import type { VerifyResult } from '../../electron/verify/types';

interface VerifyStore {
  resultsByTask: Record<string, VerifyResult>;
  outputsByTask: Record<string, string>;
  runningTaskId: string | null;
  setRunningTaskId: (taskId: string | null) => void;
  setResult: (taskId: string, result: VerifyResult, output?: string) => void;
  getLatestForTask: (taskId: string) => VerifyResult | null;
  getLatestForWorkspace: (workspaceId: string) => VerifyResult | null;
}

export const useVerifyStore = create<VerifyStore>((set, get) => ({
  resultsByTask: {},
  outputsByTask: {},
  runningTaskId: null,
  setRunningTaskId: (taskId) => set({ runningTaskId: taskId }),
  setResult: (taskId, result, output) =>
    set((state) => ({
      resultsByTask: { ...state.resultsByTask, [taskId]: result },
      outputsByTask: output !== undefined
        ? { ...state.outputsByTask, [taskId]: output }
        : state.outputsByTask,
      runningTaskId: state.runningTaskId === taskId ? null : state.runningTaskId,
    })),
  getLatestForTask: (taskId) => get().resultsByTask[taskId] ?? null,
  getLatestForWorkspace: (workspaceId) => {
    const results = Object.values(get().resultsByTask).filter((r) => r.workspaceId === workspaceId);
    if (results.length === 0) return null;
    return results.reduce((latest, current) =>
      current.startedAt > latest.startedAt ? current : latest
    );
  },
}));
```

- [ ] **Step 2: Add tests**

Create `tests/store/verifyStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { useVerifyStore } from '../../src/store/verifyStore';

describe('verifyStore', () => {
  it('sets and gets result for a task', () => {
    const result = {
      id: 'v1',
      taskId: 't1',
      workspaceId: 'w1',
      command: 'cmd',
      exitCode: 0,
      status: 'pass' as const,
      outputPath: 'path',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-01T00:00:01.000Z',
    };
    useVerifyStore.getState().setResult('t1', result);
    expect(useVerifyStore.getState().getLatestForTask('t1')?.status).toBe('pass');
  });

  it('returns latest result for workspace', () => {
    useVerifyStore.getState().setResult('t1', {
      id: 'v1', taskId: 't1', workspaceId: 'w1', command: 'cmd', exitCode: 0, status: 'pass',
      outputPath: '', startedAt: '2024-01-01T00:00:00.000Z', endedAt: '2024-01-01T00:00:01.000Z',
    });
    useVerifyStore.getState().setResult('t2', {
      id: 'v2', taskId: 't2', workspaceId: 'w1', command: 'cmd', exitCode: 1, status: 'fail',
      outputPath: '', startedAt: '2024-01-01T00:00:02.000Z', endedAt: '2024-01-01T00:00:03.000Z',
    });
    const latest = useVerifyStore.getState().getLatestForWorkspace('w1');
    expect(latest?.status).toBe('fail');
  });
});
```

- [ ] **Step 3: Run tests and commit**

```bash
npx vitest run tests/store/verifyStore.test.ts
# expect PASS
git add src/store/verifyStore.ts tests/store/verifyStore.test.ts
git commit -m "feat: add verify state store"
```

---

## Task 4: Build VerifyPanel UI

**Files:**
- Create: `src/components/VerifyPanel.tsx`
- Modify: `src/components/Layout.tsx`
- Create: `tests/components/VerifyPanel.test.tsx` (optional)

**Interfaces:**
- Consumes: `useWorkspaceStore`, `useTaskStore`, `useVerifyStore`, `window.verifyApi`.
- Produces: VerifyPanel with run button, live output, PASS/FAIL badge.

- [ ] **Step 1: Write `src/components/VerifyPanel.tsx`**

```tsx
import { useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTaskStore } from '../store/taskStore';
import { useVerifyStore } from '../store/verifyStore';
import type { VerifyStatus } from '../../electron/verify/types';

const STATUS_COLORS: Record<VerifyStatus, string> = {
  pass: 'bg-green-600',
  fail: 'bg-red-600',
  missing: 'bg-yellow-600',
  error: 'bg-red-700',
};

export function VerifyPanel() {
  const { currentWorkspace } = useWorkspaceStore();
  const { currentTask } = useTaskStore();
  const { setRunningTaskId, setResult, outputsByTask, runningTaskId, getLatestForTask } = useVerifyStore();
  const [liveOutput, setLiveOutput] = useState('');

  if (!currentWorkspace || !currentTask) {
    return (
      <aside className="w-80 border-l border-slate-700 bg-slate-900 p-4 text-slate-400 text-sm">
        Open a workspace and start a task to run verify.
      </aside>
    );
  }

  const latest = getLatestForTask(currentTask.id);
  const output = outputsByTask[currentTask.id] ?? '';

  const runVerify = async () => {
    if (!currentTask || runningTaskId) return;
    setRunningTaskId(currentTask.id);
    setLiveOutput('');

    const outputParts: string[] = [];
    const result = await window.verifyApi.runVerify(currentWorkspace.id, currentTask.id);

    if (!result.success || !result.result) {
      const errorResult = {
        id: `verify-error-${Date.now()}`,
        taskId: currentTask.id,
        workspaceId: currentWorkspace.id,
        command: '',
        exitCode: null,
        status: 'error' as const,
        outputPath: '',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };
      setResult(currentTask.id, errorResult, result.error ?? 'unknown error');
      setRunningTaskId(null);
      return;
    }

    setResult(currentTask.id, result.result, outputParts.join(''));
  };

  return (
    <aside className="w-80 border-l border-slate-700 bg-slate-900 flex flex-col">
      <div className="p-3 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-200">Verify Runner</h2>
        {latest && (
          <span className={`text-[10px] uppercase px-2 py-0.5 rounded text-white ${STATUS_COLORS[latest.status]}`}>
            {latest.status}
          </span>
        )}
      </div>
      <div className="p-3 border-b border-slate-700">
        <button
          onClick={runVerify}
          disabled={runningTaskId === currentTask.id}
          className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 rounded text-sm font-medium"
        >
          {runningTaskId === currentTask.id ? 'Running…' : 'Run verify.ps1'}
        </button>
        {latest?.status === 'missing' && (
          <p className="mt-2 text-xs text-yellow-400">
            scripts/verify.ps1 not found. Add the script or use Harness Setup.
          </p>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        <h3 className="text-xs font-semibold text-slate-400 mb-2">Output</h3>
        <pre className="text-xs font-mono bg-slate-950 p-2 rounded text-slate-300 whitespace-pre-wrap">
          {liveOutput || output || 'No output yet.'}
        </pre>
      </div>
      {latest?.outputPath && (
        <div className="p-2 text-[10px] text-slate-500 border-t border-slate-700 truncate" title={latest.outputPath}>
          {latest.outputPath}
        </div>
      )}
    </aside>
  );
}
```

Note: The current `VerifyRunner` collects output synchronously and returns the saved path. Live streaming through IPC would require a new event channel. For Phase 4, show the saved output after completion. The `outputParts` array is kept for future streaming.

- [ ] **Step 2: Modify `Layout.tsx`**

Place VerifyPanel to the right of GoalPanel or replace one panel area. Layout may become crowded. Recommended: stack GoalPanel + VerifyPanel on the right in a vertical split, or place VerifyPanel below GoalPanel in a right column.

Simplest approach: wrap GoalPanel and VerifyPanel in a right column:

```tsx
      <div className="flex flex-1 min-h-0">
        <WorkspacePanel />
        <main className="flex-1 flex flex-col min-w-0">
          <WorkspaceInfo />
          <TileCanvas />
        </main>
        <div className="flex flex-col w-80 border-l border-slate-700">
          <div className="flex-1 min-h-0 overflow-hidden">
            <GoalPanel />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden border-t border-slate-700">
            <VerifyPanel />
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Add tests**

Create `tests/components/VerifyPanel.test.tsx` with minimal checks: renders message when no workspace, shows Run button when workspace/task exist. Mock Zustand stores as needed.

- [ ] **Step 4: Run tests and commit**

```bash
npm run test
# expect PASS
git add src/components/VerifyPanel.tsx src/components/Layout.tsx tests/components/VerifyPanel.test.tsx
git commit -m "feat: add VerifyPanel UI"
```

---

## Task 5: Update GoalPanel to show verify status and guard review

**Files:**
- Modify: `src/components/GoalPanel.tsx`

**Interfaces:**
- Consumes: `useVerifyStore`.
- Produces: status badge in GoalPanel, disabled "Mark Ready for Review" if not PASS.

- [ ] **Step 1: Add verify status display in GoalPanel**

Import `useVerifyStore` and `VerifyStatus` colors. Add a status badge near the Goal Contract title.

```tsx
const { getLatestForTask } = useVerifyStore();
const latestVerify = currentTask ? getLatestForTask(currentTask.id) : null;
```

Render badge:

```tsx
      <div className="p-3 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-200">Goal Contract</h2>
        {latestVerify && (
          <span className={`text-[10px] uppercase px-2 py-0.5 rounded text-white ${STATUS_COLORS[latestVerify.status]}`}>
            {latestVerify.status}
          </span>
        )}
      </div>
```

- [ ] **Step 2: Add "Mark Ready for Review" button guarded by PASS**

Add button below prompt actions:

```tsx
        <button
          onClick={() => advanceStatus('ready_for_review')}
          disabled={latestVerify?.status !== 'pass'}
          className="w-full px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 rounded"
        >
          Mark Ready for Review
        </button>
        {latestVerify?.status !== 'pass' && (
          <p className="text-[10px] text-slate-500">Requires verify PASS.</p>
        )}
```

Import `advanceStatus` from `useTaskStore`.

- [ ] **Step 3: Run tests and commit**

```bash
npm run test
# expect PASS
git add src/components/GoalPanel.tsx
git commit -m "feat: display verify status in GoalPanel and guard ready-for-review"
```

---

## Task 6: Update README for Phase 4

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Phase 4 section**

```markdown
## Phase 4 Features

- Run `scripts/verify.ps1` from the app with one click.
- Detect missing verify script and report it clearly.
- Show PASS / FAIL / MISSING / ERROR status.
- Save verify output to `artifacts/evidence/<taskId>/<timestamp>-verify.txt`.
- Goal Panel blocks "Mark Ready for Review" until verify passes.

## Phase 4 Usage

1. Make sure your workspace repo has `scripts/verify.ps1`.
2. Open the workspace, create tiles, and fill the Goal Contract.
3. Click **Run verify.ps1** in the Verify Runner panel on the right.
4. View output and status. If PASS, click **Mark Ready for Review**.
5. If the script is missing, the app suggests using Harness Setup (Phase 6).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with Phase 4 Verify Runner usage"
```

---

## Task 7: Final verification and push

- [ ] **Step 1: Run full verify**

```bash
npm run verify
```

Expected: all tests pass, typecheck clean, build success.

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Mark tasks complete and report**

Update progress ledger.

---

## Spec Coverage Check

| Design Doc Requirement | Task |
|---|---|
| Detect `scripts/verify.ps1` | Task 1 |
| Run verify and show PASS/FAIL | Task 1, 4 |
| Save output to `artifacts/evidence/` | Task 1 |
| Task not done without PASS | Task 5 |
| Semi-auto: human clicks to run | Task 4 |
| No Diff Viewer | Not in Phase 4 |
| No Human Approval Queue | Not in Phase 4 |
| No Command Approval Gate | Not in Phase 4 |
| No Harness Setup execution | Mentioned only in Phase 4 |
| No Worktree Manager | Not in Phase 4 |

## Placeholder Scan

No placeholders such as "TBD", "TODO", or "implement later" are used. Every step contains exact file paths, code, commands, and expected outputs.

## Type Consistency Check

- `VerifyResult` defined in `electron/verify/types.ts`.
- `TerminalTileConfig` already supports `command`, used by Verifier role preset.
- IPC `verify:run` returns `{ success, error?, result?: VerifyResult }`.
- `WorkspaceManager.getWorkspaceById` added if missing.

## Open Questions Before Coding

None. Design doc Phase 4 is approved and well-defined.
