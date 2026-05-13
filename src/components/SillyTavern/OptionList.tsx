import { motion } from 'framer-motion';
import { useState } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';

export function OptionList(props: { options: string[]; disabled: boolean; onPick: (text: string) => void; }) {
  const [custom, setCustom] = useState('');

  return (
    <div className="flex flex-col gap-3 mt-8">
      {props.options.length > 0 && <div className="text-sm font-serif text-ghoul-red/80 mb-2 px-1 border-l-2 border-ghoul-red/50 tracking-widest">请做出你的选择 YOUR CHOICE</div>}

      {props.options.map((opt, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          disabled={props.disabled}
          onClick={() => props.onPick(opt)}
          className="group relative flex items-start gap-3 p-4 bg-[#111] border border-[#333] hover:border-ghoul-red hover:bg-[#1a0505] transition-all text-left overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-ghoul-red/20 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out" />
          <span className="relative text-ghoul-red font-mono font-bold mt-0.5">[{i + 1}]</span>
          <span className="relative text-ghoul-muted group-hover:text-white transition-colors flex-1 leading-relaxed">
            {opt}
          </span>
          <div className="relative mt-1.5 w-1.5 h-1.5 rounded-full border border-ghoul-muted group-hover:border-ghoul-red group-hover:bg-ghoul-red transition-all" />
        </motion.button>
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: props.options.length * 0.1 }}
        className="flex items-center gap-3 mt-4 p-2 border border-[#222] bg-[#0a0a0c] focus-within:border-ghoul-red/50 focus-within:shadow-[0_0_15px_rgba(138,3,3,0.15)] transition-all"
      >
        <ChevronRight className="w-5 h-5 text-ghoul-muted" />
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="自由行动输入..."
          disabled={props.disabled}
          className="flex-1 bg-transparent text-ghoul-text focus:outline-none placeholder:text-ghoul-muted/50 font-serif"
          onKeyDown={e => {
            if (e.key === 'Enter' && custom.trim() && !props.disabled) {
              props.onPick(custom.trim());
              setCustom('');
            }
          }}
        />
        <button
          disabled={props.disabled || !custom.trim()}
          onClick={() => { props.onPick(custom.trim()); setCustom(''); }}
          className="p-2 text-ghoul-muted hover:text-white disabled:opacity-30 disabled:hover:text-ghoul-muted transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}