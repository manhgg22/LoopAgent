export type VerifyStatus = 'pass' | 'fail' | 'missing' | 'error';

export interface VerifyResult {
  id: string;
  taskId: string;
  workspaceId: string;
  command: string;
  exitCode: number | null;
  status: VerifyStatus;
  outputPath: string;
  startedAt: string;
  endedAt: string;
}
