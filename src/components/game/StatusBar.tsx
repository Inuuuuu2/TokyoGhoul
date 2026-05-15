import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Skull, HeartPulse, Clock, MapPin, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../utils/cn";
import { useState } from "react";

interface StatusBarProps {
  rcLevel: number;
  hunger: number;
  suspicion: number;
  sanity: number;
  time: string;
  location: string;
  className?: string;
}

export function StatusBar({ rcLevel, hunger, suspicion, sanity, time, location, className }: StatusBarProps) {
  const [isFolded, setIsFolded] = useState(false);

  return (
    <div className={cn("flex flex-col bg-ghoul-darker border-b border-ghoul-red/20 transition-all duration-300", className)}>
      <div
        className="flex justify-between items-center px-3 md:px-4 py-2 cursor-pointer hover:bg-ghoul-dark transition-colors gap-2"
        onClick={() => setIsFolded(!isFolded)}
      >
        <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-ghoul-muted min-w-0 flex-1">
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-ghoul-red" />
            <span className="font-mono">{time}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-ghoul-red flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 text-ghoul-muted hover:text-ghoul-red transition-colors flex-shrink-0">
          <span className="hidden sm:inline text-[10px] md:text-xs font-mono tracking-widest">{isFolded ? '展开状态 EXPAND' : '折叠状态 FOLD'}</span>
          {isFolded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isFolded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-3 md:px-4 pb-3 md:pb-4 pt-1 md:pt-2">
              <StatBar icon={<HeartPulse className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Rc细胞" value={rcLevel} color="bg-red-600" />
              <StatBar icon={<Coffee className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="饥饿度" value={hunger} color="bg-orange-500" />
              <StatBar icon={<Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="CCG警戒" value={suspicion} color="bg-blue-600" />
              <StatBar icon={<Skull className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="理智" value={sanity} color="bg-purple-600" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBar({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex justify-between text-[10px] md:text-xs items-center min-w-0">
        <span className="flex items-center gap-1 text-ghoul-text truncate">{icon} {label}</span>
        <span className="font-mono text-ghoul-muted flex-shrink-0 ml-1">{value}%</span>
      </div>
      <div className="h-1.5 md:h-2 w-full bg-ghoul-gray rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full shadow-[0_0_10px_rgba(255,0,0,0.5)]", color)}
        />
      </div>
    </div>
  );
}
