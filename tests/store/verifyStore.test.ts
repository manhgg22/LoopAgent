import { describe, it, expect } from 'vitest';
import { useVerifyStore } from '../../src/store/verifyStore';

describe('verifyStore', () => {
  it('sets and gets result for a task', () => {
    const result = {
      id: 'v1',
      taskId: 't1',
      workspaceId: 'w1',
      command: 'cmd',
      exitCode: 0,
      status: 'pass' as const,
      outputPath: 'path',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-01T00:00:01.000Z',
    };
    useVerifyStore.getState().setResult('t1', result);
    expect(useVerifyStore.getState().getLatestForTask('t1')?.status).toBe('pass');
  });

  it('returns latest result for workspace', () => {
    useVerifyStore.getState().setResult('t1', {
      id: 'v1', taskId: 't1', workspaceId: 'w1', command: 'cmd', exitCode: 0, status: 'pass',
      outputPath: '', startedAt: '2024-01-01T00:00:00.000Z', endedAt: '2024-01-01T00:00:01.000Z',
    });
    useVerifyStore.getState().setResult('t2', {
      id: 'v2', taskId: 't2', workspaceId: 'w1', command: 'cmd', exitCode: 1, status: 'fail',
      outputPath: '', startedAt: '2024-01-01T00:00:02.000Z', endedAt: '2024-01-01T00:00:03.000Z',
    });
    const latest = useVerifyStore.getState().getLatestForWorkspace('w1');
    expect(latest?.status).toBe('fail');
  });
});
