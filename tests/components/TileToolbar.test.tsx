import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TileToolbar } from '../../src/components/TileToolbar';
import { useTerminalStore } from '../../src/store/terminalStore';
import { useWorkspaceStore } from '../../src/store/workspaceStore';
import type { Workspace } from '../../electron/workspace/types';

const createTerminal = vi.fn().mockResolvedValue({ success: true });
const killTerminal = vi.fn().mockResolvedValue(undefined);

const sampleWorkspace: Workspace = {
  id: 'ws-1',
  name: 'TestRepo',
  repoPath: 'C:\\\\repo',
  status: 'valid',
  branch: 'main',
  createdAt: 'x',
  updatedAt: 'x',
};

describe('TileToolbar', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      currentWorkspace: sampleWorkspace,
      recentWorkspaces: [sampleWorkspace],
    });
    useTerminalStore.setState({ tilesByWorkspace: {} });

    Object.defineProperty(window, 'terminalApi', {
      value: {
        createTerminal,
        killTerminal,
        writeInput: vi.fn(),
        resizeTerminal: vi.fn(),
        onTerminalEvent: vi.fn(() => () => {}),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    useWorkspaceStore.setState({ currentWorkspace: null, recentWorkspaces: [] });
    useTerminalStore.setState({ tilesByWorkspace: {} });
    vi.clearAllMocks();
  });

  it('creates a tile when clicking New Terminal', async () => {
    render(<TileToolbar />);
    fireEvent.click(screen.getByText('+ New Terminal'));

    await vi.waitFor(() => {
      expect(createTerminal).toHaveBeenCalled();
      expect(useTerminalStore.getState().tilesByWorkspace['ws-1']).toHaveLength(1);
    });
  });

  it('uses the workspace repoPath as cwd when creating a tile', async () => {
    render(<TileToolbar />);
    fireEvent.click(screen.getByText('+ New Terminal'));

    await vi.waitFor(() => {
      expect(createTerminal).toHaveBeenCalledWith(
        expect.objectContaining({ cwd: sampleWorkspace.repoPath })
      );
    });
  });
});
