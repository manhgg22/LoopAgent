import { describe, it, expect, vi } from 'vitest';
import { TerminalManager } from '../../electron/terminal/TerminalManager';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock pty-spawn so tests don't require a real shell
vi.mock('../../electron/terminal/pty-spawn', () => ({
  spawnPty: vi.fn().mockImplementation(() => {
    const emitter = new (require('node:events').EventEmitter)();
    let lastWrite = '';
    return {
      pid: 1234,
      write: vi.fn((data: string) => {
        lastWrite = data;
        emitter.emit('data', data);
      }),
      getLastWrite: () => lastWrite,
      resize: vi.fn(),
      kill: vi.fn(() => emitter.emit('exit', 0, undefined)),
      onData: (handler: (data: string) => void) => emitter.on('data', handler),
      onExit: (handler: (code: number, signal?: number) => void) =>
        emitter.on('exit', (exitCode: number, signal?: number) => handler(exitCode, signal)),
    };
  }),
}));

describe('TerminalManager', () => {
  it('creates a terminal with running status', async () => {
    const manager = new TerminalManager();

    const result = await manager.create({
      id: 't1',
      workspaceId: 'w1',
      title: 'Test',
      role: 'plain',
      cwd: process.cwd(),
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
    });

    expect(result.success).toBe(true);
    expect(manager.list()).toHaveLength(1);
    expect(manager.list()[0].status).toBe('running');
    expect(manager.list()[0].pid).toBe(1234);
  });

  it('rejects relative cwd', async () => {
    const manager = new TerminalManager();
    const result = await manager.create({
      id: 't2',
      workspaceId: 'w1',
      title: 'Bad',
      role: 'plain',
      cwd: 'relative/path',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('absolute path');
  });

  it('writes startup command to PTY when command is provided', async () => {
    const manager = new TerminalManager();

    await manager.create({
      id: 't3',
      workspaceId: 'w1',
      title: 'WithCommand',
      role: 'plain',
      cwd: process.cwd(),
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo'],
      command: 'Get-Date',
    });

    await wait(600);
    const pty = (manager as any).processes.get('t3');
    expect(pty.getLastWrite()).toBe('Get-Date\r');
  });
});
