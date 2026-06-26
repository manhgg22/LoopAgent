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
