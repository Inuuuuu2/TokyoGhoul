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
import { Map, User } from "lucide-react";
import { StatusBar } from '../game/StatusBar';
import { Modal } from '../ui/Modal';
import { motion } from "framer-motion";

export function GameView() {
  const st = useSillytavern();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showNpc, setShowNpc] = useState(false);

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

        {/* 右侧：剧情文本与交互 */}
        <div className="md:w-2/3 flex flex-col relative">
          <div className="flex-1 overflow-y-auto pb-32 space-y-6 scroll-smooth pr-4 text-lg leading-relaxed text-[#d4d4d8] font-serif">

            <ThinkingFold text={display.thinking} mode={st.settings?.thinkingDisplay ?? 'fold'} />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
              <MainTextPane text={display.maintext} isStreaming={isStreaming} />
            </motion.div>

            <OptionList
              options={display.options}
              disabled={isStreaming}
              onPick={(text) => st.sendGameMessage(text)}
            />

            {display.sum && (
              <details className="mt-8 text-ghoul-muted text-sm border-t border-[#333] pt-4">
                <summary className="cursor-pointer hover:text-white transition-colors">📜 幕间总结</summary>
                <p className="mt-2 font-sans">{display.sum}</p>
              </details>
            )}
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