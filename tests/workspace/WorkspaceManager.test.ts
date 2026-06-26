import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { WorkspaceManager } from '../../electron/workspace/WorkspaceManager';

let tmpDir = '';

function runGit(dir: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd: dir });
    proc.on('error', reject);
    proc.on('close', (code) => resolve(code ?? 1));
  });
}

async function createGitRepo(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await runGit(dir, ['init', '-b', 'main']);
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-dev-workspace-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('WorkspaceManager', () => {
  it('rejects relative paths', async () => {
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    await expect(manager.addWorkspace('relative/path')).rejects.toThrow('absolute path');
  });

  it('detects non-git folder as not_git_repo', async () => {
    const repo = path.join(tmpDir, 'plain');
    await fs.mkdir(repo, { recursive: true });
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    const ws = await manager.addWorkspace(repo);
    expect(ws.status).toBe('not_git_repo');
  });

  it('detects git repo and branch', async () => {
    const repo = path.join(tmpDir, 'gitrepo');
    await createGitRepo(repo);
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    const ws = await manager.addWorkspace(repo);
    expect(ws.status).toBe('valid');
    expect(ws.branch).toBe('main');
  });

  it('persists workspaces', async () => {
    const dataDir = path.join(tmpDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const repo = path.join(tmpDir, 'gitrepo');
    await createGitRepo(repo);

    const manager = new WorkspaceManager(dataDir);
    await manager.init();
    await manager.addWorkspace(repo);

    const manager2 = new WorkspaceManager(dataDir);
    await manager2.init();
    expect(manager2.listWorkspaces()).toHaveLength(1);
    expect(manager2.getCurrentWorkspace()?.repoPath).toBe(repo);
  });

  it('opens existing workspace by id', async () => {
    const repo = path.join(tmpDir, 'gitrepo');
    await createGitRepo(repo);
    const manager = new WorkspaceManager(tmpDir);
    await manager.init();
    const ws = await manager.addWorkspace(repo);
    const opened = await manager.openWorkspace(ws.id);
    expect(opened?.id).toBe(ws.id);
  });
});
