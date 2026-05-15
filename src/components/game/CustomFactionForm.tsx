import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';

export interface CustomStat {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
}

export interface CustomFactionState {
  identity: string;
  description: string;
  gender: string;
  height: string;
  appearance: string;
  customStats: CustomStat[];
}

interface CustomFactionFormProps {
  value: CustomFactionState;
  onChange: (next: CustomFactionState) => void;
}

export function CustomFactionForm({ value, onChange }: CustomFactionFormProps) {
  const patch = <K extends keyof CustomFactionState>(key: K, v: CustomFactionState[K]) =>
    onChange({ ...value, [key]: v });

  const addStat = () => {
    const newStat: CustomStat = {
      id: crypto.randomUUID(),
      name: '',
      value: 50,
      min: 0,
      max: 100,
    };
    onChange({ ...value, customStats: [...value.customStats, newStat] });
  };

  const updateStat = (id: string, patchStat: Partial<CustomStat>) => {
    onChange({
      ...value,
      customStats: value.customStats.map((s) => (s.id === id ? { ...s, ...patchStat } : s)),
    });
  };

  const removeStat = (id: string) => {
    onChange({ ...value, customStats: value.customStats.filter((s) => s.id !== id) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-4 md:gap-6 border-t border-[#333] pt-6 md:pt-8"
    >
      <label className="text-ghoul-muted tracking-widest text-xs md:text-sm uppercase">
        自定义身份 (Custom Identity)
      </label>

      <FreeTextField
        label="阵营名 / 身份"
        value={value.identity}
        onChange={(v) => patch('identity', v)}
        placeholder="如：半喰种、RC 研究员、黑市中介..."
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <FreeTextField label="性别" value={value.gender} onChange={(v) => patch('gender', v)} placeholder="男 / 女 / 其他" />
        <FreeTextField label="身高" value={value.height} onChange={(v) => patch('height', v)} placeholder="如：175cm" />
        <FreeTextField label="外貌" value={value.appearance} onChange={(v) => patch('appearance', v)} placeholder="一句话外貌特征" />
      </div>

      <FreeTextArea
        label="背景描述 (Description)"
        value={value.description}
        onChange={(v) => patch('description', v)}
        placeholder="一段话描述你的来历、动机、特殊设定。AI 会读到这段文字..."
        rows={4}
      />

      <div className="flex flex-col gap-2 md:gap-3">
        <div className="flex items-center justify-between">
          <label className="text-ghoul-muted tracking-widest text-xs md:text-sm uppercase">
            自定义属性 (Custom Stats)
          </label>
          <button
            onClick={addStat}
            className="flex items-center gap-1 text-xs px-2 py-1 border border-[#333] text-ghoul-muted hover:text-ghoul-red hover:border-ghoul-red active:text-ghoul-red transition-colors"
          >
            <Plus className="w-3 h-3" /> 添加
          </button>
        </div>
        {value.customStats.length === 0 ? (
          <p className="text-[11px] text-ghoul-muted/60 italic">
            可选；点 + 添加任意自定义数值（如 战斗经验 / 资金 / 情报网密度）。
          </p>
        ) : (
          value.customStats.map((stat) => (
            <CustomStatRow
              key={stat.id}
              stat={stat}
              onChange={(p) => updateStat(stat.id, p)}
              onRemove={() => removeStat(stat.id)}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

function FreeTextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ghoul-muted tracking-widest text-[10px] md:text-xs uppercase">
        {label} {required && <span className="text-ghoul-red">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-black/50 border border-[#333] focus:border-ghoul-red outline-none px-3 py-2 text-white text-sm md:text-base font-sans transition-colors"
      />
    </div>
  );
}

function FreeTextArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ghoul-muted tracking-widest text-[10px] md:text-xs uppercase">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 3}
        className="bg-black/50 border border-[#333] focus:border-ghoul-red outline-none px-3 py-2 text-white text-sm md:text-base font-sans transition-colors resize-y"
      />
    </div>
  );
}

function CustomStatRow({
  stat,
  onChange,
  onRemove,
}: {
  stat: CustomStat;
  onChange: (patch: Partial<CustomStat>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 bg-[#0a0a0a] p-3 border border-[#222]">
      <input
        type="text"
        value={stat.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="属性名（如：战力）"
        className="md:w-40 bg-black/30 border border-[#222] focus:border-ghoul-red outline-none px-2 py-1.5 text-white text-xs md:text-sm font-mono"
      />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="number"
          value={stat.min}
          onChange={(e) => onChange({ min: Number(e.target.value) })}
          className="w-16 bg-black/30 border border-[#222] focus:border-ghoul-red outline-none px-1.5 py-1 text-white text-xs font-mono"
          title="最小值"
        />
        <input
          type="range"
          min={stat.min}
          max={stat.max}
          value={stat.value}
          onChange={(e) => onChange({ value: Number(e.target.value) })}
          className="flex-1 accent-ghoul-red min-w-0"
        />
        <input
          type="number"
          value={stat.max}
          onChange={(e) => onChange({ max: Number(e.target.value) })}
          className="w-16 bg-black/30 border border-[#222] focus:border-ghoul-red outline-none px-1.5 py-1 text-white text-xs font-mono"
          title="最大值"
        />
        <span className="w-14 text-right font-mono font-bold text-ghoul-red text-sm">{stat.value}</span>
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1.5 text-ghoul-muted hover:text-ghoul-red active:text-ghoul-red"
          aria-label="删除此属性"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
