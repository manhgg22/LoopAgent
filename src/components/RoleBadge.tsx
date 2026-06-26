import type { TileRole } from '../../electron/terminal/types';

const ROLE_COLORS: Record<TileRole, string> = {
  plain: 'bg-slate-600',
  builder: 'bg-blue-600',
  tester: 'bg-green-600',
  reviewer: 'bg-purple-600',
  server: 'bg-yellow-600',
  verifier: 'bg-red-600',
};

interface RoleBadgeProps {
  role: TileRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`text-[10px] uppercase px-1.5 py-0.5 rounded text-white ${ROLE_COLORS[role]}`}
    >
      {role}
    </span>
  );
}
