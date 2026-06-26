import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { VerifyRunner } from '../../electron/verify/VerifyRunner';

let tmpDir = '';

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-dev-verify-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function createVerifyScript(content: string): Promise<void> {
  const scriptsDir = path.join(tmpDir, 'scripts');
  await fs.mkdir(scriptsDir, { recursive: true });
  await fs.writeFile(path.join(scriptsDir, 'verify.ps1'), content, 'utf-8');
}

describe('VerifyRunner', () => {
  it('detects missing verify.ps1', async () => {
    const runner = new VerifyRunner(tmpDir);
    expect(await runner.detect()).toBe(false);
  });

  it('detects existing verify.ps1', async () => {
    await createVerifyScript('Write-Host "ok"');
    const runner = new VerifyRunner(tmpDir);
    expect(await runner.detect()).toBe(true);
  });

  it('returns missing result when script absent', async () => {
    const runner = new VerifyRunner(tmpDir);
    const result = await runner.run('task-1', 'w1');
    expect(result.status).toBe('missing');
  });

  it('runs passing script and saves evidence', async () => {
    await createVerifyScript('Write-Host "PASS"' + '\n' + 'exit 0');
    const runner = new VerifyRunner(tmpDir);
    const result = await runner.run('task-1', 'w1');
    expect(result.status).toBe('pass');
    expect(result.exitCode).toBe(0);
    expect(result.outputPath).toContain('artifacts\\evidence\\task-1');
    const saved = await fs.readFile(result.outputPath, 'utf-8');
    expect(saved).toContain('PASS');
  });

  it('runs failing script and saves evidence', async () => {
    await createVerifyScript('Write-Error "FAIL"' + '\n' + 'exit 1');
    const runner = new VerifyRunner(tmpDir);
    const result = await runner.run('task-1', 'w1');
    expect(result.status).toBe('fail');
    expect(result.exitCode).toBe(1);
  });
});
