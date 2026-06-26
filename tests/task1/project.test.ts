import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = process.cwd();

describe('Task 1 project scaffold', () => {
  it('package.json exists with required scripts', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('ai-dev-control-room');
    expect(pkg.version).toBe('0.1.0');
    expect(pkg.type).toBe('module');
    expect(pkg.scripts.dev).toBe('vite');
    expect(pkg.scripts.build).toBe('tsc && vite build');
    expect(pkg.scripts.electronDev).toBeUndefined();
    expect(pkg.scripts['electron:dev']).toBe('vite');
    expect(pkg.scripts['electron:build']).toBe('npm run build && electron-builder');
    expect(pkg.scripts.test).toBe('vitest run');
    expect(pkg.scripts['test:watch']).toBe('vitest');
  });

  it('required config files exist', () => {
    for (const file of ['tsconfig.json', 'tsconfig.node.json', 'vite.config.ts', 'index.html']) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
  });

  it('index.html references React entry', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(html).toContain('<title>AI Dev Control Room</title>');
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
  });

  it('vite config uses react and electron plugins', () => {
    const cfg = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
    expect(cfg).toContain("import react from '@vitejs/plugin-react';");
    expect(cfg).toContain("import electron from 'vite-plugin-electron';");
    expect(cfg).toContain("entry: ['electron/main.ts', 'electron/preload.ts']");
    expect(cfg).toContain("outDir: 'dist'");
  });
});
