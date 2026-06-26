import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileGrid } from '../../src/components/TileGrid';
import { useTerminalStore } from '../../src/store/terminalStore';
import type { TerminalTileState } from '../../electron/terminal/types';

const sampleTile: TerminalTileState = {
  id: 'tile-1',
  workspaceId: 'default',
  title: 'PowerShell 1',
  role: 'plain',
  cwd: process.cwd(),
  shell: 'powershell.exe',
  shellArgs: ['-NoLogo'],
  status: 'running',
};

vi.mock('../../src/components/TerminalTile', () => ({
  TerminalTile: ({ tileId }: { tileId: string }) => <div data-testid={`tile-${tileId}`}>{tileId}</div>,
}));

describe('TileGrid', () => {
  afterEach(() => {
    useTerminalStore.setState({ tiles: [], selectedTileId: null });
  });

  it('renders tiles from the store', () => {
    useTerminalStore.getState().addTile(sampleTile);
    render(<TileGrid />);
    expect(screen.getByTestId('tile-tile-1')).toBeInTheDocument();
  });
});
