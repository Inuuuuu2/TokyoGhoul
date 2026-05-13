import { motion } from "framer-motion";
import { Coffee, Skull, HeartPulse, Clock, MapPin, Eye, BookOpen, Settings } from "lucide-react";
import { cn } from "../../utils/cn";

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
  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-ghoul-darker border-b border-ghoul-red/20", className)}>
      <div className="flex justify-between items-center text-sm text-ghoul-muted">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-ghoul-red" />
          <span className="font-mono">{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-ghoul-red" />
          <span>{location}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBar icon={<HeartPulse className="w-4 h-4" />} label="Rc细胞" value={rcLevel} color="bg-red-600" />
        <StatBar icon={<Coffee className="w-4 h-4" />} label="饥饿度" value={hunger} color="bg-orange-500" />
        <StatBar icon={<Eye className="w-4 h-4" />} label="CCG警戒" value={suspicion} color="bg-blue-600" />
        <StatBar icon={<Skull className="w-4 h-4" />} label="理智" value={sanity} color="bg-purple-600" />
      </div>
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