import { motion } from "framer-motion";
import { User, Skull } from "lucide-react";
import { ThinkingFold } from "../SillyTavern/ThinkingFold";

interface ChatHistoryListProps {
  messages: any[];
  isStreaming: boolean;
  display: any;
  settings: any;
  userName: string;
  characterName: string;
}

export function ChatHistoryList({
  messages,
  isStreaming,
  display,
  settings,
  userName,
  characterName
}: ChatHistoryListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center text-ghoul-muted mt-20 opacity-50">
        <Skull className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>夜幕降临，命运的齿轮开始转动...</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;
        const isStreamingThis = isLast && isStreaming;
        const isUser = msg.role === 'user';
        const name = isUser ? userName : characterName;
        
        let textContent = msg.content;
        let thinking = '';
        let summary = '';
        
        if (msg.role === 'assistant') {
          if (isStreamingThis) {
            textContent = display.maintext;
            thinking = display.thinking;
            summary = display.sum;
          } else if (msg.parsed) {
            textContent = msg.parsed.maintext || msg.content;
            thinking = msg.parsed.thinking || '';
            summary = msg.parsed.sum || '';
          }
        }

        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            key={msg.id} 
            className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className="flex-shrink-0 w-12 h-12 bg-[#111] border border-[#333] flex items-center justify-center rounded-sm overflow-hidden shadow-lg shadow-black/50">
              {isUser ? <User className="text-ghoul-muted w-6 h-6" /> : <Skull className="text-ghoul-red w-6 h-6" />}
            </div>
            
            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-sm text-ghoul-muted mb-1 font-mono">{name}</span>
              <div className={`p-4 rounded-sm border shadow-md ${isUser ? 'bg-[#1a1a1a] border-[#333] text-gray-300' : 'bg-[#0a0a0c] border-[#440000]/60 text-[#d4d4d8]'}`}>
                
                {!isUser && thinking && (
                  <ThinkingFold text={thinking} mode={settings?.thinkingDisplay ?? 'fold'} />
                )}
                
                <div className="st-maintext whitespace-pre-wrap leading-relaxed text-lg">
                  {textContent}
                  {isStreamingThis && <span className="st-cursor">▍</span>}
                </div>
                
                {!isUser && summary && (
                  <div className="mt-4 pt-3 border-t border-[#333]/50 text-xs text-ghoul-muted/70 font-sans bg-black/20 -mx-4 -mb-4 p-4 rounded-b-sm">
                    📜 {summary}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
