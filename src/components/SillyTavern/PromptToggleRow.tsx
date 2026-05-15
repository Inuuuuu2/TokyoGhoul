interface PromptToggleRowProps {
  name: string;
  identifier: string;
  enabled: boolean;
  isSection: boolean;
  onToggle: () => void;
}

export function PromptToggleRow({ name, identifier, enabled, isSection, onToggle }: PromptToggleRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 border-b border-[#1a1a1a] ${
        isSection ? 'bg-[#1a0a0a]' : 'hover:bg-[#0a0a0c]'
      }`}
    >
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
          enabled ? 'bg-ghoul-red' : 'bg-[#333]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={`text-xs md:text-sm truncate ${
            isSection ? 'text-ghoul-red font-bold tracking-wider' : 'text-ghoul-text'
          }`}
        >
          {name}
        </span>
        <code className="text-[10px] text-ghoul-muted truncate">{identifier}</code>
      </div>
    </div>
  );
}
