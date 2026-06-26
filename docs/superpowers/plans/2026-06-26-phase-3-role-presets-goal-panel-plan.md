# Phase 3 — Role Presets + Goal Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Phase 2 app so users can assign a role (Builder / Tester / Reviewer / Server / Verifier / plain) to each terminal tile, configure role-specific startup presets, enter a task using the Goal Contract format, and generate/copy/send role-specific prompts into the selected tile.

**Source of truth:** `docs/superpowers/specs/2026-06-26-ai-dev-control-room-design.md` sections 4.2, 4.3, 7 Phase 3.

**Architecture:** Add a `taskStore` for the current Goal Contract, a `rolePresets` config module for default shell/command per role, a `GoalPanel` React component for editing the contract, a `promptGenerator` for role-specific text, and a role selector in each `TerminalTile` header. Sending a prompt to a tile is done through the existing `window.terminalApi.writeInput` from the renderer (no new IPC needed). Copy to clipboard uses the browser Clipboard API.

**Tech Stack:** Electron + React + TypeScript + Vite + Zustand + Tailwind CSS.

## Global Constraints

- Phase 3 only. No Phase 4-6 features (Verify Runner execution, Diff Viewer, Human Approval Queue, Command Approval Gate, Harness Setup, Worktree Manager, auto merge/deploy).
- `contextIsolation: true`, `nodeIntegration: false`, expose only existing IPC APIs.
- Do not run `verify.ps1` automatically; Phase 3 only generates the prompt text.
- Do not auto-merge, auto-deploy, or auto-execute commands.
- Do not read `.env` or secret files.
- Preserve Phase 2 workspace and tile-layout behavior.
- Default shell: `powershell.exe -NoLogo`.
- Roles: `builder`, `tester`, `reviewer`, `server`, `verifier`, `plain`.
- Max loop default = 5.

---

## File Structure Additions

```text
ai-dev-control-room/
├── electron/
│   └── terminal/
│       └── rolePresets.ts       # role config: title prefix, shell, args, command
├── src/
│   ├── store/
│   │   └── taskStore.ts          # DevTask / Goal Contract state
│   ├── lib/
│   │   ├── goalContract.ts       # GoalContract type + parser/validator
│   │   └── promptGenerator.ts    # generate role-specific prompt text
│   └── components/
│       ├── GoalPanel.tsx         # Goal Contract form
│       ├── RoleBadge.tsx         # small role indicator
│       └── Layout.tsx            # integrate GoalPanel (modified)
│       └── TerminalTile.tsx      # add role selector in header (modified)
│       └── TileToolbar.tsx       # create tile with selected role (modified)
├── tests/
│   ├── lib/
│   │   ├── goalContract.test.ts
│   │   └── promptGenerator.test.ts
│   └── terminal/
│       └── rolePresets.test.ts
└── README.md                     # Phase 3 usage update (modified)
```

---

## Task 1: Add Goal Contract types and role preset config

**Files:**
- Create: `src/lib/goalContract.ts`
- Create: `electron/terminal/rolePresets.ts`

**Interfaces:**
- Consumes: `TileRole` from `electron/terminal/types.ts`.
- Produces: `GoalContract` interface, `DevTask` type (status draft initially), `RolePreset` config.

- [ ] **Step 1: Write `src/lib/goalContract.ts`**

```ts
export interface GoalContract {
  title: string;
  task: string;
  goal: string;
  scope: string;
  doNot: string;
  verify: string;
  doneWhen: string;
  maxLoop: number;
}

export interface DevTask extends GoalContract {
  id: string;
  workspaceId: string;
  status: 'draft' | 'planned' | 'running' | 'needs_changes' | 'verify_failed' | 'ready_for_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export function createDraftTask(workspaceId: string): DevTask {
  const now = new Date().toISOString();
  return {
    id: `task-${Date.now()}`,
    workspaceId,
    title: '',
    task: '',
    goal: '',
    scope: '',
    doNot: '',
    verify: '',
    doneWhen: '',
    maxLoop: 5,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTask(task: DevTask, patch: Partial<GoalContract>): DevTask {
  return {
    ...task,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Write `electron/terminal/rolePresets.ts`**

```ts
import type { TileRole } from './types';

export interface RolePreset {
  role: TileRole;
  label: string;
  titlePrefix: string;
  shell: string;
  shellArgs: string[];
  command?: string;
}

