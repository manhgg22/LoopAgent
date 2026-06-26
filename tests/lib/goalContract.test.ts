import { describe, it, expect, vi } from 'vitest';
import { createDraftTask, updateTask } from '../../src/lib/goalContract';

describe('goalContract', () => {
  it('creates a draft task with default maxLoop 5', () => {
    const task = createDraftTask('w1');
    expect(task.workspaceId).toBe('w1');
    expect(task.status).toBe('draft');
    expect(task.maxLoop).toBe(5);
  });

  it('updates task fields and updatedAt', () => {
    const task = createDraftTask('w1');
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2026-06-26T07:30:00.000Z');
    const updated = updateTask(task, { title: 'Fix bug', goal: 'Make it work' });
    expect(updated.title).toBe('Fix bug');
    expect(updated.goal).toBe('Make it work');
    expect(updated.updatedAt).toBe('2026-06-26T07:30:00.000Z');
    expect(updated.updatedAt).not.toBe(task.updatedAt);
  });
});
