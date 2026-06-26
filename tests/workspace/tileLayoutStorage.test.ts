import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { TileLayoutStorage } from '../../electron/workspace/tileLayoutStorage';

let tmpDir = '';

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-dev-layout-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('TileLayoutStorage', () => {
  it('saves and loads layout for a workspace', async () => {
    const storage = new TileLayoutStorage(tmpDir);
    await storage.saveLayout({
      workspaceId: 'w1',
      tiles: [{ id: 't1', workspaceId: 'w1', title: 'PS', role: 'plain', cwd: 'C:\\repo', shell: 'powershell.exe', shellArgs: ['-NoLogo'] }],
    });
    const loaded = await storage.loadLayouts();
    expect(loaded.layouts).toHaveLength(1);
    expect(loaded.layouts[0].workspaceId).toBe('w1');
  });

  it('returns empty default when no file exists', async () => {
    const storage = new TileLayoutStorage(tmpDir);
    const loaded = await storage.loadLayouts();
    expect(loaded.layouts).toEqual([]);
  });
});