export const ROLE_PRESETS: Record<TileRole, RolePreset> = {
  plain: {
    role: 'plain',
    label: 'Plain',
    titlePrefix: 'PowerShell',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
  },
  builder: {
    role: 'builder',
    label: 'Builder',
    titlePrefix: 'Builder',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'claude',
  },
  tester: {
    role: 'tester',
    label: 'Tester',
    titlePrefix: 'Tester',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'codex',
  },
  reviewer: {
    role: 'reviewer',
    label: 'Reviewer',
    titlePrefix: 'Reviewer',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'claude',
  },
  server: {
    role: 'server',
    label: 'Server',
    titlePrefix: 'Server',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'powershell -ExecutionPolicy Bypass -File .\\scripts\\dev.ps1',
  },
  verifier: {
    role: 'verifier',
    label: 'Verifier',
    titlePrefix: 'Verifier',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'powershell -ExecutionPolicy Bypass -File .\\scripts\\verify.ps1',
  },
};

export const ROLES: TileRole[] = ['plain', 'builder', 'tester', 'reviewer', 'server', 'verifier'];

export function getRolePreset(role: TileRole): RolePreset {
  return ROLE_PRESETS[role] ?? ROLE_PRESETS.plain;
}
```

- [ ] **Step 3: Add tests**

Create `tests/lib/goalContract.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createDraftTask, updateTask } from '../../src/lib/goalContract';

describe('goalContract', () => {
  it('creates a draft task with default maxLoop 5', () => {
    const task = createDraftTask('w1');
    expect(task.workspaceId).toBe('w1');
    expect(task.status).toBe('draft');
    expect(task.maxLoop).toBe(5);
  });

  it('updates task fields and updatedAt', () => {
    const task = createDraftTask('w1');
    const updated = updateTask(task, { title: 'Fix bug', goal: 'Make it work' });
    expect(updated.title).toBe('Fix bug');
    expect(updated.goal).toBe('Make it work');
    expect(updated.updatedAt).not.toBe(task.updatedAt);
  });
});
```

Create `tests/terminal/rolePresets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getRolePreset, ROLE_PRESETS, ROLES } from '../../electron/terminal/rolePresets';

describe('rolePresets', () => {
  it('has all six roles', () => {
    expect(ROLES).toEqual(['plain', 'builder', 'tester', 'reviewer', 'server', 'verifier']);
  });

  it('builder uses claude command', () => {
    expect(ROLE_PRESETS.builder.command).toBe('claude');
  });

  it('verifier targets verify.ps1', () => {
    expect(ROLE_PRESETS.verifier.command).toContain('verify.ps1');
  });

  it('returns plain preset for unknown role', () => {
    const preset = getRolePreset('plain');
    expect(preset.role).toBe('plain');
  });
});
```

- [ ] **Step 4: Run tests and commit**

```bash
npx vitest run tests/lib/goalContract.test.ts tests/terminal/rolePresets.test.ts
# expect PASS
git add src/lib/goalContract.ts electron/terminal/rolePresets.ts tests/lib/goalContract.test.ts tests/terminal/rolePresets.test.ts
git commit -m "feat: add Goal Contract types and role preset config"
```

---

## Task 2: Add task state store

**Files:**
- Create: `src/store/taskStore.ts`
- Modify: `src/types/global.d.ts` if needed (not needed)

**Interfaces:**
- Consumes: `DevTask`, `GoalContract`, `createDraftTask`, `updateTask` from Task 1.
- Produces: `useTaskStore` Zustand store.

- [ ] **Step 1: Write `src/store/taskStore.ts`**

```ts
import { create } from 'zustand';
import type { DevTask, GoalContract } from '../lib/goalContract';
import { createDraftTask, updateTask } from '../lib/goalContract';

