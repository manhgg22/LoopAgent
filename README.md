# AI Dev Control Room

A local desktop control room for coordinating multiple AI coding agents through multiple terminal tiles.

This repository is currently at **Phase 2 — Workspace Manager + Multiple Tiles**.

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

## Phase 2 Usage

1. Run `npm run electron:dev`.
2. In the left sidebar, enter a repo path and click **Add**.
3. The workspace appears in the list with its name, path, and branch (or warning).
4. Click the workspace to open it.
5. Click **+ New Terminal** to create PowerShell tiles bound to that workspace.
6. Close and reopen the app; the recent workspace and tile layout are restored.

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
