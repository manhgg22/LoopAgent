import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { VerifyPanel } from '../../src/components/VerifyPanel';
import { useWorkspaceStore } from '../../src/store/workspaceStore';
import { useTaskStore } from '../../src/store/taskStore';
import { useVerifyStore } from '../../src/store/verifyStore';
import { createDraftTask } from '../../src/lib/goalContract';
import type { Workspace } from '../../electron/workspace/types';

const runVerify = vi.fn().mockResolvedValue({ success: true, result: null });

const sampleWorkspace: Workspace = {
  id: 'ws-1',
  name: 'TestRepo',
  repoPath: 'C:\\repo',
  status: 'valid',
  branch: 'main',
  createdAt: 'x',
  updatedAt: 'x',
};

const sampleTask = createDraftTask(sampleWorkspace.id);

describe('VerifyPanel', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ currentWorkspace: null, recentWorkspaces: [] });
    useTaskStore.setState({ currentTask: null });
    useVerifyStore.setState({ resultsByTask: {}, outputsByTask: {}, runningTaskId: null });

    Object.defineProperty(window, 'verifyApi', {
      value: { runVerify },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows guidance when no workspace or task is selected', () => {
    render(<VerifyPanel />);
    expect(screen.getByText(/Open a workspace and start a task/i)).toBeInTheDocument();
  });

  it('renders the Run verify.ps1 button when workspace and task exist', () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    render(<VerifyPanel />);
    expect(screen.getByRole('button', { name: /Run verify\.ps1/i })).toBeInTheDocument();
  });

  it('disables the button while verify is running', () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    useVerifyStore.setState({ runningTaskId: sampleTask.id });
    render(<VerifyPanel />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Running/i);
  });

  it('calls verifyApi and stores a passing result', async () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    const result = {
      id: 'v1',
      taskId: sampleTask.id,
      workspaceId: sampleWorkspace.id,
      command: 'cmd',
      exitCode: 0,
      status: 'pass' as const,
      outputPath: 'C:\\repo\\artifacts\\evidence\\task\\v1.txt',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    };
    runVerify.mockResolvedValueOnce({ success: true, result });

    render(<VerifyPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Run verify\.ps1/i }));

    await waitFor(() => {
      expect(runVerify).toHaveBeenCalledWith(sampleWorkspace.id, sampleTask.id);
      expect(useVerifyStore.getState().getLatestForTask(sampleTask.id)?.status).toBe('pass');
    });
    expect(useVerifyStore.getState().runningTaskId).toBeNull();
  });

  it('stores an error result when the IPC call fails', async () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    runVerify.mockResolvedValueOnce({ success: false, error: 'workspace not found' });

    render(<VerifyPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Run verify\.ps1/i }));

    await waitFor(() => {
      expect(useVerifyStore.getState().getLatestForTask(sampleTask.id)?.status).toBe('error');
      expect(useVerifyStore.getState().outputsByTask[sampleTask.id]).toBe('workspace not found');
    });
  });

  it('shows a missing-script warning when the latest result is missing', () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    useVerifyStore.setState({
      resultsByTask: {
        [sampleTask.id]: {
          id: 'v1',
          taskId: sampleTask.id,
          workspaceId: sampleWorkspace.id,
          command: '',
          exitCode: null,
          status: 'missing' as const,
          outputPath: '',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        },
      },
    });
    render(<VerifyPanel />);
    expect(screen.getByText(/scripts\/verify\.ps1 not found/i)).toBeInTheDocument();
  });

  it('shows saved output and the output path when available', () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    useVerifyStore.setState({
      resultsByTask: {
        [sampleTask.id]: {
          id: 'v1',
          taskId: sampleTask.id,
          workspaceId: sampleWorkspace.id,
          command: 'cmd',
          exitCode: 0,
          status: 'pass' as const,
          outputPath: 'C:\\repo\\artifacts\\evidence\\task\\v1.txt',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        },
      },
      outputsByTask: { [sampleTask.id]: 'PASS output' },
    });
    render(<VerifyPanel />);
    expect(screen.getByText(/PASS output/i)).toBeInTheDocument();
    expect(screen.getByText(/artifacts\\evidence\\task\\v1\.txt/i)).toBeInTheDocument();
  });

  it('shows "No output yet." when there is no output', () => {
    useWorkspaceStore.setState({ currentWorkspace: sampleWorkspace });
    useTaskStore.setState({ currentTask: sampleTask });
    render(<VerifyPanel />);
    expect(screen.getByText(/No output yet/i)).toBeInTheDocument();
  });
});
