# AI Dev Control Room — Design Document

> Date: 2026-06-26  
> Status: Approved  
> Format: Product + build spec for Claude Code implementation.

---

## 1. Problem & Goal

**Problem:** A single AI coding agent is hard to control. It may claim "done" without verification, edit outside scope, auto-merge, run destructive commands, or skip tests.

**Goal:** Build a local desktop app — **AI Dev Control Room** — that lets a human coordinate multiple AI agents through multiple terminal tiles inside the same workspace, following a standard goal loop, with verifier evidence, diff review, and final human approval.

---

## 2. Scope

### 2.1 In MVP

- Open a local workspace / git repo.
- Create multiple terminal tiles per workspace.
- Assign a role to each tile: **Builder, Tester, Reviewer, Server, Verifier**.
- Goal Panel to enter a task using the **Goal Contract** format.
- Generate / copy / send role-specific prompts into a terminal tile.
- Run `scripts/verify.ps1`, show **PASS/FAIL**, and save evidence.
- View `git status` / `git diff` in a Diff Viewer.
- Human Approval Queue with actions: **Approve / Request Changes / Reject / Mark Merged Manually**.
- Max loop default = 5, Anti-Spin stop if the same error repeats twice.
- **Semi-auto workflow**: the app assists by opening terminals, generating prompts, running verify, showing diff, and saving evidence. The human still clicks to send the task, run verify, request changes, and give final approval. The app never runs the whole loop automatically.
- **Command Approval Gate** for dangerous commands triggered by the app (MVP scope; full interception of user-typed PTY commands is P1/P2).
- **Harness Check / Harness Setup**: detect missing harness files and offer to scaffold them. Never modify existing project logic during harness setup.

### 2.2 Post-MVP (P1)

- **Worktree Manager**: each agent/task may run on its own worktree/branch to avoid multiple agents editing the same folder.
- Browser tile.
- Cloud sandbox / Crabbox.
- Composio, Google Workspace, sales workflow.
- Multi-user / remote agent execution.
- Auto merge/deploy.

---

## 3. Architecture

```text
┌─────────────────────────────────────────────┐
│ Electron Main Process                       │
│ ├── Workspace Manager                       │
│ ├── Terminal / PTY Manager                  │
│ ├── Worktree Manager        (P1)            │
│ ├── Git Manager                             │
│ ├── Verify Runner                           │
│ ├── File / Log / Evidence Manager           │
│ ├── Harness Setup Manager                   │
│ ├── Command Approval Gate   (MVP: app-only) │
│ └── IPC API                                 │
├─────────────────────────────────────────────┤
│ React Renderer                              │
│ ├── Workspace Screen                        │
│ ├── Tile Canvas                             │
│ ├── Terminal Tile                           │
│ ├── Goal Panel                              │
│ ├── Agent Role Panel                        │
│ ├── Diff Viewer                             │
│ ├── Log Viewer                              │
│ ├── Harness Setup Panel                     │
│ └── Human Approval Panel                    │
├─────────────────────────────────────────────┤
│ Local Project Repo                          │
│ ├── AGENTS.md                               │
│ ├── CLAUDE.md                               │
│ ├── scripts/verify.ps1                      │
│ ├── scripts/dev.ps1                         │
│ ├── loops/dev-fix-loop/                     │
│ │   ├── CONTRACT.md                         │
│ │   ├── RUNBOOK.md                          │
│ │   └── VERIFIER.md                         │
│ ├── artifacts/                              │
│ │   ├── tasks/                              │
│ │   ├── reports/                            │
│ │   └── evidence/                           │
│ └── logs/GLOBAL_WORK_LOG.md                 │
└─────────────────────────────────────────────┘
```

### 3.1 Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Electron |
| Frontend | React + TypeScript |
| Bundler | Vite |
| Terminal UI | xterm.js |
| PTY backend | node-pty |
| Realtime transport | Electron IPC |
| State | Zustand or Redux Toolkit |
| Styling | Tailwind CSS |
| Git wrapper | simple-git or child_process |
| Storage | Local JSON first; SQLite later if needed |

