import { create } from 'zustand';
import type { Workspace } from '../../electron/workspace/types';

interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  recentWorkspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setRecentWorkspaces: (workspaces: Workspace[]) => void;
  refreshWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  currentWorkspace: null,
  recentWorkspaces: [],
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setRecentWorkspaces: (workspaces) => set({ recentWorkspaces: workspaces }),
  refreshWorkspaces: async () => {
    const workspaces = await window.workspaceApi.listWorkspaces();
    const current = await window.workspaceApi.getCurrentWorkspace();
    set({ recentWorkspaces: workspaces, currentWorkspace: current });
  },
}));
