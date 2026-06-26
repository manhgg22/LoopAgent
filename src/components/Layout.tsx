import { WorkspacePanel } from './WorkspacePanel';
import { WorkspaceInfo } from './WorkspaceInfo';
import { TileCanvas } from './TileCanvas';

export function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 flex items-center px-4 border-b border-slate-700 bg-slate-900">
        <h1 className="text-lg font-bold">AI Dev Control Room</h1>
        <span className="ml-3 text-xs text-slate-400">Phase 2 — Workspace Manager + Multiple Tiles</span>
      </header>
      <div className="flex flex-1 min-h-0">
        <WorkspacePanel />
        <main className="flex-1 flex flex-col min-w-0">
          <WorkspaceInfo />
          <TileCanvas />
        </main>
      </div>
    </div>
  );
}