---

## 4. Core Components & Data Flow

### 4.1 Workspace Manager

- Add / open workspace from a local repo path.
- Validate that the folder is a git repo (warn if not).
- Save recent workspaces list to local storage.
- Display workspace name, repo path, current branch, status.

**Data type:**

```ts
type Workspace = {
  id: string;
  name: string;
  repoPath: string;
  createdAt: string;
  updatedAt: string;
};
```

### 4.2 Terminal Tile Manager

- Each tile owns one real PTY via node-pty.
- Properties: id, workspaceId, title, role, cwd, shell path, startup command, status (idle | running | stopped | error).
- Stream stdout/stderr realtime to the renderer through Electron IPC.
- Send user keystrokes/input from xterm.js to the PTY.
- Allow restart, rename, close, and layout persistence.

**Windows terminal presets:**

| Role | Default shell | Startup command |
|---|---|---|
| Default | `powershell.exe -NoLogo` | — |
| Builder | `powershell.exe -NoLogo` | `claude` |
| Tester | `powershell.exe -NoLogo` | `codex` or `powershell` |
| Reviewer | `powershell.exe -NoLogo` | `claude` or `codex` |
| Server | `powershell.exe -NoLogo` | `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1` |
| Verifier | `powershell.exe -NoLogo` | `powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1` |

- Allow user override of the path to `claude` / `codex` if they are not in PATH.
- Allow custom command per tile.

**Implementation note — running PowerShell via node-pty:**

A terminal tile may either:

1. Spawn an interactive PowerShell shell, then write the startup command into it.
2. Or spawn PowerShell directly with the command as arguments.

Prefer interactive shell for agent tiles such as Builder, Tester, Reviewer.  
Prefer direct command execution for Verify Runner and other app-triggered commands.

Example options:

```text
Option A — Open shell then send command:
shell = powershell.exe
args = ["-NoLogo"]
send command = powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1

Option B — Spawn command directly:
shell = powershell.exe
args = ["-NoLogo", "-ExecutionPolicy", "Bypass", "-File", ".\\scripts\\verify.ps1"]
```

**Data type:**

```ts
type TileRole = "builder" | "tester" | "reviewer" | "server" | "verifier" | "plain";

type TerminalTile = {
  id: string;
  workspaceId: string;
  title: string;
  role: TileRole;
  cwd: string;
  shell: string;
  command?: string;
  status: "idle" | "running" | "stopped" | "error";
  createdAt: string;
};
```

### 4.3 Goal Panel

Task input uses the **Goal Contract** format:

- **TASK**
- **GOAL**
- **SCOPE**
- **DO NOT**
- **VERIFY**
- **DONE WHEN**
- **MAX LOOP**

The user fills the form, then the app can:

1. Generate a role-specific prompt.
2. Copy it to clipboard.
3. Or "send" it by writing the prompt into the selected terminal tile.

**Data type:**

```ts
type DevTask = {
  id: string;
  workspaceId: string;
  title: string;
  task: string;
  goal: string;
  scope: string;
  doNot: string;
  verify: string;
  doneWhen: string;
  maxLoop: number;
  status:
    | "draft"
    | "planned"
    | "running"
    | "needs_changes"
    | "verify_failed"
    | "ready_for_review"
    | "approved"
    | "rejected";
  createdAt: string;
  updatedAt: string;
};
```

### 4.4 Loop Manager

Standard loop stages:

```text
Draft → Planning → Building → Testing → Fixing → Verifying → Reviewing → Ready for Human Approval → Approved / Rejected
```

Behavior:

- **Semi-auto**: the app tracks the current stage, iteration, and status. The human clicks to advance or retry each step.
- If verify fails, the app suggests returning to **Fixing**. The human decides whether to continue.
- If iteration exceeds `MAX LOOP` (default 5), the app stops and asks for human review.
- If the same error repeats twice, the app triggers **Anti-Spin** stop.

**Data type:**

