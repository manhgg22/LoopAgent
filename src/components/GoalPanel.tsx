import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTaskStore } from '../store/taskStore';
import { useTerminalStore } from '../store/terminalStore';
import { generateRolePrompt } from '../lib/promptGenerator';
import type { GoalContract } from '../lib/goalContract';
import { ROLES } from '../../electron/terminal/rolePresets';
import type { TileRole } from '../../electron/terminal/types';
import { RoleBadge } from './RoleBadge';

export function GoalPanel() {
  const { currentWorkspace } = useWorkspaceStore();
  const { currentTask, startNewTask, updateCurrentTask } = useTaskStore();
  const tiles = useTerminalStore((state) =>
    currentWorkspace ? state.tilesByWorkspace[currentWorkspace.id] ?? [] : []
  );

  useEffect(() => {
    if (currentWorkspace && !currentTask) {
      startNewTask(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, currentTask, startNewTask]);

  if (!currentWorkspace || !currentTask) {
    return (
      <aside className="w-80 border-l border-slate-700 bg-slate-900 p-4 text-slate-400 text-sm">
        Open a workspace to start a task.
      </aside>
    );
  }

  const fields = [
    { key: 'title', label: 'Title', rows: 1 },
    { key: 'task', label: 'TASK', rows: 3 },
    { key: 'goal', label: 'GOAL', rows: 3 },
    { key: 'scope', label: 'SCOPE', rows: 3 },
    { key: 'doNot', label: 'DO NOT', rows: 3 },
    { key: 'verify', label: 'VERIFY', rows: 3 },
    { key: 'doneWhen', label: 'DONE WHEN', rows: 3 },
  ] as const;

  const updateField = (key: typeof fields[number]['key'], value: string) => {
    updateCurrentTask({ [key]: value } as Partial<GoalContract>);
  };

  const copyPrompt = async (role: TileRole) => {
    const prompt = generateRolePrompt(role, currentTask);
    await navigator.clipboard.writeText(prompt);
  };

  const sendPrompt = (role: TileRole) => {
    const target = tiles.find((t) => t.role === role);
    if (!target) {
      alert(`No ${role} tile found. Create one first.`);
      return;
    }
    const prompt = generateRolePrompt(role, currentTask);
    window.terminalApi.writeInput(target.id, prompt + '\r');
  };

  return (
    <aside className="w-80 border-l border-slate-700 bg-slate-900 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">Goal Contract</h2>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {fields.map(({ key, label, rows }) => (
          <div key={key}>
            <label htmlFor={key} className="block text-xs text-slate-400 mb-1">
              {label}
            </label>
            <textarea
              id={key}
              value={currentTask[key]}
              onChange={(e) => updateField(key, e.target.value)}
              rows={rows}
              className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-100 resize-none"
            />
          </div>
        ))}
        <div>
          <label htmlFor="maxLoop" className="block text-xs text-slate-400 mb-1">
            MAX LOOP
          </label>
          <input
            id="maxLoop"
            type="number"
            min={1}
            max={20}
            value={currentTask.maxLoop}
            onChange={(e) => updateCurrentTask({ maxLoop: parseInt(e.target.value, 10) || 1 })}
            className="w-20 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-100"
          />
        </div>
      </div>
      <div className="p-3 border-t border-slate-700 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300">Send / Copy Prompt</h3>
        {ROLES.filter((r) => r !== 'plain').map((role) => (
          <div key={role} className="flex items-center gap-2">
            <RoleBadge role={role} />
            <button
              onClick={() => sendPrompt(role)}
              className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
            >
              Send to {role}
            </button>
            <button
              onClick={() => copyPrompt(role)}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
