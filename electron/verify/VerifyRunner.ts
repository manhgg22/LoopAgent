import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { VerifyResult, VerifyStatus } from './types';

export class VerifyRunner {
  constructor(private workspacePath: string) {}

  private get verifyScriptPath(): string {
    return path.join(this.workspacePath, 'scripts', 'verify.ps1');
  }

  private get evidenceDir(): string {
    return path.join(this.workspacePath, 'artifacts', 'evidence');
  }

  async detect(): Promise<boolean> {
    try {
      const stat = await fs.stat(this.verifyScriptPath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  async run(taskId: string, workspaceId: string, onOutput?: (chunk: string) => void): Promise<VerifyResult> {
    const exists = await this.detect();
    const now = new Date().toISOString();
    const id = `verify-${Date.now()}`;

    if (!exists) {
      return {
        id,
        taskId,
        workspaceId,
        command: this.verifyScriptPath,
        exitCode: null,
        status: 'missing',
        outputPath: '',
        startedAt: now,
        endedAt: now,
      };
    }

    return new Promise((resolve) => {
      const command = `powershell.exe -ExecutionPolicy Bypass -File "${this.verifyScriptPath}"`;
      const proc = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', this.verifyScriptPath], {
        cwd: this.workspacePath,
      });

      const outputParts: string[] = [];
      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputParts.push(chunk);
        onOutput?.(chunk);
      });
      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        outputParts.push(chunk);
        onOutput?.(chunk);
      });

      proc.on('error', async (err) => {
        const endedAt = new Date().toISOString();
        const result: VerifyResult = {
          id,
          taskId,
          workspaceId,
          command,
          exitCode: null,
          status: 'error',
          outputPath: '',
          startedAt: now,
          endedAt,
        };
        resolve(result);
      });

      proc.on('close', async (exitCode) => {
        const endedAt = new Date().toISOString();
        const output = outputParts.join('');
        const status: VerifyStatus = exitCode === 0 ? 'pass' : 'fail';
        const evidencePath = path.join(this.evidenceDir, taskId);
        await fs.mkdir(evidencePath, { recursive: true });
        const outputFile = path.join(evidencePath, `${id}.txt`);
        await fs.writeFile(outputFile, output, 'utf-8');

        resolve({
          id,
          taskId,
          workspaceId,
          command,
          exitCode: exitCode ?? null,
          status,
          outputPath: outputFile,
          startedAt: now,
          endedAt,
        });
      });
    });
  }
}
