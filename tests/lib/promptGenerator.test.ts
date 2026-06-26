import { describe, it, expect } from 'vitest';
import { generateRolePrompt } from '../../src/lib/promptGenerator';
import { createDraftTask } from '../../src/lib/goalContract';

describe('promptGenerator', () => {
  const task = {
    ...createDraftTask('w1'),
    task: 'Fix login bug',
    goal: 'Users can log in',
    scope: 'auth module',
    doNot: 'touch UI',
    verify: 'login test passes',
    doneWhen: 'test passes',
    maxLoop: 3,
  };

  it('builder prompt mentions implement', () => {
    const prompt = generateRolePrompt('builder', task);
    expect(prompt).toContain('You are the Builder');
    expect(prompt).toContain('TASK: Fix login bug');
    expect(prompt).toContain('Implement');
  });

  it('verifier prompt mentions verify script', () => {
    const prompt = generateRolePrompt('verifier', task);
    expect(prompt).toContain('You are the Verifier');
    expect(prompt).toContain('PASS');
  });

  it('plain prompt includes header by default', () => {
    const prompt = generateRolePrompt('plain', task);
    expect(prompt).toContain('You are the Plain. Workspace: w1');
    expect(prompt).toContain('TASK: Fix login bug');
  });

  it('can omit header', () => {
    const builderPrompt = generateRolePrompt('builder', task, { includeHeader: false });
    expect(builderPrompt).not.toContain('You are the Builder');

    const plainPrompt = generateRolePrompt('plain', task, { includeHeader: false });
    expect(plainPrompt).not.toContain('You are the');
  });
});
