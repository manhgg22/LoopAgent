import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readJson, writeJson } from '../../electron/workspace/storage';

describe('workspace storage helpers', () => {
  it('writes and reads JSON', async () => {
    const data = { workspaces: [{ id: 'w1', name: 'Test', repoPath: 'C:\\tmp', createdAt: 'x' }] };
    await writeJson('/fake/path.json', data);
    const result = await readJson('/fake/path.json', { workspaces: [] });
    expect(result).toEqual(data);
  });
});
