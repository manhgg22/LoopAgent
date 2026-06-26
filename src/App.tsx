import { TileGrid } from './components/TileGrid';
import { TileToolbar } from './components/TileToolbar';

export default function App() {
  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 flex items-center px-4 border-b border-slate-700 bg-slate-900">
        <h1 className="text-lg font-bold">AI Dev Control Room</h1>
        <span className="ml-3 text-xs text-slate-400">Phase 1 — Local Terminal Control Room</span>
      </header>
      <TileToolbar />
      <TileGrid />
    </div>
  );
}
