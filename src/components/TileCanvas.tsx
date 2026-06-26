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
