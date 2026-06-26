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
});
