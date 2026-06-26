import { describe, it, expect } from 'vitest';
import { useTerminalStore } from '../../src/store/terminalStore';

describe('terminalStore', () => {
  it('adds tile to a workspace', () => {
    useTerminalStore.getState().setTilesForWorkspace('w1', []);
    useTerminalStore.getState().addTile('w1', {
      id: 't1',
      workspaceId: 'w1',
      title: 'PS1',
      role: 'plain',
      cwd: 'C:\\repo',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      status: 'running',
    });
    expect(useTerminalStore.getState().tilesByWorkspace.w1).toHaveLength(1);
  });

  it('does not leak tiles across workspaces', () => {
    useTerminalStore.getState().setTilesForWorkspace('w1', []);
    useTerminalStore.getState().setTilesForWorkspace('w2', []);
    useTerminalStore.getState().addTile('w1', {
      id: 't1',
      workspaceId: 'w1',
      title: 'PS1',
      role: 'plain',
      cwd: 'C:\\repo',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      status: 'running',
    });
    expect(useTerminalStore.getState().tilesByWorkspace.w2).toHaveLength(0);
  });

  it('restoreWorkspaceTiles only updates the target workspace', () => {
    useTerminalStore.getState().setTilesForWorkspace('w1', [
      {
        id: 't1',
        workspaceId: 'w1',
        title: 'PS1',
        role: 'plain',
        cwd: 'C:\\repo',
        shell: 'powershell.exe',
        shellArgs: ['-NoLogo'],
        status: 'running',
      },
    ]);
    useTerminalStore.getState().setTilesForWorkspace('w2', [
      {
        id: 't2',
        workspaceId: 'w2',
        title: 'PS2',
        role: 'plain',
        cwd: 'C:\\repo2',
        shell: 'powershell.exe',
        shellArgs: ['-NoLogo'],
        status: 'running',
      },
    ]);

    useTerminalStore.getState().restoreWorkspaceTiles('w1', [
      {
        id: 't3',
        workspaceId: 'w1',
        title: 'PS3',
        role: 'plain',
        cwd: 'C:\\repo',
        shell: 'powershell.exe',
        shellArgs: ['-NoLogo'],
        status: 'idle',
      },
    ]);

    expect(useTerminalStore.getState().tilesByWorkspace.w1).toHaveLength(1);
    expect(useTerminalStore.getState().tilesByWorkspace.w1[0].id).toBe('t3');
    expect(useTerminalStore.getState().tilesByWorkspace.w2).toHaveLength(1);
    expect(useTerminalStore.getState().tilesByWorkspace.w2[0].id).toBe('t2');
  });
});
