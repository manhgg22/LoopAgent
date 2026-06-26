import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GoalPanel } from '../../src/components/GoalPanel';
import { useWorkspaceStore } from '../../src/store/workspaceStore';
import { useTaskStore } from '../../src/store/taskStore';
import { useTerminalStore } from '../../src/store/terminalStore';
import { generateRolePrompt } from '../../src/lib/promptGenerator';
import { createDraftTask } from '../../src/lib/goalContract';
import type { Workspace } from '../../electron/workspace/types';
import type { TerminalTileState } from '../../electron/terminal/types';

const writeText = vi.fn().mockResolvedValue(undefined);
const writeInput = vi.fn().mockResolvedValue(undefined);

const sampleWorkspace: Workspace = {
  id: 'ws-1',
  name: 'TestRepo',
  repoPath: 'C:\\\\repo',
  status: 'valid',
  branch: 'main',
  createdAt: 'x',
  updatedAt: 'x',
};

const sampleTask = {
  ...createDraftTask(sampleWorkspace.id),
  title: 'Fix login bug',
  task: 'Repair the login form validation',
  goal: 'Users can log in successfully',
  scope: 'auth module',
  doNot: 'touch UI styling',
  verify: 'login test passes',
  doneWhen: 'tests pass and code is reviewed',
  maxLoop: 3,
};

const builderTile: TerminalTileState = {
  id: 'tile-builder-1',
  workspaceId: sampleWorkspace.id,
  title: 'Builder 1',
  role: 'builder',
  cwd: sampleWorkspace.repoPath,
  shell: 'powershell.exe',
  shellArgs: ['-NoLogo'],
  command: 'claude',
  status: 'running',
};

describe('GoalPanel', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ currentWorkspace: null, recentWorkspaces: [] });
    useTaskStore.setState({ currentTask: null });
    useTerminalStore.setState({ tilesByWorkspace: {} });

    Object.defineProperty(window, 'terminalApi', {
      value: {
        createTerminal: vi.fn().mockResolvedValue({ success: true }),
        killTerminal: vi.fn().mockResolvedValue(undefined),
        writeInput,
        resizeTerminal: vi.fn().mockResolvedValue(undefined),
        getDefaultCwd: vi.fn().mockResolvedValue('C:\\\\'),
        onTerminalEvent: vi.fn(() => () => {}),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows workspace required message when no workspace', () => {
    render(<GoalPanel />);
    expect(screen.getByText(/Open a workspace/i)).toBeInTheDocument();
  });

  it('renders goal contract fields when workspace is present', async () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    render(<GoalPanel />);

    expect(await screen.findByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/TASK/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GOAL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SCOPE/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/DO NOT/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/VERIFY/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/DONE WHEN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/MAX LOOP/i)).toBeInTheDocument();
  });

  it('updates task fields when typing', () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    render(<GoalPanel />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Updated title' } });
    expect(useTaskStore.getState().currentTask?.title).toBe('Updated title');
  });

  it('copies the builder prompt to the clipboard', async () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    render(<GoalPanel />);

    fireEvent.click(screen.getAllByText('Copy')[0]);

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(generateRolePrompt('builder', sampleTask));
    });
  });

  it('sends the builder prompt to the matching tile', async () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    useTerminalStore.setState({
      tilesByWorkspace: { [sampleWorkspace.id]: [builderTile] },
    });
    render(<GoalPanel />);

    fireEvent.click(screen.getByText('Send to builder'));

    await vi.waitFor(() => {
      expect(writeInput).toHaveBeenCalledWith(
        builderTile.id,
        generateRolePrompt('builder', sampleTask) + '\r'
      );
    });
  });

  it('alerts when no matching tile exists for a role', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    render(<GoalPanel />);

    fireEvent.click(screen.getByText('Send to builder'));
    expect(alertSpy).toHaveBeenCalledWith('No builder tile found. Create one first.');
    alertSpy.mockRestore();
  });
});
