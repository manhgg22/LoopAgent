import { create } from 'zustand';
import type { DevTask, GoalContract } from '../lib/goalContract';
import { createDraftTask, updateTask } from '../lib/goalContract';

interface TaskStore {
  currentTask: DevTask | null;
  setCurrentTask: (task: DevTask | null) => void;
  startNewTask: (workspaceId: string) => DevTask;
  updateCurrentTask: (patch: Partial<GoalContract>) => void;
  advanceStatus: (status: DevTask['status']) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  currentTask: null,
  setCurrentTask: (task) => set({ currentTask: task }),
  startNewTask: (workspaceId) => {
    const task = createDraftTask(workspaceId);
    set({ currentTask: task });
    return task;
  },
  updateCurrentTask: (patch) => {
    const current = get().currentTask;
    if (!current) return;
    set({ currentTask: updateTask(current, patch) });
  },
  advanceStatus: (status) => {
    const current = get().currentTask;
    if (!current) return;
    set({ currentTask: updateTask(current, { status }) });
  },
}));