```ts
type LoopStage =
  | "draft"
  | "planning"
  | "building"
  | "testing"
  | "fixing"
  | "verifying"
  | "reviewing"
  | "ready_for_human_approval"
  | "approved"
  | "rejected"
  | "reporting";

type LoopRun = {
  id: string;
  taskId: string;
  iteration: number;
  stage: LoopStage;
  status: "running" | "passed" | "failed" | "stopped";
  startedAt: string;
  endedAt?: string;
  summary?: string;
};
```

### 4.5 Verify Runner

- Detect `scripts/verify.ps1` in the workspace root.
- If missing, report missing harness instead of failing silently.
- Run via a child process or dedicated PTY tile.
- Stream output to the UI and save to `artifacts/evidence/<taskId>/<timestamp>-verify.txt`.
- Mark PASS if exit code is 0, FAIL otherwise.

**Data type:**

```ts
type VerifyResult = {
  id: string;
  taskId: string;
  command: string;
  exitCode: number;
  status: "pass" | "fail";
  outputPath: string;
  startedAt: string;
  endedAt: string;
};
```

Rule: a task is not considered done without a PASS VerifyResult.

### 4.6 Diff Viewer

- Run `git status --short` and `git diff` through the Git Manager.
- Show changed file list.
- Show diff text per file.
- Phase 2: inline comments, per-file approval, send feedback to Builder.

### 4.7 Human Approval Queue

Displays:

- Task summary.
- Files changed.
- Verify result.
- Reviewer result.
- Remaining risks.

Actions:

- **Approve**
- **Request Changes**
- **Reject**
- **Mark as Merged Manually**

Rule: agents cannot auto-merge or deploy in MVP. Task completes only after human approval.

### 4.8 Command Approval Gate

MVP scope: gate only **commands triggered by the app** (e.g. Verify Runner, Server runner, harness setup, role startup commands).

When the app is about to run a dangerous command, show a confirmation modal with:

- Full command.
- Working directory.
- Why the app wants to run it.
- **Confirm** / **Cancel** buttons.

Dangerous command list:

- `rm -rf`
- `git reset --hard`
- `git clean -fd`
- `drop database`
- `docker system prune`
- `npm publish`
- `git push --force`
- deploy commands

P1/P2: extend to full PTY interception so user-typed commands in any terminal are also gated.

### 4.9 Harness Setup Manager

When a workspace is opened, check for:

- `AGENTS.md`
- `CLAUDE.md`
- `scripts/verify.ps1`
- `scripts/dev.ps1`
- `scripts/test.ps1`
- `loops/dev-fix-loop/CONTRACT.md`
- `loops/dev-fix-loop/RUNBOOK.md`
- `loops/dev-fix-loop/VERIFIER.md`
- `artifacts/tasks/README.md`
- `artifacts/reports/README.md`
- `artifacts/evidence/README.md`
- `logs/GLOBAL_WORK_LOG.md`

If any are missing, the app shows a **Setup Harness** suggestion. Clicking it creates the missing files from built-in templates. The app **must not modify any existing project source code, config, or logic** during this setup. The user can skip harness setup if they prefer.

**Overwrite rule:** Harness Setup must not overwrite existing `AGENTS.md`, `CLAUDE.md`, scripts, loop files, or README files without explicit user confirmation. If a file already exists, show a preview/diff or mark it as “already exists”. Default behavior: create only missing files.

### 4.10 Worktree Manager (P1)

- Each task may run in its own git worktree / branch.
- Builder, Tester, Reviewer, and Verifier can work on isolated worktrees.
- Prevents conflicts when multiple agents/tasks run in parallel.
- Git Manager exposes API: `createWorktree`, `listWorktrees`, `removeWorktree`.

---

## 5. Error Handling & Safety

- No auto merge / auto deploy.
- The app must **not automatically read, display, log, or send the contents of `.env` files or any secret files into an agent or model**.
- Command Approval Gate for app-triggered dangerous commands (MVP).
- Always display the current working directory of each terminal tile.
- Save verify logs and evidence under `artifacts/evidence/`.
- Max loop = 5 by default; Anti-Spin if the same error repeats twice.
- Harness setup must not change existing project logic.
- Never silently run destructive commands.

