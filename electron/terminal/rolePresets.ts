import type { TileRole } from './types';

export interface RolePreset {
  role: TileRole;
  label: string;
  titlePrefix: string;
  shell: string;
  shellArgs: string[];
  command?: string;
}

export const ROLE_PRESETS: Record<TileRole, RolePreset> = {
  plain: {
    role: 'plain',
    label: 'Plain',
    titlePrefix: 'PowerShell',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
  },
  builder: {
    role: 'builder',
    label: 'Builder',
    titlePrefix: 'Builder',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'claude',
  },
  tester: {
    role: 'tester',
    label: 'Tester',
    titlePrefix: 'Tester',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'codex',
  },
  reviewer: {
    role: 'reviewer',
    label: 'Reviewer',
    titlePrefix: 'Reviewer',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'claude',
  },
  server: {
    role: 'server',
    label: 'Server',
    titlePrefix: 'Server',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'powershell -ExecutionPolicy Bypass -File .\\scripts\\dev.ps1',
  },
  verifier: {
    role: 'verifier',
    label: 'Verifier',
    titlePrefix: 'Verifier',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    command: 'powershell -ExecutionPolicy Bypass -File .\\scripts\\verify.ps1',
  },
};

export const ROLES: TileRole[] = ['plain', 'builder', 'tester', 'reviewer', 'server', 'verifier'];

export function getRolePreset(role: TileRole): RolePreset {
  return ROLE_PRESETS[role] ?? ROLE_PRESETS.plain;
}