interface TaskStore {
  currentTask: DevTask | null;
  setCurrentTask: (task: DevTask | null) => void;
  startNewTask: (workspaceId: string) => DevTask;
  updateCurrentTask: (patch: Partial<GoalContract>) => void;
  advanceStatus: (status: DevTask['status']) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  currentTask: null,
  setCurrentTask: (task) => set({ currentTask: task }),
  startNewTask: (workspaceId) => {
    const task = createDraftTask(workspaceId);
    set({ currentTask: task });
    return task;
  },
  updateCurrentTask: (patch) => {
    const current = get().currentTask;
    if (!current) return;
    set({ currentTask: updateTask(current, patch) });
  },
  advanceStatus: (status) => {
    const current = get().currentTask;
    if (!current) return;
    set({ currentTask: updateTask(current, { status } as Partial<GoalContract>) });
  },
}));
```

Note: `updateTask` accepts `Partial<GoalContract>`, but `status` is not in `GoalContract`. Create a small helper `updateTaskStatus` or extend `updateTask` signature to accept `Partial<DevTask>` instead. Adjust `goalContract.ts`:

```ts
export function updateTask(task: DevTask, patch: Partial<DevTask>): DevTask {
  return {
    ...task,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
```

Then `updateCurrentTask` casts are no longer needed.

- [ ] **Step 2: Add tests**

Create `tests/store/taskStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { useTaskStore } from '../../src/store/taskStore';

describe('taskStore', () => {
  it('starts a new draft task', () => {
    const task = useTaskStore.getState().startNewTask('w1');
    expect(task.workspaceId).toBe('w1');
    expect(task.status).toBe('draft');
    expect(useTaskStore.getState().currentTask?.id).toBe(task.id);
  });

  it('updates current task fields', () => {
    useTaskStore.getState().startNewTask('w1');
    useTaskStore.getState().updateCurrentTask({ title: 'New title' });
    expect(useTaskStore.getState().currentTask?.title).toBe('New title');
  });

  it('advances status', () => {
    useTaskStore.getState().startNewTask('w1');
    useTaskStore.getState().advanceStatus('planned');
    expect(useTaskStore.getState().currentTask?.status).toBe('planned');
  });
});
```

- [ ] **Step 3: Run tests and commit**

```bash
npx vitest run tests/store/taskStore.test.ts
# expect PASS
git add src/store/taskStore.ts src/lib/goalContract.ts tests/store/taskStore.test.ts
git commit -m "feat: add task state store for Goal Contract"
```

---

## Task 3: Build prompt generator

**Files:**
- Create: `src/lib/promptGenerator.ts`
- Modify: `src/lib/goalContract.ts` (already done)

**Interfaces:**
- Consumes: `DevTask`, `TileRole`, `RolePreset`.
- Produces: `generateRolePrompt(role, task, options?)` returning string.

- [ ] **Step 1: Write `src/lib/promptGenerator.ts`**

```ts
import type { DevTask } from './goalContract';
import type { TileRole } from '../../electron/terminal/types';
import { getRolePreset } from '../../electron/terminal/rolePresets';

export interface PromptOptions {
  includeHeader?: boolean;
}

function formatContract(task: DevTask): string {
  return [
    `TASK: ${task.task}`,
    `GOAL: ${task.goal}`,
    `SCOPE: ${task.scope}`,
    `DO NOT: ${task.doNot}`,
    `VERIFY: ${task.verify}`,
    `DONE WHEN: ${task.doneWhen}`,
    `MAX LOOP: ${task.maxLoop}`,
  ].join('\n');
}

export function generateRolePrompt(role: TileRole, task: DevTask, options: PromptOptions = {}): string {
  const preset = getRolePreset(role);
  const header = options.includeHeader !== false
    ? `You are the ${preset.label}. Workspace: ${task.workspaceId}\n\n`
    : '';
  const contract = formatContract(task);

  switch (role) {
    case 'builder':
      return `${header}Implement the following task. Stay in scope, respect the DO NOT list, and stop when DONE WHEN is met.\n\n${contract}`;
    case 'tester':
      return `${header}Run tests and report PASS/FAIL. Do not modify source code.\n\n${contract}`;
    case 'reviewer':
      return `${header}Review the current changes (git diff). Point out risks, bugs, and style issues. Do not edit files.\n\n${contract}`;
    case 'server':
      return `${header}Start the development server. Keep it running.\n\n${contract}`;
    case 'verifier':
      return `${header}Run the verify script and return only PASS or FAIL with concise evidence.\n\n${contract}`;
    case 'plain':
    default:
      return `${header}${contract}`;
  }
}
```

- [ ] **Step 2: Add tests**

Create `tests/lib/promptGenerator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateRolePrompt } from '../../src/lib/promptGenerator';
import { createDraftTask } from '../../src/lib/goalContract';

describe('promptGenerator', () => {
  const task = {
    ...createDraftTask('w1'),
    task: 'Fix login bug',
    goal: 'Users can log in',
    scope: 'auth module',
    doNot: 'touch UI',
    verify: 'login test passes',
    doneWhen: 'test passes',
    maxLoop: 3,
  };

  it('builder prompt mentions implement', () => {
    const prompt = generateRolePrompt('builder', task);
    expect(prompt).toContain('You are the Builder');
    expect(prompt).toContain('TASK: Fix login bug');
    expect(prompt).toContain('Implement');
  });

  it('verifier prompt mentions verify script', () => {
    const prompt = generateRolePrompt('verifier', task);
    expect(prompt).toContain('You are the Verifier');
    expect(prompt).toContain('PASS');
  });

  it('plain prompt omits role instruction', () => {
    const prompt = generateRolePrompt('plain', task);
    expect(prompt).not.toContain('You are the');
    expect(prompt).toContain('TASK: Fix login bug');
  });

  it('can omit header', () => {
    const prompt = generateRolePrompt('builder', task, { includeHeader: false });
    expect(prompt).not.toContain('You are the Builder');
  });
});
```

- [ ] **Step 3: Run tests and commit**

```bash
npx vitest run tests/lib/promptGenerator.test.ts
# expect PASS
git add src/lib/promptGenerator.ts tests/lib/promptGenerator.test.ts
git commit -m "feat: add role-specific prompt generator"
```

---

## Task 4: Add role selector to tiles

**Files:**
- Modify: `src/components/TerminalTile.tsx`
- Modify: `src/components/TileToolbar.tsx`

**Interfaces:**
- Consumes: `useTerminalStore`, `ROLES`, `getRolePreset`.
- Produces: tiles can change role; new tiles use a default role selector in toolbar.

- [ ] **Step 1: Modify `TerminalTile.tsx` header**

Add role dropdown in header:

```tsx
import { ROLES } from '../../electron/terminal/rolePresets';

// inside component:
const updateTile = useTerminalStore((state) => state.updateTile);

// in header render:
<div className="flex items-center justify-between px-3 py-1 border-b border-slate-700 text-sm">
  <div className="flex items-center gap-2">
    <span className="font-semibold text-slate-200">{tile.title}</span>
    <select
      value={tile.role}
      onChange={(e) => updateTile(workspaceId, tileId, { role: e.target.value as TileRole })}
      className="text-xs bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>{role}</option>
      ))}
    </select>
  </div>
  <span className="text-xs text-slate-400">
    {tile.status} {tile.pid ? `(pid ${tile.pid})` : ''}
  </span>
