import { useWorkspaceStore } from '../store/workspaceStore';
import { useTerminalStore } from '../store/terminalStore';

let tileCounter = 0;

export function TileToolbar() {
  const { currentWorkspace } = useWorkspaceStore();
  const tiles = useTerminalStore((state) =>
    currentWorkspace ? state.tilesByWorkspace[currentWorkspace.id] ?? [] : []
  );
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
