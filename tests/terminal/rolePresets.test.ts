import { describe, it, expect } from 'vitest';
import { getRolePreset, ROLE_PRESETS, ROLES } from '../../electron/terminal/rolePresets';

describe('rolePresets', () => {
  it('has all six roles', () => {
    expect(ROLES).toEqual(['plain', 'builder', 'tester', 'reviewer', 'server', 'verifier']);
  });

  it('builder uses claude command', () => {
    expect(ROLE_PRESETS.builder.command).toBe('claude');
  });

  it('verifier targets verify.ps1', () => {
    expect(ROLE_PRESETS.verifier.command).toContain('verify.ps1');
  });

  it('returns plain preset for unknown role', () => {
    const preset = getRolePreset('plain');
    expect(preset.role).toBe('plain');
  });
});
