import { motion } from "framer-motion";

interface Option {
  id: string;
  text: string;
  icon?: React.ReactNode;
}

export function OptionList({ options, onSelect }: { options: Option[], onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3 mt-8">
      {options.map((opt, i) => (
        <motion.button
          key={opt.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => onSelect(opt.id)}
          className="group relative flex items-center gap-3 p-4 bg-[#111] border border-[#333] hover:border-ghoul-red hover:bg-[#1a0505] transition-all text-left overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-ghoul-red/20 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out" />
          <span className="relative text-ghoul-muted group-hover:text-white transition-colors flex-1">
            {opt.text}
          </span>
          <div className="relative w-1.5 h-1.5 rounded-full border border-ghoul-muted group-hover:border-ghoul-red group-hover:bg-ghoul-red transition-all" />
        </motion.button>
      ))}
    </div>
  );
}