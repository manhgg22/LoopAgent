import { create } from 'zustand';
import type { VerifyResult } from '../../electron/verify/types';

interface VerifyStore {
  resultsByTask: Record<string, VerifyResult>;
  outputsByTask: Record<string, string>;
  runningTaskId: string | null;
  setRunningTaskId: (taskId: string | null) => void;
  setResult: (taskId: string, result: VerifyResult, output?: string) => void;
  getLatestForTask: (taskId: string) => VerifyResult | null;
  getLatestForWorkspace: (workspaceId: string) => VerifyResult | null;
}

export const useVerifyStore = create<VerifyStore>((set, get) => ({
  resultsByTask: {},
  outputsByTask: {},
  runningTaskId: null,
  setRunningTaskId: (taskId) => set({ runningTaskId: taskId }),
  setResult: (taskId, result, output) =>
    set((state) => ({
      resultsByTask: { ...state.resultsByTask, [taskId]: result },
      outputsByTask: output !== undefined
        ? { ...state.outputsByTask, [taskId]: output }
        : state.outputsByTask,
      runningTaskId: state.runningTaskId === taskId ? null : state.runningTaskId,
    })),
  getLatestForTask: (taskId) => get().resultsByTask[taskId] ?? null,
  getLatestForWorkspace: (workspaceId) => {
    const results = Object.values(get().resultsByTask).filter((r) => r.workspaceId === workspaceId);
    if (results.length === 0) return null;
    return results.reduce((latest, current) =>
      current.startedAt > latest.startedAt ? current : latest
    );
  },
}));
