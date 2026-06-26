import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useTerminalStore } from '../store/terminalStore';
import { ROLES } from '../../electron/terminal/rolePresets';
import type { TileRole } from '../../electron/terminal/types';

interface TerminalTileProps {
  tileId: string;
  workspaceId: string;
}

export function TerminalTile({ tileId, workspaceId }: TerminalTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const updateTile = useTerminalStore((state) => state.updateTile);
  const tile = useTerminalStore((state) =>
    (state.tilesByWorkspace[workspaceId] ?? []).find((t) => t.id === tileId)
  );

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Consolas, monospace',
      fontSize: 14,
      theme: { background: '#0f172a', foreground: '#e2e8f0' },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);
    fitAddon.fit();
    term.focus();
    terminalRef.current = term;

    const unsubscribe = window.terminalApi.onTerminalEvent((event) => {
      if (event.tileId !== tileId) return;
      if (event.type === 'output' && typeof event.data === 'string') {
        term.write(event.data);
      }
      if (event.type === 'status' && typeof event.data === 'string') {
        updateTile(workspaceId, tileId, { status: event.data as any });
      }
    });

    const inputDisposable = term.onData((data) => {
      window.terminalApi.writeInput(tileId, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!fitAddonRef.current) return;
      fitAddonRef.current.fit();
      const cols = term.cols;
      const rows = term.rows;
      if (cols > 0 && rows > 0) {
        window.terminalApi.resizeTerminal(tileId, cols, rows);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      inputDisposable.dispose();
      unsubscribe();
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [tileId, workspaceId, updateTile]);

  if (!tile) return null;

  return (
    <div className="flex flex-col h-full border border-slate-700 rounded bg-slate-900">
      <div className="flex items-center justify-between px-3 py-1 border-b border-slate-700 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">{tile.title}</span>
          <select
            value={tile.role}
            onChange={(e) => updateTile(workspaceId, tileId, { role: e.target.value as TileRole })}
            className="text-xs bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-400">
          {tile.status} {tile.pid ? `(pid ${tile.pid})` : ''}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0"></div>
    </div>
  );
}
