export interface GoalContract {
  title: string;
  task: string;
  goal: string;
  scope: string;
  doNot: string;
  verify: string;
  doneWhen: string;
  maxLoop: number;
}

export interface DevTask extends GoalContract {
  id: string;
  workspaceId: string;
  status: 'draft' | 'planned' | 'running' | 'needs_changes' | 'verify_failed' | 'ready_for_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export function createDraftTask(workspaceId: string): DevTask {
  const now = new Date().toISOString();
  return {
    id: `task-${Date.now()}`,
    workspaceId,
    title: '',
    task: '',
    goal: '',
    scope: '',
    doNot: '',
    verify: '',
    doneWhen: '',
    maxLoop: 5,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTask(task: DevTask, patch: Partial<GoalContract>): DevTask {
  return {
    ...task,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
