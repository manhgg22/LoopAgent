# AI Dev Control Room

A local desktop control room for coordinating multiple AI coding agents through multiple terminal tiles.

This repository is currently at **Phase 4 — Verify Runner**.

## Phase 1 Features

- Electron + React + TypeScript + Vite desktop app.
- Multiple PowerShell terminal tiles powered by `xterm.js` and `node-pty`.
- Realtime input/output streaming through secure Electron IPC.
- Create and close terminals independently.

## Phase 2 Features

- Add/Open workspace from a local repo path.
- Validate git repo and display current branch.
- Warning if workspace is not a git repo.
- Persist recent workspaces and tile layouts across app restarts.
- Create multiple terminal tiles inside the current workspace.
- Each tile defaults its working directory to the workspace repo path.

## Phase 3 Features

- Assign a role to each terminal tile: Plain, Builder, Tester, Reviewer, Server, Verifier.
- Role presets set the tile title and default startup command.
- Goal Panel with Goal Contract form: TASK, GOAL, SCOPE, DO NOT, VERIFY, DONE WHEN, MAX LOOP.
- Generate role-specific prompts from the contract.
- Copy a prompt to clipboard or send it directly into the matching role tile.

## Phase 2 Usage

1. Run `npm run electron:dev`.
2. In the left sidebar, enter a repo path and click **Add**.
3. The workspace appears in the list with its name, path, and branch (or warning).
4. Click the workspace to open it.
5. Click **+ New Terminal** to create PowerShell tiles bound to that workspace.
6. Close and reopen the app; the recent workspace and tile layout are restored.

## Phase 3 Usage

1. Open a workspace.
2. Select a role from the dropdown next to **+ New Terminal** and create tiles.
3. Open the **Goal Panel** on the right.
4. Fill in the Goal Contract fields.
5. Click **Send to builder** (or another role) to write the generated prompt into that tile.
6. Click **Copy** to copy the prompt to the clipboard instead.

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
