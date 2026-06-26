import { create } from 'zustand';
import type { TerminalTileState } from '../../electron/terminal/types';

interface TerminalStore {
  tilesByWorkspace: Record<string, TerminalTileState[]>;
  addTile: (workspaceId: string, tile: TerminalTileState) => void;
  removeTile: (workspaceId: string, tileId: string) => void;
  updateTile: (workspaceId: string, tileId: string, patch: Partial<TerminalTileState>) => void;
  setTilesForWorkspace: (workspaceId: string, tiles: TerminalTileState[]) => void;
  restoreWorkspaceTiles: (workspaceId: string, tiles: TerminalTileState[]) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  tilesByWorkspace: {},
  addTile: (workspaceId, tile) =>
    set((state) => ({
      tilesByWorkspace: {
        ...state.tilesByWorkspace,
        [workspaceId]: [...(state.tilesByWorkspace[workspaceId] ?? []), tile],
      },
    })),
  removeTile: (workspaceId, tileId) =>
    set((state) => ({
      tilesByWorkspace: {
        ...state.tilesByWorkspace,
        [workspaceId]: (state.tilesByWorkspace[workspaceId] ?? []).filter((t) => t.id !== tileId),
      },
    })),
  updateTile: (workspaceId, tileId, patch) =>
    set((state) => ({
      tilesByWorkspace: {
        ...state.tilesByWorkspace,
        [workspaceId]: (state.tilesByWorkspace[workspaceId] ?? []).map((t) =>
          t.id === tileId ? { ...t, ...patch } : t
        ),
      },
    })),
  setTilesForWorkspace: (workspaceId, tiles) =>
    set((state) => ({
      tilesByWorkspace: { ...state.tilesByWorkspace, [workspaceId]: tiles },
    })),
  restoreWorkspaceTiles: (workspaceId, tiles) =>
    set((state) => ({
      tilesByWorkspace: { ...state.tilesByWorkspace, [workspaceId]: tiles },
    })),
}));
