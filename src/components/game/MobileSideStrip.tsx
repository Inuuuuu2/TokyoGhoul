import { Heart, Map, User } from 'lucide-react';

interface MobileSideStripProps {
  npcName: string;
  npcTitle: string;
  affinity: number;
  onOpenNpc: () => void;
  onOpenMap: () => void;
}

export function MobileSideStrip({
  npcName,
  npcTitle,
  affinity,
  onOpenNpc,
  onOpenMap,
}: MobileSideStripProps) {
  const safeAffinity = Math.min(100, Math.max(0, affinity));
  return (
    <div className="md:hidden flex items-stretch gap-2 px-3 py-2 bg-[#0a0a0c] border-b border-[#222]">
      <button
        onClick={onOpenNpc}
        className="flex-1 flex items-center gap-2 px-2 py-1.5 bg-[#111] border border-[#222] active:border-ghoul-red text-left min-w-0"
      >
        <User className="w-4 h-4 text-ghoul-red flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-white truncate tracking-wider font-serif">{npcName}</span>
          <span className="text-[10px] text-ghoul-muted font-mono truncate">{npcTitle}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[64px]">
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <Heart
              className={`w-3 h-3 ${
                safeAffinity > 50 ? 'text-ghoul-red fill-ghoul-red/50' : 'text-gray-500'
              }`}
            />
            <span className={safeAffinity > 50 ? 'text-ghoul-red' : 'text-gray-400'}>
              {Math.round(safeAffinity)}
            </span>
          </div>
          <div className="w-14 h-0.5 bg-[#111] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-900 to-ghoul-red transition-all duration-700"
              style={{ width: `${safeAffinity}%` }}
            />
          </div>
        </div>
      </button>
      <button
        onClick={onOpenMap}
        className="flex items-center justify-center w-11 px-2 bg-[#111] border border-[#222] active:border-ghoul-red"
        aria-label="区域地图"
      >
        <Map className="w-4 h-4 text-ghoul-muted" />
      </button>
    </div>
  );
}
