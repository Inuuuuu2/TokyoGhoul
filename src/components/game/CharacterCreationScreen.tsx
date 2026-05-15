import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CreationData {
  name: string;
  faction: 'ghoul' | 'ccg' | 'human';
  variables: Record<string, any>;
}

export function CharacterCreationScreen({ onComplete }: { onComplete: (data: CreationData) => void }) {
  const [name, setName] = useState('');
  const [faction, setFaction] = useState<'ghoul' | 'ccg' | 'human' | null>(null);

  // 基础属性状态
  const [rcLevel, setRcLevel] = useState(1000);
  const [hunger, setHunger] = useState(50);
  const [sanity, setSanity] = useState(80);
  const [quinque, setQuinque] = useState(20);
  const [luck, setLuck] = useState(50);

  // 提交并传递给顶层
  const handleSubmit = () => {
    if (!name.trim() || !faction) return;

    let initialVars: Record<string, any> = {
      faction,
      sanity,
      location: '20区',
      time: '20:00'
    };

    if (faction === 'ghoul') {
      initialVars = { ...initialVars, rcLevel, hunger };
    } else if (faction === 'ccg') {
      initialVars = { ...initialVars, quinque_skill: quinque };
    } else if (faction === 'human') {
      initialVars = { ...initialVars, luck };
    }

    onComplete({
      name: name.trim(),
      faction,
      variables: initialVars
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden font-serif"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ghoul-red/10 via-black to-black opacity-30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl p-4 md:p-8 flex flex-col gap-6 md:gap-8">

        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-2xl md:text-5xl font-black text-white tracking-[0.15em] md:tracking-[0.2em] mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            档案建立
          </h1>
          <p className="text-ghoul-red tracking-widest text-xs md:text-sm font-mono uppercase">
            subject registration
          </p>
        </div>

        {/* 姓名输入 */}
        <div className="flex flex-col gap-2">
          <label className="text-ghoul-muted tracking-widest text-xs md:text-sm uppercase">代号 / 姓名 (Name)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-black/50 border border-[#333] focus:border-ghoul-red outline-none px-3 md:px-4 py-2.5 md:py-3 text-white text-base md:text-xl tracking-widest transition-colors font-sans"
            placeholder="输入你的名字..."
          />
        </div>

        {/* 阵营选择 */}
        <div className="flex flex-col gap-3 md:gap-4">
          <label className="text-ghoul-muted tracking-widest text-xs md:text-sm uppercase">种族鉴定 (Species / Faction)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <FactionCard
              title="喰种 (Ghoul)"
              desc="捕食人类的隐秘怪物，具备赫子与惊人的恢复力。必须进食人肉。"
              selected={faction === 'ghoul'}
              onClick={() => { setFaction('ghoul'); setRcLevel(1000); setHunger(50); }}
            />
            <FactionCard
              title="CCG 搜查官 (Investigator)"
              desc="隶属喰种对策局的武装专员。使用库因克武器猎杀喰种。"
              selected={faction === 'ccg'}
              onClick={() => { setFaction('ccg'); setQuinque(20); }}
            />
            <FactionCard
              title="人类 (Human)"
              desc="手无寸铁的普通市民，或者心怀鬼胎的黑道。身处食物链底端。"
              selected={faction === 'human'}
              onClick={() => { setFaction('human'); setLuck(50); }}
            />
          </div>
        </div>

        {/* 动态属性加点 */}
        <AnimatePresence mode="wait">
          {faction && (
            <motion.div
              key={faction}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 md:gap-4 border-t border-[#333] pt-6 md:pt-8"
            >
              <label className="text-ghoul-muted tracking-widest text-xs md:text-sm uppercase">生理数值调校 (Calibration)</label>

              <SliderField label="理智 (Sanity)" value={sanity} min={10} max={100} onChange={setSanity} color="text-blue-400" />

              {faction === 'ghoul' && (
                <>
                  <SliderField label="Rc细胞浓度 (Rc Level)" value={rcLevel} min={200} max={8000} onChange={setRcLevel} color="text-ghoul-red" />
                  <SliderField label="饥饿度 (Hunger)" value={hunger} min={0} max={100} onChange={setHunger} color="text-yellow-600" />
                </>
              )}

              {faction === 'ccg' && (
                <SliderField label="库因克熟练度 (Quinque Skill)" value={quinque} min={0} max={100} onChange={setQuinque} color="text-white" />
              )}

              {faction === 'human' && (
                <SliderField label="生存运势 (Luck)" value={luck} min={0} max={100} onChange={setLuck} color="text-green-400" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 md:mt-8 flex justify-center">
          <button
            disabled={!name.trim() || !faction}
            onClick={handleSubmit}
            className="px-8 md:px-16 py-3 md:py-4 w-full md:w-auto border border-ghoul-red text-ghoul-red hover:bg-ghoul-red hover:text-white active:bg-ghoul-red active:text-white transition-all uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold disabled:opacity-30 disabled:border-[#333] disabled:text-[#333] disabled:hover:bg-transparent"
          >
            踏入深渊
          </button>
        </div>

      </div>
    </motion.div>
  );
}

// 辅助组件：阵营卡片
function FactionCard({ title, desc, selected, onClick }: { title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 md:p-6 border cursor-pointer transition-all ${selected ? 'border-ghoul-red bg-ghoul-red/10' : 'border-[#222] bg-[#0a0a0a] hover:border-[#444] active:border-[#444]'}`}
    >
      <h3 className={`text-base md:text-xl font-bold mb-2 tracking-widest ${selected ? 'text-ghoul-red' : 'text-gray-300'}`}>{title}</h3>
      <p className="text-xs text-ghoul-muted leading-relaxed font-sans">{desc}</p>
    </div>
  );
}

// 辅助组件：属性滑块
function SliderField({ label, value, min, max, onChange, color }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-[#0a0a0a] p-3 md:p-4 border border-[#222]">
      <div className="flex justify-between md:contents items-center">
        <span className={`md:w-40 font-mono text-xs md:text-sm tracking-widest ${color}`}>{label}</span>
        <span className={`md:hidden font-mono font-bold ${color}`}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-ghoul-red"
      />
      <span className={`hidden md:inline w-16 text-right font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
