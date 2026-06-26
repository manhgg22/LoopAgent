import { describe, it, expect } from 'vitest';
import { useTerminalStore } from '../../src/store/terminalStore';
import type { TerminalTileState } from '../../electron/terminal/types';

const sampleTile: TerminalTileState = {
  id: 'tile-1',
  workspaceId: 'default',
  title: 'PowerShell 1',
  role: 'plain',
  cwd: 'C:\\tmp',
  shell: 'powershell.exe',
  shellArgs: ['-NoLogo'],
  status: 'running',
  pid: 1234,
};

describe('terminalStore', () => {
  it('starts with no tiles and no selection', () => {
    const state = useTerminalStore.getState();
    expect(state.tiles).toEqual([]);
    expect(state.selectedTileId).toBeNull();
  });

  it('adds a tile', () => {
    useTerminalStore.getState().addTile(sampleTile);
    const state = useTerminalStore.getState();
    expect(state.tiles).toHaveLength(1);
    expect(state.tiles[0].id).toBe('tile-1');
  });

  it('updates a tile by id', () => {
    useTerminalStore.getState().updateTile('tile-1', { status: 'stopped' });
    const tile = useTerminalStore.getState().tiles.find((t) => t.id === 'tile-1');
    expect(tile?.status).toBe('stopped');
  });

  it('sets selected tile id', () => {
    useTerminalStore.getState().setSelectedTileId('tile-1');
    expect(useTerminalStore.getState().selectedTileId).toBe('tile-1');
  });

  it('removes a tile and clears selection if selected', () => {
    useTerminalStore.getState().removeTile('tile-1');
    const state = useTerminalStore.getState();
    expect(state.tiles).toHaveLength(0);
    expect(state.selectedTileId).toBeNull();
  });
});
