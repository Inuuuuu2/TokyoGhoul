import { useState, useMemo } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import { TitleScreen } from '../game/TitleScreen';
import { CharacterCreationScreen } from '../game/CharacterCreationScreen';
import type { CreationData } from '../game/CharacterCreationScreen';
import { AnimatePresence } from 'framer-motion';

import { HistoryDrawer } from './HistoryDrawer';
import { SettingsModal } from './SettingsModal';
import { LorebookModal } from './LorebookModal';
import { PresetModal } from './PresetModal';
import { VariablesModal } from './VariablesModal';
import { Toast } from './Toast';
import { Map, User } from "lucide-react";
import { ChatHistoryList } from "../game/ChatHistoryList";
import { ChatInputArea } from "../game/ChatInputArea";
import { NpcProfileModal } from "../game/NpcProfileModal";
import { AreaMapModal } from "../game/AreaMapModal";
import { StatusBar } from '../game/StatusBar';

export function GameView() {
  const st = useSillytavern();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showNpc, setShowNpc] = useState(false);
  const [inputText, setInputText] = useState("");

  // 页面流程控制: title -> creation -> game
  const [phase, setPhase] = useState<'title' | 'creation' | 'game'>('title');

  // 处理开始画面的按钮点击
  const handleTitleScreenAction = (action: 'start' | 'presets' | 'settings') => {
    if (action === 'start') {
      setPhase('creation');
    } else {
      // 保持之前的逻辑：如果是直接进设置，可以跳过 creation 或者直接隐藏 title 并进 game 且弹窗
      setPhase('game');
      if (action === 'presets') {
        setTimeout(() => st.setShowPresets(true), 1200);
      } else if (action === 'settings') {
        setTimeout(() => st.setShowSettings(true), 1200);
      }
    }
  };

  const handleCreationComplete = async (data: CreationData) => {
    // 建立新存档并初始化录入的数据
    await st.createChat(`轮回 - ${data.name}`, {
      userName: data.name,
      variables: data.variables
    });
    setPhase('game');
    // 可以在这里触发一条初始剧情对话：
    // setTimeout(() => st.sendGameMessage("（系统提示：角色档案建立完毕，开始同步神经网络...）"), 1000);
  };

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
    <>
      <AnimatePresence>
        {phase === 'title' && (
          <TitleScreen key="title" onAction={handleTitleScreenAction} />
        )}
        {phase === 'creation' && (
          <CharacterCreationScreen key="creation" onComplete={handleCreationComplete} />
        )}
      </AnimatePresence>

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
            <ChatHistoryList 
              messages={st.activeChat?.messages ?? []} 
              isStreaming={isStreaming} 
              display={display} 
              settings={st.settings} 
              userName={st.activeChat?.userName || 'You'} 
              characterName={st.activeChat?.characterName || 'Storyteller'} 
            />
          </div>

          <ChatInputArea 
            options={display.options} 
            isStreaming={isStreaming} 
            inputText={inputText} 
            setInputText={setInputText} 
            onSend={(text) => st.sendGameMessage(text)} 
          />
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
      <NpcProfileModal isOpen={showNpc} onClose={() => setShowNpc(false)} />

      {/* 地图模态框 */}
      <AreaMapModal isOpen={showMap} onClose={() => setShowMap(false)} />
    </div>
    </>
  );
}