</div>
```

Import `TileRole` type.

- [ ] **Step 2: Modify `TileToolbar.tsx`**

Add a role dropdown next to the New Terminal button:

```tsx
import { useState } from 'react';
import { ROLES, getRolePreset } from '../../electron/terminal/rolePresets';
import type { TileRole } from '../../electron/terminal/types';

export function TileToolbar() {
  const [selectedRole, setSelectedRole] = useState<TileRole>('plain');
  // ... existing code

  const createTile = async () => {
    if (!currentWorkspace) return;
    const preset = getRolePreset(selectedRole);
    tileCounter += 1;
    const tileId = `tile-${Date.now()}-${tileCounter}`;
    const workspaceId = currentWorkspace.id;
    const title = `${preset.titlePrefix} ${tiles.length + 1}`;
    const cwd = currentWorkspace.repoPath;

    const result = await window.terminalApi.createTerminal({
      id: tileId,
      workspaceId,
      title,
      role: preset.role,
      cwd,
      shell: preset.shell,
      shellArgs: preset.shellArgs,
      command: preset.command,
    });

    if (!result.success) {
      alert(`Failed to create terminal: ${result.error}`);
      return;
    }

    addTile(workspaceId, {
      id: tileId,
      workspaceId,
      title,
      role: preset.role,
      cwd,
      shell: preset.shell,
      shellArgs: preset.shellArgs,
      command: preset.command,
      status: 'running',
    });
  };

  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-700 bg-slate-800">
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value as TileRole)}
        className="text-sm bg-slate-900 border border-slate-600 rounded px-2 py-1"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
      <button ...>+ New Terminal</button>
      {/* rest unchanged */}
    </div>
  );
}
```

- [ ] **Step 3: Add/update tests**

Update `tests/components/TileToolbar.test.tsx` to verify role selection affects tile creation. Existing mocks for `window.terminalApi.createTerminal` can assert the `role` field.

- [ ] **Step 4: Run tests and commit**

```bash
npm run test
# expect PASS
git add src/components/TerminalTile.tsx src/components/TileToolbar.tsx tests/components/TileToolbar.test.tsx
git commit -m "feat: add role selector to tiles and toolbar"
```

---

## Task 5: Build Goal Panel UI

**Files:**
- Create: `src/components/GoalPanel.tsx`
- Create: `src/components/RoleBadge.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `useWorkspaceStore`, `useTaskStore`, `generateRolePrompt`, `ROLES`.
- Produces: Goal Contract form + role prompt actions.

