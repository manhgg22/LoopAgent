import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTerminalStore } from '../store/terminalStore';
import type { TerminalTileState } from '../../electron/terminal/types';
import { TerminalTile } from './TerminalTile';
import { TileToolbar } from './TileToolbar';

export function TileCanvas() {
  const { currentWorkspace } = useWorkspaceStore();
  const tiles = useTerminalStore((state) =>
    currentWorkspace ? state.tilesByWorkspace[currentWorkspace.id] ?? [] : []
  );
  const restoreWorkspaceTiles = useTerminalStore((state) => state.restoreWorkspaceTiles);
  const [hydratedWorkspaceId, setHydratedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace) {
      setHydratedWorkspaceId(null);
      return;
    }

    setHydratedWorkspaceId(null);
    const workspaceId = currentWorkspace.id;
    let cancelled = false;

    async function hydrate() {
      const layout = await window.workspaceApi.loadTileLayout(workspaceId);
      if (cancelled) return;

      const existingTiles = useTerminalStore.getState().tilesByWorkspace[workspaceId] ?? [];
      const hasActiveTiles = existingTiles.some((t) => t.status !== 'idle');

      if (layout.tiles.length > 0 && !hasActiveTiles) {
        const restored: TerminalTileState[] = [];
        for (const tile of layout.tiles) {
          const result = await window.terminalApi.createTerminal({ ...tile, workspaceId });
          restored.push({
            ...tile,
            workspaceId,
            status: result.success ? 'running' : 'error',
          });
        }

        if (!cancelled) {
          restoreWorkspaceTiles(workspaceId, restored);
        }
      }

      if (!cancelled) {
        setHydratedWorkspaceId(workspaceId);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id, restoreWorkspaceTiles]);

  useEffect(() => {
    if (!currentWorkspace) return;
    if (hydratedWorkspaceId !== currentWorkspace.id) return;

    const saveable = tiles.map(({ status, ...rest }) => rest);
    window.workspaceApi.saveTileLayout({ workspaceId: currentWorkspace.id, tiles: saveable });
  }, [tiles, currentWorkspace?.id, hydratedWorkspaceId]);

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