### 5.1 Electron Security Requirements

- Enable `contextIsolation` in every `BrowserWindow`.
- Disable `nodeIntegration` in the renderer.
- Expose only safe IPC APIs through a preload script.
- Validate all file paths before any file, git, or PTY operation.
- Do not allow the renderer to execute arbitrary Node.js code directly.
- IPC handlers must validate `workspaceId`, `cwd`, `command`, and file path inputs.

---

## 6. Testing Strategy

### 6.1 Automated Tests

- Unit tests for:
  - Goal Contract parser.
  - Role prompt generator.
  - Dangerous command detector.
- Integration tests for:
  - Workspace Manager.
  - Terminal Manager with a mock PTY.

### 6.2 Manual Checklist by Phase

1. Open 3 terminal tiles and run independent PowerShell commands.
2. Create 5 tiles with clear roles and default presets.
3. Enter a task in Goal Panel, generate prompt, and send to Builder tile.
4. Run `scripts/verify.ps1`, see PASS/FAIL, and verify evidence is saved.
5. View `git status` and `git diff`.
6. Complete task only after human approval.
7. Confirm Command Approval Gate triggers on an app-triggered dangerous command.
8. Confirm Harness Setup creates missing files without touching existing code.

---

## 7. Development Phases

### Phase 1 — Local terminal control room

- Scaffold Electron + React + TypeScript + Vite.
- Create the first terminal tile using xterm.js + node-pty.
- Run PowerShell inside the tile.
- Stream input/output in realtime.
- Write README with run instructions.

Done when: user can open the app and run 3 independent PowerShell terminals.

### Phase 2 — Workspace manager + multiple tiles

- Add / open workspace from repo path.
- Create multiple tiles per workspace.
- Save tile layout and workspace list.

Done when: user opens a repo and creates 3+ tiles.

### Phase 3 — Role presets + Goal Panel

- Role selector per tile.
- Builder / Tester / Reviewer / Server / Verifier presets.
- Goal Contract form.
- Generate / copy / send role prompt.

Done when: user creates 5 tiles with roles and sends a Builder prompt.

### Phase 4 — Verify Runner

- Detect `scripts/verify.ps1`.
- Run verify and show PASS/FAIL.
- Save output to `artifacts/evidence/`.

Done when: a task has a clear VerifyResult.

### Phase 5 — Git Diff Viewer + Command Approval Gate

- `git status` / `git diff`.
- Changed file list and diff text.
- Gate app-triggered dangerous commands.

Done when: user sees changed files before approval, and a dangerous command is gated.

### Phase 6 — Human Approval + Harness Setup + Report

- Ready for Review state.
- Approve / Request Changes / Reject.
- Harness setup panel.
- Final report view.

Done when: task completes only after human approval and harness can be scaffolded.

---

## 8. Non-Goals for MVP

- Auto merge.
- Auto deploy.
- Cloud sandbox / Crabbox.
- Browser inspect tile.
- Composio.
- Google Workspace integration.
- Sales lead workflow.
- Multi-user collaboration.
- Remote agent execution.
- Full PTY command interception for user-typed commands.

---

## 9. Definition of Done for MVP

1. App opens locally on Windows.
2. User can add a workspace repo path.
3. User can create multiple terminal tiles.
4. Each tile runs its own command/shell independently.
5. Roles can be assigned: Builder, Tester, Reviewer, Server, Verifier.
6. User can enter a task using Goal Contract format.
7. User can generate/copy/send role prompts.
8. User can run `scripts/verify.ps1` from the app.
9. PASS/FAIL is displayed clearly.
10. `git status` / `git diff` is displayed.
11. Human approval actions exist.
12. Evidence and final reports are saved locally.
13. Command Approval Gate works for app-triggered dangerous commands.
14. Harness Setup can scaffold missing harness files without touching project logic.