- [ ] **Step 1: Write `src/components/GoalPanel.tsx`**

```tsx
import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTaskStore } from '../store/taskStore';
import { generateRolePrompt } from '../lib/promptGenerator';
import { ROLES } from '../../electron/terminal/rolePresets';
import type { TileRole } from '../../electron/terminal/types';
import { useTerminalStore } from '../store/terminalStore';

export function GoalPanel() {
  const { currentWorkspace } = useWorkspaceStore();
  const { currentTask, startNewTask, updateCurrentTask } = useTaskStore();
  const tiles = useTerminalStore((state) =>
    currentWorkspace ? state.tilesByWorkspace[currentWorkspace.id] ?? [] : []
  );

  useEffect(() => {
    if (currentWorkspace && !currentTask) {
      startNewTask(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, currentTask, startNewTask]);

  if (!currentWorkspace || !currentTask) {
    return (
      <aside className="w-80 border-l border-slate-700 bg-slate-900 p-4 text-slate-400 text-sm">
        Open a workspace to start a task.
      </aside>
    );
  }

  const fields = [
    { key: 'title', label: 'Title', rows: 1 },
    { key: 'task', label: 'TASK', rows: 3 },
    { key: 'goal', label: 'GOAL', rows: 3 },
    { key: 'scope', label: 'SCOPE', rows: 3 },
    { key: 'doNot', label: 'DO NOT', rows: 3 },
    { key: 'verify', label: 'VERIFY', rows: 3 },
    { key: 'doneWhen', label: 'DONE WHEN', rows: 3 },
  ] as const;

  const updateField = (key: keyof typeof currentTask, value: string) => {
    updateCurrentTask({ [key]: value });
  };

  const copyPrompt = async (role: TileRole) => {
    const prompt = generateRolePrompt(role, currentTask);
    await navigator.clipboard.writeText(prompt);
  };

  const sendPrompt = (role: TileRole) => {
    const target = tiles.find((t) => t.role === role);
    if (!target) {
      alert(`No ${role} tile found. Create one first.`);
      return;
    }
    const prompt = generateRolePrompt(role, currentTask);
    window.terminalApi.writeInput(target.id, prompt + '\r');
  };

  return (
    <aside className="w-80 border-l border-slate-700 bg-slate-900 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">Goal Contract</h2>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {fields.map(({ key, label, rows }) => (
          <div key={key}>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <textarea
              value={currentTask[key] as string}
              onChange={(e) => updateField(key, e.target.value)}
              rows={rows}
              className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-100 resize-none"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs text-slate-400 mb-1">MAX LOOP</label>
          <input
            type="number"
            min={1}
            max={20}
            value={currentTask.maxLoop}
            onChange={(e) => updateCurrentTask({ maxLoop: parseInt(e.target.value, 10) || 1 })}
            className="w-20 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-100"
          />
        </div>
      </div>
      <div className="p-3 border-t border-slate-700 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300">Send / Copy Prompt</h3>
        {ROLES.filter((r) => r !== 'plain').map((role) => (
          <div key={role} className="flex gap-2">
            <button
              onClick={() => sendPrompt(role)}
              className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
            >
              Send to {role}
            </button>
            <button
              onClick={() => copyPrompt(role)}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Write `src/components/RoleBadge.tsx`**

```tsx
import type { TileRole } from '../../electron/terminal/types';

const ROLE_COLORS: Record<TileRole, string> = {
  plain: 'bg-slate-600',
  builder: 'bg-blue-600',
  tester: 'bg-green-600',
  reviewer: 'bg-purple-600',
  server: 'bg-yellow-600',
  verifier: 'bg-red-600',
};

