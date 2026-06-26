import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { spawnPty } from './pty-spawn';
import type {
  TerminalTileConfig,
  TerminalEvent,
  TerminalTileState,
  TerminalStatus,
} from './types';

export class TerminalManager extends EventEmitter {
  private tiles = new Map<string, TerminalTileState>();
  private processes = new Map<string, ReturnType<typeof spawnPty>>();

  async create(config: TerminalTileConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.id || !config.workspaceId) {
      return { success: false, error: 'Missing tile or workspace id' };
    }
    if (!config.cwd || !path.isAbsolute(config.cwd)) {
      return { success: false, error: 'cwd must be an absolute path' };
    }
    if (!config.shell) {
      return { success: false, error: 'shell is required' };
    }

    const existing = this.processes.get(config.id);
    if (existing) {
      existing.kill();
      this.processes.delete(config.id);
    }

    try {
      const pty = spawnPty(config.shell, config.shellArgs, config.cwd);
      this.processes.set(config.id, pty);

      const state: TerminalTileState = {
        ...config,
        status: 'running',
        pid: pty.pid,
      };
      this.tiles.set(config.id, state);

      pty.onData((data) => {
        this.emit('event', {
          tileId: config.id,
          type: 'output',
          data,
        } as TerminalEvent);
      });

      pty.onExit((exitCode, signal) => {
        this.emit('event', {
          tileId: config.id,
          type: 'exit',
          data: exitCode,
          message: signal ? `signal ${signal}` : undefined,
        } as TerminalEvent);
        this.setStatus(config.id, exitCode === 0 ? 'stopped' : 'error');
      });

      // If a startup command is provided, write it after a short delay
      // so the shell prompt is ready.
      if (config.command) {
        setTimeout(() => {
          pty.write(`${config.command}\r`);
        }, 500);
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  write(tileId: string, data: string): void {
    const pty = this.processes.get(tileId);
    if (!pty) throw new Error(`Terminal ${tileId} not found`);
    pty.write(data);
  }

  resize(tileId: string, cols: number, rows: number): void {
    const pty = this.processes.get(tileId);
    if (!pty) return;
    pty.resize(cols, rows);
  }

  kill(tileId: string): void {
    const pty = this.processes.get(tileId);
    if (!pty) return;
    pty.kill();
    this.processes.delete(tileId);
    this.setStatus(tileId, 'stopped');
  }

  private setStatus(tileId: string, status: TerminalStatus): void {
    const tile = this.tiles.get(tileId);
    if (!tile) return;
    tile.status = status;
    this.emit('event', {
      tileId,
      type: 'status',
      data: status,
    } as TerminalEvent);
  }

  list(): TerminalTileState[] {
    return Array.from(this.tiles.values());
  }
}
