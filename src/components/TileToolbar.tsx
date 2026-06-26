import { useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTerminalStore } from '../store/terminalStore';
import { ROLES, getRolePreset } from '../../electron/terminal/rolePresets';
import type { TileRole } from '../../electron/terminal/types';

let tileCounter = 0;

export function TileToolbar() {
  const [selectedRole, setSelectedRole] = useState<TileRole>('plain');
  const { currentWorkspace } = useWorkspaceStore();
  const tiles = useTerminalStore((state) =>
    currentWorkspace ? state.tilesByWorkspace[currentWorkspace.id] ?? [] : []
  );
  const removeTile = useTerminalStore((state) => state.removeTile);
  const addTile = useTerminalStore((state) => state.addTile);

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

  const closeTile = async (tileId: string) => {
    if (!currentWorkspace) return;
    await window.terminalApi.killTerminal(tileId);
    removeTile(currentWorkspace.id, tileId);
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
