import { describe, it, expect, vi } from 'vitest';
import { useWorkspaceStore } from '../../src/store/workspaceStore';

describe('workspaceStore', () => {
  it('sets current workspace', () => {
    useWorkspaceStore.getState().setCurrentWorkspace({
      id: 'w1',
      name: 'Repo',
      repoPath: 'C:\\repo',
      status: 'valid',
      createdAt: 'x',
      updatedAt: 'x',
    });
    expect(useWorkspaceStore.getState().currentWorkspace?.id).toBe('w1');
  });

  it('refresh calls workspaceApi', async () => {
    const mockList = vi.fn().mockResolvedValue([]);
    const mockCurrent = vi.fn().mockResolvedValue(null);
    (window as any).workspaceApi = { listWorkspaces: mockList, getCurrentWorkspace: mockCurrent };

    await useWorkspaceStore.getState().refreshWorkspaces();
    expect(mockList).toHaveBeenCalled();
    expect(mockCurrent).toHaveBeenCalled();
  });
});
