import { WorkspacePanel } from './WorkspacePanel';
import { WorkspaceInfo } from './WorkspaceInfo';
import { TileCanvas } from './TileCanvas';
import { GoalPanel } from './GoalPanel';
import { VerifyPanel } from './VerifyPanel';

export function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 flex items-center px-4 border-b border-slate-700 bg-slate-900">
        <h1 className="text-lg font-bold">AI Dev Control Room</h1>
        <span className="ml-3 text-xs text-slate-400">Phase 4 — Verify Runner</span>
      </header>
      <div className="flex flex-1 min-h-0">
        <WorkspacePanel />
        <main className="flex-1 flex flex-col min-w-0">
          <WorkspaceInfo />
          <TileCanvas />
        </main>
        <div className="flex flex-col w-80 border-l border-slate-700">
          <div className="flex-1 min-h-0 overflow-hidden">
            <GoalPanel />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden border-t border-slate-700">
            <VerifyPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
