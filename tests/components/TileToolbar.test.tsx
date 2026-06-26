import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TileToolbar } from '../../src/components/TileToolbar';
import { useTerminalStore } from '../../src/store/terminalStore';

const createTerminal = vi.fn().mockResolvedValue({ success: true });
const killTerminal = vi.fn().mockResolvedValue(undefined);
const getDefaultCwd = vi.fn().mockResolvedValue(process.cwd());

describe('TileToolbar', () => {
  afterEach(() => {
    useTerminalStore.setState({ tiles: [], selectedTileId: null });
    vi.clearAllMocks();
  });

  it('creates a tile when clicking New Terminal', async () => {
    Object.defineProperty(window, 'terminalApi', {
      value: {
        createTerminal,
        killTerminal,
        getDefaultCwd,
        writeInput: vi.fn(),
        resizeTerminal: vi.fn(),
        onTerminalEvent: vi.fn(() => () => {}),
      },
      writable: true,
      configurable: true,
    });

    render(<TileToolbar />);
    fireEvent.click(screen.getByText('+ New Terminal'));

    await vi.waitFor(() => {
      expect(createTerminal).toHaveBeenCalled();
      expect(useTerminalStore.getState().tiles).toHaveLength(1);
    });
  });
});