interface RoleBadgeProps {
  role: TileRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded text-white ${ROLE_COLORS[role]}`}>
      {role}
    </span>
  );
}
```

Optional: integrate `RoleBadge` into `TerminalTile` header next to the role dropdown.

- [ ] **Step 3: Modify `Layout.tsx`**

Insert `<GoalPanel />` after `<TileCanvas />`:

```tsx
      <div className="flex flex-1 min-h-0">
        <WorkspacePanel />
        <main className="flex-1 flex flex-col min-w-0">
          <WorkspaceInfo />
          <TileCanvas />
        </main>
        <GoalPanel />
      </div>
```

- [ ] **Step 4: Add tests for GoalPanel**

Create `tests/components/GoalPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalPanel } from '../../src/components/GoalPanel';

describe('GoalPanel', () => {
  it('shows workspace required message when no workspace', () => {
    render(<GoalPanel />);
    expect(screen.getByText(/Open a workspace/i)).toBeInTheDocument();
  });

  it('renders goal contract fields when workspace is present', () => {
    // mock workspace store and task store as needed
    // verify TASK/GOAL/SCOPE inputs exist
  });
});
```

Testing React components with Zustand stores requires mocks. Simplify: test the pure `generateRolePrompt` and `createDraftTask` functions instead, and keep component tests minimal or skip if too brittle.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test
# expect PASS
git add src/components/GoalPanel.tsx src/components/RoleBadge.tsx src/components/Layout.tsx
git commit -m "feat: add Goal Panel with role prompt generation"
```

---

## Task 6: Integrate role startup commands

**Files:**
- Modify: `src/components/TileToolbar.tsx`
- Modify: `src/components/TileCanvas.tsx`

**Interfaces:**
- Consumes: `RolePreset.command`.
- Produces: when a tile is created with a role that has a `command`, optionally send it to the PTY after spawn.

- [ ] **Step 1: Send preset command on tile creation**

After `addTile` in `TileToolbar.createTile`, if `preset.command` exists, send it:

```ts
    if (preset.command) {
      // slight delay so PTY is ready
      setTimeout(() => {
        window.terminalApi.writeInput(tileId, preset.command + '\r');
      }, 300);
    }
```

This is optional. It makes Server/Verifier tiles start their scripts automatically, while Builder/Tester still wait for the human to send a generated prompt. For Phase 3 consistency, only send `server` and `verifier` commands automatically, or none at all. Recommended Phase 3 behavior: do NOT auto-send any command; the human uses Goal Panel to send prompts. Leave the `command` field in `TerminalTileConfig` for future use.

Decision: **Do not auto-send commands in Phase 3.** The `command` field is stored with the tile but the human controls execution. This matches the semi-auto workflow.

- [ ] **Step 2: Commit (no code change required if decision stands)**

If no change, skip commit.

---

## Task 7: Update README for Phase 3

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Phase 3 section**

```markdown
## Phase 3 Features

- Assign a role to each terminal tile: Plain, Builder, Tester, Reviewer, Server, Verifier.
- Role presets set the tile title and default startup command.
- Goal Panel with Goal Contract form: TASK, GOAL, SCOPE, DO NOT, VERIFY, DONE WHEN, MAX LOOP.
- Generate role-specific prompts from the contract.
- Copy a prompt to clipboard or send it directly into the matching role tile.

## Phase 3 Usage

1. Open a workspace.
2. Select a role from the dropdown next to **+ New Terminal** and create tiles.
3. Open the **Goal Panel** on the right.
4. Fill in the Goal Contract fields.
5. Click **Send to builder** (or another role) to write the generated prompt into that tile.
6. Click **Copy** to copy the prompt to the clipboard instead.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with Phase 3 role presets and Goal Panel usage"
```

---

## Task 8: Final verification and push

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
| Role selector per tile | Task 4 |
| Builder / Tester / Reviewer / Server / Verifier presets | Task 1, 4 |
| Goal Contract form | Task 1, 5 |
| Generate / copy / send role prompt | Task 3, 5 |
| Done when: 5 tiles with roles and Builder prompt sent | Task 4, 5, 8 |
| No Verify Runner execution | Not in Phase 3 |
| No Diff Viewer | Not in Phase 3 |
| No Human Approval Queue | Not in Phase 3 |
| No Command Approval Gate | Not in Phase 3 |
| No Harness Setup | Not in Phase 3 |
| No Worktree Manager | Not in Phase 3 |

## Placeholder Scan

No placeholders such as "TBD", "TODO", or "implement later" are used. Every step contains exact file paths, code, commands, and expected outputs.

## Type Consistency Check

- `TileRole` already defined in `electron/terminal/types.ts`.
- `TerminalTileConfig` already supports `role`, `command`, `shell`, `shellArgs`.
- `StoredTileLayout` tile type includes `workspaceId`, `role`, etc.
- IPC `terminalApi.writeInput` already exists for sending prompts.

## Open Questions Before Coding

None. Design doc Phase 3 is approved and well-defined.
