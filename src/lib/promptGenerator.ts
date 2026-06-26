import type { DevTask } from './goalContract';
import type { TileRole } from '../../electron/terminal/types';
import { getRolePreset } from '../../electron/terminal/rolePresets';

export interface PromptOptions {
  includeHeader?: boolean;
}

function formatContract(task: DevTask): string {
  return [
    `TASK: ${task.task}`,
    `GOAL: ${task.goal}`,
    `SCOPE: ${task.scope}`,
    `DO NOT: ${task.doNot}`,
    `VERIFY: ${task.verify}`,
    `DONE WHEN: ${task.doneWhen}`,
    `MAX LOOP: ${task.maxLoop}`,
  ].join('\n');
}

export function generateRolePrompt(role: TileRole, task: DevTask, options: PromptOptions = {}): string {
  const preset = getRolePreset(role);
  const header = options.includeHeader !== false
    ? `You are the ${preset.label}. Workspace: ${task.workspaceId}\n\n`
    : '';
  const contract = formatContract(task);

  switch (role) {
    case 'builder':
      return `${header}Implement the following task. Stay in scope, respect the DO NOT list, and stop when DONE WHEN is met.\n\n${contract}`;
    case 'tester':
      return `${header}Run tests and report PASS/FAIL. Do not modify source code.\n\n${contract}`;
    case 'reviewer':
      return `${header}Review the current changes (git diff). Point out risks, bugs, and style issues. Do not edit files.\n\n${contract}`;
    case 'server':
      return `${header}Start the development server. Keep it running.\n\n${contract}`;
    case 'verifier':
      return `${header}Run the verify script and return only PASS or FAIL with concise evidence.\n\n${contract}`;
    case 'plain':
    default:
      return `${header}${contract}`;
  }
}
