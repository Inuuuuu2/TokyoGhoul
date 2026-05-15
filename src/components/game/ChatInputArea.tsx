import { Send } from "lucide-react";

interface ChatInputAreaProps {
  isStreaming: boolean;
  inputText: string;
  setInputText: (val: string) => void;
  onSend: (text: string) => void;
}

export function ChatInputArea({
  isStreaming,
  inputText,
  setInputText,
  onSend
}: ChatInputAreaProps) {
  return (
    <div className="shrink-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-4 md:pt-6 pb-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!inputText.trim() || isStreaming) return;
          onSend(inputText);
          setInputText('');
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={isStreaming}
          placeholder={isStreaming ? '等待 AI 响应中...' : '输入你的行动或对话...'}
          className="flex-1 min-w-0 bg-[#111] border border-[#333] focus:border-ghoul-red px-3 md:px-4 py-2.5 md:py-3 text-white text-sm md:text-base outline-none font-serif transition-colors disabled:opacity-50 shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isStreaming}
          className="bg-ghoul-red/10 border border-ghoul-red text-ghoul-red px-4 md:px-6 min-w-[48px] hover:bg-ghoul-red hover:text-white active:bg-ghoul-red active:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ghoul-red disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
