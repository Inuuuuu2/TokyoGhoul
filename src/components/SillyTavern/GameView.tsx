import { useState, useMemo } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import { ThinkingFold } from './ThinkingFold';
import { MainTextPane } from './MainTextPane';
import { OptionList } from './OptionList';
import { HistoryDrawer } from './HistoryDrawer';
import { SettingsModal } from './SettingsModal';
import { LorebookModal } from './LorebookModal';
import { PresetModal } from './PresetModal';
import { VariablesModal } from './VariablesModal';
import { Toast } from './Toast';
import { Map, User, Skull, Send } from "lucide-react";
import { StatusBar } from '../game/StatusBar';
import { Modal } from '../ui/Modal';
import { motion } from "framer-motion";

export function GameView() {
  const st = useSillytavern();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showNpc, setShowNpc] = useState(false);
  const [inputText, setInputText] = useState("");

  const lastAssistant = useMemo(
    () => [...(st.activeChat?.messages ?? [])].reverse().find(m => m.role === 'assistant'),
    [st.activeChat],
  );

  const isStreaming = st.streamState.isStreaming;
  const display = isStreaming
    ? st.streamState
    : {
        thinking: lastAssistant?.parsed?.thinking ?? '',
        maintext: lastAssistant?.parsed?.maintext ?? lastAssistant?.content ?? '深呼吸，你睁开了眼睛……',
        options: lastAssistant?.parsed?.options ?? [],
        sum: lastAssistant?.parsed?.sum ?? '',
      };

  const rcLevel = parseInt(st.activeChat?.variables?.rcLevel?.toString() || '45');
  const hunger = parseInt(st.activeChat?.variables?.hunger?.toString() || '75');
  const suspicion = parseInt(st.activeChat?.variables?.suspicion?.toString() || '15');
  const sanity = parseInt(st.activeChat?.variables?.sanity?.toString() || '60');
  const location = st.activeChat?.variables?.location?.toString() || '20区 - 阴暗小巷';
  const time = st.activeChat?.variables?.time?.toString() || '23:45';

  return (
    <div className="min-h-screen flex flex-col bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] bg-ghoul-dark text-ghoul-text relative">
      {/* 顶部状态栏 */}
      <StatusBar
        rcLevel={rcLevel}
        hunger={hunger}
        suspicion={suspicion}
        sanity={sanity}
        time={time}
        location={location}
      />

      {/* 控制菜单 */}
      <div className="flex gap-4 p-4 border-b border-[#222] bg-[#050505] overflow-x-auto whitespace-nowrap">
        <button onClick={() => setHistoryOpen(true)} className="text-sm font-mono text-ghoul-muted hover:text-white transition-colors">☰ HISTORY [{st.activeChat?.messages?.length ?? 0}]</button>
        <button onClick={() => st.openSettings()} className="text-sm font-mono text-ghoul-muted hover:text-white transition-colors">⚙ SETTINGS</button>
        <button onClick={() => st.openLorebooks()} className="text-sm font-mono text-ghoul-muted hover:text-white transition-colors">📖 LOREBOOKS [{st.settings?.activeLorebookIds?.length ?? 0}]</button>
        <button onClick={() => st.openPresets()} className="text-sm font-mono text-ghoul-muted hover:text-white transition-colors">✦ PRESETS</button>
        <button onClick={() => st.openVariables()} className="text-sm font-mono text-ghoul-muted hover:text-white transition-colors">📊 VARS [{Object.keys(st.activeChat?.variables ?? {}).length}]</button>
        <button disabled={!lastAssistant} onClick={() => st.regenerateLast()} className="text-sm font-mono text-ghoul-muted hover:text-ghoul-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed">↻ RE-ROLL</button>
      </div>

      {/* 主界面 */}
      <main className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-4 gap-6">

        {/* 左侧：环境立绘或氛围图 */}
        <div className="md:w-1/3 flex flex-col gap-4">
          <div className="relative aspect-[3/4] border border-[#222] bg-[#0a0a0c] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505] z-10" />
            <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-1000 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ghoul-red via-ghoul-dark to-ghoul-darker" />
            <div className="absolute bottom-4 left-4 z-20">
              <h2 className="font-serif text-2xl text-white tracking-[0.2em] mb-1 glitch-effect" data-text="神代利世">神代利世</h2>
              <p className="text-sm text-ghoul-muted font-mono">「暴食者」 | Binge Eater</p>
            </div>
            <button
              onClick={() => setShowNpc(true)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 border border-[#333] hover:border-ghoul-red hover:text-ghoul-red backdrop-blur-md transition-all rounded-full flex items-center justify-center cursor-pointer"
            >
              <User className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setShowMap(true)}
            className="flex items-center gap-3 p-4 bg-[#111] border border-[#222] hover:border-ghoul-red transition-colors w-full group cursor-pointer"
          >
            <Map className="w-5 h-5 text-ghoul-muted group-hover:text-ghoul-red transition-colors" />
            <span className="tracking-widest flex-1 text-left">检视区域地图</span>
          </button>
        </div>

        {/* 右侧：聊天记录与交互 */}
        <div className="md:w-2/3 flex flex-col relative h-[calc(100vh-140px)]">
          <div className="flex-1 overflow-y-auto space-y-6 scroll-smooth pr-4 pb-4 font-serif">
            {st.activeChat?.messages.length === 0 && (
              <div className="text-center text-ghoul-muted mt-20 opacity-50">
                <Skull className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>夜幕降临，命运的齿轮开始转动...</p>
              </div>
            )}
            
            {st.activeChat?.messages.map((msg, idx) => {
              const isLast = idx === st.activeChat!.messages.length - 1;
              const isStreamingThis = isLast && isStreaming;
              const isUser = msg.role === 'user';
              const name = isUser ? (st.activeChat?.userName || 'You') : (st.activeChat?.characterName || 'Storyteller');
              
              // 统一从解析结果或原始内容获取文本
              let textContent = msg.content;
              let thinking = '';
              let summary = '';
              let options = [];
              
              if (msg.role === 'assistant') {
                if (isStreamingThis) {
                  textContent = display.maintext;
                  thinking = display.thinking;
                  summary = display.sum;
                  options = display.options;
                } else if (msg.parsed) {
                  textContent = msg.parsed.maintext || msg.content;
                  thinking = msg.parsed.thinking || '';
                  summary = msg.parsed.sum || '';
                  options = msg.parsed.options || [];
                }
              }

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  key={msg.id} 
                  className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* 头像 */}
                  <div className="flex-shrink-0 w-12 h-12 bg-[#111] border border-[#333] flex items-center justify-center rounded-sm overflow-hidden shadow-lg shadow-black/50">
                    {isUser ? <User className="text-ghoul-muted w-6 h-6" /> : <Skull className="text-ghoul-red w-6 h-6" />}
                  </div>
                  
                  {/* 内容气泡 */}
                  <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <span className="text-sm text-ghoul-muted mb-1 font-mono">{name}</span>
                    <div className={`p-4 rounded-sm border shadow-md ${isUser ? 'bg-[#1a1a1a] border-[#333] text-gray-300' : 'bg-[#0a0a0c] border-[#440000]/60 text-[#d4d4d8]'}`}>
                      
                      {!isUser && thinking && (
                        <ThinkingFold text={thinking} mode={st.settings?.thinkingDisplay ?? 'fold'} />
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
          </div>

          {/* 底部输入与选项区域 */}
          <div className="shrink-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-6 pb-2">
            {!isStreaming && display.options && display.options.length > 0 && (
              <OptionList
                options={display.options}
                disabled={isStreaming}
                onPick={(text) => st.sendGameMessage(text)}
              />
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!inputText.trim() || isStreaming) return;
                st.sendGameMessage(inputText);
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
        </div>
      </main>

      {/* 模态框 */}
      {historyOpen && <HistoryDrawer onClose={() => setHistoryOpen(false)} />}
      {st.showSettings && st.settings && (
        <SettingsModal
          settings={st.settings}
          updateSettings={st.updateSettings}
          onClose={() => st.setShowSettings(false)}
        />
      )}
      {st.showLorebooks && <LorebookModal onClose={() => st.setShowLorebooks(false)} />}
      {st.showPresets && <PresetModal onClose={() => st.setShowPresets(false)} />}
      {st.showVariables && <VariablesModal onClose={() => st.setShowVariables(false)} />}
      <Toast message={st.toast} />

      {/* NPC 面板模态框 */}
      <Modal isOpen={showNpc} onClose={() => setShowNpc(false)} title="情报档案: 目标对象">
        <div className="flex gap-6">
          <div className="w-32 h-40 bg-[#1a1a1a] border border-[#333] flex-shrink-0 relative overflow-hidden flex items-center justify-center">
            <span className="text-ghoul-muted text-xs">NO IMAGE DATA</span>
            <div className="absolute inset-0 bg-gradient-to-t from-ghoul-red/20 to-transparent mix-blend-overlay"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded">代号 NAME</span>
              <span className="text-ghoul-red font-bold tracking-widest text-lg">神代 利世 (Rize Kamishiro)</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded"> Rc类型 TYPE</span>
              <span className="text-white tracking-widest font-serif">鳞赫 (Rinkaku)</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded"> 危险评级 RANK</span>
              <span className="text-orange-500 font-bold tracking-widest font-serif">S~SS</span>
            </div>
            <p className="text-sm text-ghoul-muted leading-relaxed mt-4 border-l-2 border-ghoul-red/50 pl-3">
              被CCG称为「暴食者」的危险喰种。外表是优雅的知性女性，但其捕食行为毫无节制且极端残忍。
            </p>
          </div>
        </div>
      </Modal>

      {/* 地图模态框 */}
      <Modal isOpen={showMap} onClose={() => setShowMap(false)} title="区域简图: 第20区" className="max-w-3xl">
        <div className="aspect-[16/9] bg-[#050505] relative border border-[#222] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute rounded-full border border-ghoul-red pointer-events-none"
            style={{ width: '100px', height: '100px', top: 'calc(40% - 50px)', left: 'calc(30% - 50px)' }}
          />
          <div className="absolute top-[40%] left-[30%] w-3 h-3 bg-red-600 rounded-full shadow-[0_0_10px_red] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-ghoul-red text-white text-xs whitespace-nowrap px-2 py-1 z-10">当前位置</div>
          </div>
          <span className="absolute top-[43%] left-[30%] text-xs text-red-500 font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]">CURRENT POS</span>

          <div className="absolute top-[20%] right-[30%] w-2 h-2 bg-[#ccc] rounded-full shadow-[0_0_5px_white] -translate-x-1/2 -translate-y-1/2 group cursor-pointer hover:scale-150 transition-transform">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[#ccc] text-white text-xs whitespace-nowrap px-2 py-1 z-10">咖啡店「古董」</div>
          </div>
          <span className="absolute top-[23%] right-[30%] text-xs text-[#ccc] font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">ANTEIKU</span>

          <div className="absolute bottom-[20%] left-[50%] w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_blue] -translate-x-1/2 -translate-y-1/2 group cursor-pointer hover:scale-150 transition-transform">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-blue-500 text-white text-xs whitespace-nowrap px-2 py-1 z-10">CCG 20区支部</div>
          </div>
          <span className="absolute bottom-[23%] left-[50%] text-xs text-blue-400 font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">CCG BRANCH 20</span>

          <div className="absolute bottom-4 right-4 text-xs font-mono text-[#333]">MAP DATA: OFFLINE</div>
        </div>
      </Modal>
    </div>
  );
}