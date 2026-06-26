import { useWorkspaceStore } from '../store/workspaceStore';

export function WorkspaceInfo() {
  const { currentWorkspace } = useWorkspaceStore();
  if (!currentWorkspace) return null;

  return (
    <div className="px-4 py-1 text-xs flex items-center gap-3 bg-slate-800/50 border-b border-slate-700">
      <span className="font-semibold text-slate-200">{currentWorkspace.name}</span>
      <span className="text-slate-400">{currentWorkspace.repoPath}</span>
      {currentWorkspace.status === 'valid' ? (
        <span className="text-green-400">🌿 {currentWorkspace.branch ?? 'unknown'}</span>
      ) : (
        <span className="text-yellow-400">⚠️ {currentWorkspace.status}</span>
      )}
    </div>
  );
}
