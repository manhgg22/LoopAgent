import { describe, it, expect } from 'vitest';
import { TerminalTileConfig, TerminalEvent } from '../../electron/terminal/types';

describe('terminal types', () => {
  it('TerminalTileConfig accepts a valid tile config', () => {
    const cfg: TerminalTileConfig = {
      id: 't1',
      workspaceId: 'w1',
      title: 'PowerShell 1',
      role: 'plain',
      cwd: 'C:\\tmp',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      command: undefined,
    };
    expect(cfg.id).toBe('t1');
  });

  it('TerminalEvent has required output shape', () => {
    const ev: TerminalEvent = {
      tileId: 't1',
      type: 'output',
      data: 'hello',
    };
    expect(ev.type).toBe('output');
  });
});
