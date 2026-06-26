import * as path from 'node:path';
import { readJson, writeJson } from './storage';
import type { StoredTileLayout, StoredTileLayouts } from './types';
import type { TileRole } from '../terminal/types';

const VALID_ROLES: readonly TileRole[] = ['builder', 'tester', 'reviewer', 'server', 'verifier', 'plain'];

export class LayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LayoutValidationError';
  }
}

export function validateLayoutPayload(layout: unknown): asserts layout is StoredTileLayout {
  if (!layout || typeof layout !== 'object') {
    throw new LayoutValidationError('layout must be an object');
  }

  const { workspaceId, tiles } = layout as Partial<StoredTileLayout>;

  if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
    throw new LayoutValidationError('workspaceId must be a non-empty string');
  }

  if (!Array.isArray(tiles)) {
    throw new LayoutValidationError('tiles must be an array');
  }

  for (const tile of tiles) {
    if (!tile || typeof tile !== 'object') {
      throw new LayoutValidationError('each tile must be an object');
    }

    const { id, title, role, cwd, shell, shellArgs } = tile as Partial<StoredTileLayout['tiles'][number]>;

    if (typeof id !== 'string' || id.length === 0) {
      throw new LayoutValidationError('each tile must have a non-empty id');
    }
    if (typeof title !== 'string' || title.length === 0) {
      throw new LayoutValidationError('each tile must have a non-empty title');
    }
    if (typeof role !== 'string' || !VALID_ROLES.includes(role as TileRole)) {
      throw new LayoutValidationError(`each tile must have a valid role: ${VALID_ROLES.join(', ')}`);
    }
    if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) {
      throw new LayoutValidationError('each tile must have an absolute cwd');
    }
    if (typeof shell !== 'string' || shell.length === 0 || shell.includes('\\') || shell.includes('/')) {
      throw new LayoutValidationError('each tile shell must be a simple executable name');
    }
    if (shellArgs !== undefined && !Array.isArray(shellArgs)) {
      throw new LayoutValidationError('shellArgs must be an array when provided');
    }
  }
}

export class TileLayoutStorage {
  constructor(private dataDir: string) {}

  private get filePath(): string {
    return path.join(this.dataDir, 'tile-layouts.json');
  }

  async loadLayouts(): Promise<StoredTileLayouts> {
    return readJson<StoredTileLayouts>(this.filePath, { layouts: [] });
  }

  async saveLayout(layout: StoredTileLayout): Promise<void> {
    validateLayoutPayload(layout);
    const data = await this.loadLayouts();
    const index = data.layouts.findIndex((l) => l.workspaceId === layout.workspaceId);
    if (index >= 0) {
      data.layouts[index] = layout;
    } else {
      data.layouts.push(layout);
    }
    await writeJson(this.filePath, data);
  }
}
