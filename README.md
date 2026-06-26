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
