import { Send } from "lucide-react";
import { OptionList } from "../SillyTavern/OptionList";

interface ChatInputAreaProps {
  options: any[];
  isStreaming: boolean;
  inputText: string;
  setInputText: (val: string) => void;
  onSend: (text: string) => void;
}

export function ChatInputArea({
  options,
  isStreaming,
  inputText,
  setInputText,
  onSend
}: ChatInputAreaProps) {
  return (
    <div className="shrink-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-6 pb-2">
      {!isStreaming && options && options.length > 0 && (
        <OptionList
          options={options}
          disabled={isStreaming}
          onPick={onSend}
        />
      )}

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          if (!inputText.trim() || isStreaming) return;
          onSend(inputText);
          setInputText('');
        }}
        className="mt-3 flex gap-2"
      >
        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={isStreaming}
          placeholder="输入你的行动或对话..." 
          className="flex-1 bg-[#111] border border-[#333] focus:border-ghoul-red px-4 py-3 text-white outline-none font-serif transition-colors disabled:opacity-50 shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!inputText.trim() || isStreaming}
          className="bg-ghoul-red/10 border border-ghoul-red text-ghoul-red px-6 hover:bg-ghoul-red hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ghoul-red disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
