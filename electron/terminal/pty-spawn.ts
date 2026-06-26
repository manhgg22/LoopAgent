import * as pty from 'node-pty';

export interface PtyProcess {
  pid: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(handler: (data: string) => void): void;
  onExit(handler: (exitCode: number, signal?: number) => void): void;
}

export function spawnPty(
  shell: string,
  shellArgs: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): PtyProcess {
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-color',
    cwd,
    env: env as { [key: string]: string },
  });

  return {
    pid: ptyProcess.pid,
    write: (data) => ptyProcess.write(data),
    resize: (cols, rows) => ptyProcess.resize(cols, rows),
    kill: (signal) => ptyProcess.kill(signal),
    onData: (handler) => ptyProcess.onData(handler),
    onExit: (handler) => ptyProcess.onExit(({ exitCode, signal }) => handler(exitCode, signal)),
  };
}
