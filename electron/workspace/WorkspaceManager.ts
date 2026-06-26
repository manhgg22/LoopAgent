import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import type { StoredWorkspaces, Workspace, WorkspaceStatus } from './types';
import { readJson, writeJson } from './storage';

function generateId(): string {
  return crypto.randomUUID();
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function checkGitRepo(targetPath: string): Promise<{ status: WorkspaceStatus; branch?: string; error?: string }> {
  if (!(await pathExists(targetPath))) {
    return { status: 'path_not_found' };
  }

  const gitDir = path.join(targetPath, '.git');
  if (!(await pathExists(gitDir))) {
    return { status: 'not_git_repo' };
  }

  return new Promise((resolve) => {
    const proc = spawn('git', ['rev-parse', '--is-inside-work-tree'], { cwd: targetPath });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    proc.on('error', () => resolve({ status: 'error', error: 'git command failed' }));
    proc.on('close', async (code) => {
      if (code !== 0 || stdout.trim() !== 'true') {
        resolve({ status: 'not_git_repo', error: stderr || 'not a git worktree' });
        return;
      }

      const branchProc = spawn('git', ['branch', '--show-current'], { cwd: targetPath });
      let branch = '';
      branchProc.stdout.on('data', (data) => { branch += data; });
      branchProc.on('close', (branchCode) => {
        resolve({
          status: 'valid',
          branch: branchCode === 0 ? branch.trim() || undefined : undefined,
        });
      });
    });
  });
}

export class WorkspaceManager {
  private dataDir: string;
  private state: StoredWorkspaces;
  private initialized = false;

  constructor(dataDir: string) {
    if (!path.isAbsolute(dataDir)) {
      throw new Error('dataDir must be absolute');
    }
    this.dataDir = dataDir;
    this.state = { currentWorkspaceId: null, workspaces: [] };
  }

  private get workspacesFile(): string {
    return path.join(this.dataDir, 'workspaces.json');
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.state = await readJson<StoredWorkspaces>(this.workspacesFile, {
      currentWorkspaceId: null,
      workspaces: [],
    });
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    await writeJson(this.workspacesFile, this.state);
  }

  async addWorkspace(repoPath: string): Promise<Workspace> {
    if (!repoPath || !path.isAbsolute(repoPath)) {
      throw new Error('repoPath must be an absolute path');
    }

    const normalized = path.normalize(repoPath);
    const existing = this.state.workspaces.find((w) => path.normalize(w.repoPath).toLowerCase() === normalized.toLowerCase());
    if (existing) {
      const opened = await this.openWorkspace(existing.id);
      if (!opened) {
        throw new Error('Failed to open existing workspace');
      }
      return opened;
    }

    const git = await checkGitRepo(normalized);
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: generateId(),
      name: path.basename(normalized),
      repoPath: normalized,
      branch: git.branch,
      status: git.status,
      createdAt: now,
      updatedAt: now,
    };

    this.state.workspaces.push(workspace);
    this.state.currentWorkspaceId = workspace.id;
    await this.persist();
    return workspace;
  }

  async openWorkspace(workspaceId: string): Promise<Workspace | null> {
    const workspace = this.state.workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return null;

    const git = await checkGitRepo(workspace.repoPath);
    workspace.status = git.status;
    workspace.branch = git.branch;
    workspace.updatedAt = new Date().toISOString();
    this.state.currentWorkspaceId = workspace.id;
    await this.persist();
    return workspace;
  }

  async removeWorkspace(workspaceId: string): Promise<void> {
    this.state.workspaces = this.state.workspaces.filter((w) => w.id !== workspaceId);
    if (this.state.currentWorkspaceId === workspaceId) {
      this.state.currentWorkspaceId = this.state.workspaces[0]?.id ?? null;
    }
    await this.persist();
  }

  listWorkspaces(): Workspace[] {
    return this.state.workspaces;
  }

  getCurrentWorkspace(): Workspace | null {
    if (!this.state.currentWorkspaceId) return null;
    return this.state.workspaces.find((w) => w.id === this.state.currentWorkspaceId) ?? null;
  }

  getWorkspaceStatus(workspaceId: string): WorkspaceStatus {
    const workspace = this.state.workspaces.find((w) => w.id === workspaceId);
    return workspace?.status ?? 'error';
  }

  getWorkspaceById(workspaceId: string): Workspace | null {
    return this.state.workspaces.find((w) => w.id === workspaceId) ?? null;
  }
}
