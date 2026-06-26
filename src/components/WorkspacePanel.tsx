import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

export function WorkspacePanel() {
  const { currentWorkspace, recentWorkspaces, setCurrentWorkspace, setRecentWorkspaces } =
    useWorkspaceStore();
  const [pathInput, setPathInput] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const list = await window.workspaceApi.listWorkspaces();
    const current = await window.workspaceApi.getCurrentWorkspace();
    setRecentWorkspaces(list);
    setCurrentWorkspace(current);
  };

  const addWorkspace = async () => {
    if (!pathInput) return;
    try {
      const workspace = await window.workspaceApi.addWorkspace(pathInput);
      setCurrentWorkspace(workspace);
      await refresh();
      setPathInput('');
    } catch (err) {
      alert(`Failed to add workspace: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const openWorkspace = async (id: string) => {
    const workspace = await window.workspaceApi.openWorkspace(id);
    if (workspace) {
      setCurrentWorkspace(workspace);
      await refresh();
    }
  };

  const removeWorkspace = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await window.workspaceApi.removeWorkspace(id);
    await refresh();
  };

  return (
    <aside className="w-64 border-r border-slate-700 bg-slate-900 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">Workspaces</h2>
      </div>
      <div className="p-3 flex gap-2">
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addWorkspace()}
          placeholder="C:\\path\\to\\repo"
          className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-100"
        />
        <button
          onClick={addWorkspace}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
        >
          Add
        </button>
      </div>
      <ul className="flex-1 overflow-auto">
        {recentWorkspaces.map((ws) => (
          <li
            key={ws.id}
            onClick={() => openWorkspace(ws.id)}
            className={`px-3 py-2 text-xs cursor-pointer border-b border-slate-800 flex justify-between items-center ${
              ws.id === currentWorkspace?.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'
            }`}
          >
            <div>
              <div className="font-medium text-slate-200">{ws.name}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{ws.repoPath}</div>
              <div className="text-[10px] text-slate-500">
                {ws.status === 'valid' ? `🌿 ${ws.branch ?? 'unknown'}` : `⚠️ ${ws.status}`}
              </div>
            </div>
            <button
              onClick={(e) => removeWorkspace(ws.id, e)}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
