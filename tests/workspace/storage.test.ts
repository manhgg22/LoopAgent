import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { readJson, writeJson } from '../../electron/workspace/storage';

let tmpDir = '';

describe('workspace storage helpers', () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-dev-storage-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes and reads JSON', async () => {
    const filePath = path.join(tmpDir, 'path.json');
    const data = { workspaces: [{ id: 'w1', name: 'Test', repoPath: 'C:\\tmp', createdAt: 'x' }] };
    await writeJson(filePath, data);
    const result = await readJson(filePath, { workspaces: [] });
    expect(result).toEqual(data);
  });

  it('returns default value when file does not exist', async () => {
    const filePath = path.join(tmpDir, 'missing.json');
    const result = await readJson(filePath, { workspaces: [] });
    expect(result).toEqual({ workspaces: [] });
  });
});
