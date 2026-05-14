import { Modal } from '../ui/Modal';

interface NpcProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NpcProfileModal({ isOpen, onClose }: NpcProfileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="情报档案: 目标对象">
      <div className="flex gap-6">
        <div className="w-32 h-40 bg-[#1a1a1a] border border-[#333] flex-shrink-0 relative overflow-hidden flex items-center justify-center">
          <span className="text-ghoul-muted text-xs">NO IMAGE DATA</span>
          <div className="absolute inset-0 bg-gradient-to-t from-ghoul-red/20 to-transparent mix-blend-overlay"></div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded">代号 NAME</span>
            <span className="text-ghoul-red font-bold tracking-widest text-lg">神代 利世 (Rize Kamishiro)</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded"> Rc类型 TYPE</span>
            <span className="text-white tracking-widest font-serif">鳞赫 (Rinkaku)</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded"> 危险评级 RANK</span>
            <span className="text-orange-500 font-bold tracking-widest font-serif">S~SS</span>
          </div>
          <p className="text-sm text-ghoul-muted leading-relaxed mt-4 border-l-2 border-ghoul-red/50 pl-3">
            被CCG称为「暴食者」的危险喰种。外表是优雅的知性女性，但其捕食行为毫无节制且极端残忍。
          </p>
        </div>
      </div>
    </Modal>
  );
}
