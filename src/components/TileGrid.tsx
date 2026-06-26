import { useTerminalStore } from '../store/terminalStore';
import { TerminalTile } from './TerminalTile';

export function TileGrid() {
  const { tiles } = useTerminalStore();

  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-[calc(100vh-80px)]">
      {tiles.map((tile) => (
        <TerminalTile key={tile.id} tileId={tile.id} />
      ))}
    </div>
  );
}
