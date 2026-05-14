import { Modal } from '../ui/Modal';
import { motion } from 'framer-motion';

interface AreaMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AreaMapModal({ isOpen, onClose }: AreaMapModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="区域简图: 第20区" className="max-w-3xl">
      <div className="aspect-[16/9] bg-[#050505] relative border border-[#222] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute rounded-full border border-ghoul-red pointer-events-none"
          style={{ width: '100px', height: '100px', top: 'calc(40% - 50px)', left: 'calc(30% - 50px)' }}
        />
        <div className="absolute top-[40%] left-[30%] w-3 h-3 bg-red-600 rounded-full shadow-[0_0_10px_red] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-ghoul-red text-white text-xs whitespace-nowrap px-2 py-1 z-10">当前位置</div>
        </div>
        <span className="absolute top-[43%] left-[30%] text-xs text-red-500 font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]">CURRENT POS</span>

        <div className="absolute top-[20%] right-[30%] w-2 h-2 bg-[#ccc] rounded-full shadow-[0_0_5px_white] -translate-x-1/2 -translate-y-1/2 group cursor-pointer hover:scale-150 transition-transform">
           <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[#ccc] text-white text-xs whitespace-nowrap px-2 py-1 z-10">咖啡店「古董」</div>
        </div>
        <span className="absolute top-[23%] right-[30%] text-xs text-[#ccc] font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">ANTEIKU</span>

        <div className="absolute bottom-[20%] left-[50%] w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_blue] -translate-x-1/2 -translate-y-1/2 group cursor-pointer hover:scale-150 transition-transform">
           <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-blue-500 text-white text-xs whitespace-nowrap px-2 py-1 z-10">CCG 20区支部</div>
        </div>
        <span className="absolute bottom-[23%] left-[50%] text-xs text-blue-400 font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">CCG BRANCH 20</span>

        <div className="absolute bottom-4 right-4 text-xs font-mono text-[#333]">MAP DATA: OFFLINE</div>
      </div>
    </Modal>
  );
}
