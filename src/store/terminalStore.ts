import { create } from 'zustand';
import type { TerminalTileState } from '../../electron/terminal/types';

interface TerminalStore {
  tiles: TerminalTileState[];
  selectedTileId: string | null;
  addTile: (tile: TerminalTileState) => void;
  removeTile: (tileId: string) => void;
  updateTile: (tileId: string, patch: Partial<TerminalTileState>) => void;
  setSelectedTileId: (tileId: string | null) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  tiles: [],
  selectedTileId: null,
  addTile: (tile) => set((state) => ({ tiles: [...state.tiles, tile] })),
  removeTile: (tileId) =>
    set((state) => ({
      tiles: state.tiles.filter((t) => t.id !== tileId),
      selectedTileId: state.selectedTileId === tileId ? null : state.selectedTileId,
    })),
  updateTile: (tileId, patch) =>
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === tileId ? { ...t, ...patch } : t)),
    })),
  setSelectedTileId: (tileId) => set({ selectedTileId: tileId }),
}));
