import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../../src/store/taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    useTaskStore.getState().setCurrentTask(null);
  });

  it('starts a new draft task', () => {
    const task = useTaskStore.getState().startNewTask('w1');
    expect(task.workspaceId).toBe('w1');
    expect(task.status).toBe('draft');
    expect(useTaskStore.getState().currentTask?.id).toBe(task.id);
  });

  it('updates current task fields', () => {
    useTaskStore.getState().startNewTask('w1');
    useTaskStore.getState().updateCurrentTask({ title: 'New title' });
    expect(useTaskStore.getState().currentTask?.title).toBe('New title');
  });

  it('advances status', () => {
    useTaskStore.getState().startNewTask('w1');
    useTaskStore.getState().advanceStatus('planned');
    expect(useTaskStore.getState().currentTask?.status).toBe('planned');
  });
});
