import { useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTaskStore } from '../store/taskStore';
import { useVerifyStore } from '../store/verifyStore';
import type { VerifyStatus } from '../../electron/verify/types';

const STATUS_COLORS: Record<VerifyStatus, string> = {
  pass: 'bg-green-600',
  fail: 'bg-red-600',
  missing: 'bg-yellow-600',
  error: 'bg-red-700',
};

export function VerifyPanel() {
  const { currentWorkspace } = useWorkspaceStore();
  const { currentTask } = useTaskStore();
  const { setRunningTaskId, setResult, outputsByTask, runningTaskId, getLatestForTask } = useVerifyStore();
  const [liveOutput, setLiveOutput] = useState('');

  if (!currentWorkspace || !currentTask) {
    return (
      <aside className="w-80 border-l border-slate-700 bg-slate-900 p-4 text-slate-400 text-sm">
        Open a workspace and start a task to run verify.
      </aside>
    );
  }

  const latest = getLatestForTask(currentTask.id);
  const output = outputsByTask[currentTask.id] ?? '';

  const runVerify = async () => {
    if (!currentTask || runningTaskId) return;
    setRunningTaskId(currentTask.id);
    setLiveOutput('');

    const outputParts: string[] = [];
    const result = await window.verifyApi.runVerify(currentWorkspace.id, currentTask.id);

    if (!result.success) {
      const errorResult = {
        id: `verify-error-${Date.now()}`,
        taskId: currentTask.id,
        workspaceId: currentWorkspace.id,
        command: '',
        exitCode: null,
        status: 'error' as const,
        outputPath: '',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };
      setResult(currentTask.id, errorResult, result.error ?? 'unknown error');
      setRunningTaskId(null);
      return;
    }

    if (!result.result) {
      const errorResult = {
        id: `verify-error-${Date.now()}`,
        taskId: currentTask.id,
        workspaceId: currentWorkspace.id,
        command: '',
        exitCode: null,
        status: 'error' as const,
        outputPath: '',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      };
      setResult(currentTask.id, errorResult, 'verify returned no result');
      setRunningTaskId(null);
      return;
    }

    setResult(currentTask.id, result.result, outputParts.join(''));
  };

  return (
    <aside className="w-80 border-l border-slate-700 bg-slate-900 flex flex-col">
      <div className="p-3 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-200">Verify Runner</h2>
        {latest && (
          <span className={`text-[10px] uppercase px-2 py-0.5 rounded text-white ${STATUS_COLORS[latest.status]}`}>
            {latest.status}
          </span>
        )}
      </div>
      <div className="p-3 border-b border-slate-700">
        <button
          onClick={runVerify}
          disabled={runningTaskId === currentTask.id}
          className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 rounded text-sm font-medium"
        >
          {runningTaskId === currentTask.id ? 'Running…' : 'Run verify.ps1'}
        </button>
        {latest?.status === 'missing' && (
          <p className="mt-2 text-xs text-yellow-400">
            scripts/verify.ps1 not found. Add the script or use Harness Setup.
          </p>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        <h3 className="text-xs font-semibold text-slate-400 mb-2">Output</h3>
        <pre className="text-xs font-mono bg-slate-950 p-2 rounded text-slate-300 whitespace-pre-wrap">
          {liveOutput || output || 'No output yet.'}
        </pre>
      </div>
      {latest?.outputPath && (
        <div className="p-2 text-[10px] text-slate-500 border-t border-slate-700 truncate" title={latest.outputPath}>
          {latest.outputPath}
        </div>
      )}
    </aside>
  );
}
