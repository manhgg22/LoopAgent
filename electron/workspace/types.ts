export type WorkspaceStatus = 'valid' | 'not_git_repo' | 'path_not_found' | 'error';

export interface Workspace {
  id: string;
  name: string;
  repoPath: string;
  branch?: string;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoredWorkspaces {
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
}

export interface StoredTileLayout {
  workspaceId: string;
  tiles: Array<{
    id: string;
    title: string;
    role: import('../terminal/types').TileRole;
    cwd: string;
    shell: string;
    shellArgs: string[];
    command?: string;
  }>;
}

export interface StoredTileLayouts {
  layouts: StoredTileLayout[];
}
