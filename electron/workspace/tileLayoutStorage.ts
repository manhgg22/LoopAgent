import * as path from 'node:path';
import { readJson, writeJson } from './storage';
import type { StoredTileLayout, StoredTileLayouts } from './types';

export class TileLayoutStorage {
  constructor(private dataDir: string) {}

  private get filePath(): string {
    return path.join(this.dataDir, 'tile-layouts.json');
  }

  async loadLayouts(): Promise<StoredTileLayouts> {
    return readJson<StoredTileLayouts>(this.filePath, { layouts: [] });
  }

  async saveLayout(layout: StoredTileLayout): Promise<void> {
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
