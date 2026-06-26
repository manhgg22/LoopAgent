import { describe, it, expect } from 'vitest';
import {
  validateLayoutPayload,
  LayoutValidationError,
} from '../../electron/workspace/tileLayoutStorage';
import type { StoredTileLayout } from '../../electron/workspace/types';

function validLayout(): StoredTileLayout {
  return {
    workspaceId: 'w1',
    tiles: [
      {
        id: 't1',
        workspaceId: 'w1',
        title: 'PS1',
        role: 'plain',
        cwd: 'C:\\repo',
        shell: 'powershell.exe',
        shellArgs: ['-NoLogo'],
      },
    ],
  };
}

describe('validateLayoutPayload', () => {
  it('accepts a valid layout', () => {
    expect(() => validateLayoutPayload(validLayout())).not.toThrow();
  });

  it('rejects non-object layout', () => {
    expect(() => validateLayoutPayload(null)).toThrow(LayoutValidationError);
    expect(() => validateLayoutPayload('string')).toThrow(LayoutValidationError);
  });

  it('rejects missing or empty workspaceId', () => {
    expect(() => validateLayoutPayload({ workspaceId: '', tiles: [] })).toThrow('workspaceId');
    expect(() => validateLayoutPayload({ tiles: [] })).toThrow('workspaceId');
  });

  it('rejects non-array tiles', () => {
    expect(() => validateLayoutPayload({ workspaceId: 'w1', tiles: {} })).toThrow('tiles');
  });

  it('rejects tile missing required fields', () => {
    const layout = validLayout();
    layout.tiles[0] = { ...layout.tiles[0], id: '' };
    expect(() => validateLayoutPayload(layout)).toThrow('id');
  });

  it('rejects invalid role', () => {
    const layout = validLayout();
    (layout.tiles[0] as any).role = 'hacker';
    expect(() => validateLayoutPayload(layout)).toThrow('role');
  });

  it('rejects relative cwd', () => {
    const layout = validLayout();
    layout.tiles[0].cwd = 'relative/path';
    expect(() => validateLayoutPayload(layout)).toThrow('cwd');
  });

  it('rejects shell with path separators', () => {
    const layout = validLayout();
    layout.tiles[0].shell = 'C:\\Windows\\System32\\powershell.exe';
    expect(() => validateLayoutPayload(layout)).toThrow('shell');

    layout.tiles[0].shell = '/usr/bin/bash';
    expect(() => validateLayoutPayload(layout)).toThrow('shell');
  });

  it('rejects non-array shellArgs', () => {
    const layout = validLayout();
    (layout.tiles[0] as any).shellArgs = '-NoLogo';
    expect(() => validateLayoutPayload(layout)).toThrow('shellArgs');
  });

  it('accepts missing shellArgs', () => {
    const layout = validLayout();
    delete (layout.tiles[0] as any).shellArgs;
    expect(() => validateLayoutPayload(layout)).not.toThrow();
  });

  it('rejects tile workspaceId mismatch', () => {
    const layout = validLayout();
    (layout.tiles[0] as any).workspaceId = 'w2';
    expect(() => validateLayoutPayload(layout)).toThrow('workspaceId');
  });

  it('rejects non-string command', () => {
    const layout = validLayout();
    (layout.tiles[0] as any).command = 123;
    expect(() => validateLayoutPayload(layout)).toThrow('command');
  });

  it('accepts string command', () => {
    const layout = validLayout();
    layout.tiles[0].command = 'npm test';
    expect(() => validateLayoutPayload(layout)).not.toThrow();
  });
});
