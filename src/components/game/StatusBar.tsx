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
        className="flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-ghoul-dark transition-colors"
        onClick={() => setIsFolded(!isFolded)}
      >
        <div className="flex items-center gap-4 text-sm text-ghoul-muted">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-ghoul-red" />
            <span className="font-mono">{time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-ghoul-red" />
            <span>{location}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-ghoul-muted hover:text-ghoul-red transition-colors">
          <span className="text-xs font-mono tracking-widest">{isFolded ? '展开状态 EXPAND' : '折叠状态 FOLD'}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 pt-2">
              <StatBar icon={<HeartPulse className="w-4 h-4" />} label="Rc细胞" value={rcLevel} color="bg-red-600" />
              <StatBar icon={<Coffee className="w-4 h-4" />} label="饥饿度" value={hunger} color="bg-orange-500" />
              <StatBar icon={<Eye className="w-4 h-4" />} label="CCG警戒" value={suspicion} color="bg-blue-600" />
              <StatBar icon={<Skull className="w-4 h-4" />} label="理智" value={sanity} color="bg-purple-600" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBar({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs items-center">
        <span className="flex items-center gap-1 text-ghoul-text">{icon} {label}</span>
        <span className="font-mono text-ghoul-muted">{value}%</span>
      </div>
      <div className="h-2 w-full bg-ghoul-gray rounded-full overflow-hidden">
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
