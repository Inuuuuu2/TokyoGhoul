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
import { MemoryPanel } from './MemoryPanel';
import { PromptTogglePanel } from './PromptTogglePanel';
import { PromptInspector } from './PromptInspector';
import { Toast } from './Toast';
import { Map, User, Heart, Trash2, Home } from "lucide-react";
import { ChatHistoryList } from "../game/ChatHistoryList";

const NPC_PROFILES: Record<string, { title: string, color: string }> = {
  '神代利世': { title: '「暴食者」 | Binge Eater', color: 'from-ghoul-red' },
  '雾岛董香': { title: '「兔子」 | Rabbit', color: 'from-blue-600' },
  '芳村功善': { title: '「不杀之枭」 | Non-Killing Owl', color: 'from-yellow-800' },
  '铃屋什造': { title: 'CCG二等搜查官 | CCG Investigator', color: 'from-white' },
};
import { ChatInputArea } from "../game/ChatInputArea";
import { NpcProfileModal } from "../game/NpcProfileModal";
import { AreaMapModal } from "../game/AreaMapModal";
import { StatusBar } from '../game/StatusBar';
import { MobileSideStrip } from '../game/MobileSideStrip';

export function GameView() {
  const st = useSillytavern();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showNpc, setShowNpc] = useState(false);
  const [inputText, setInputText] = useState("");

  // 页面流程控制: title -> creation -> game
  const [phase, setPhase] = useState<'title' | 'creation' | 'game'>('title');

  // 处理开始画面的按钮点击
  const handleTitleScreenAction = (action: 'start' | 'continue' | 'presets' | 'settings') => {
    if (action === 'start') {
      setPhase('creation');
    } else if (action === 'continue') {
      // 检查是否有存档，如果有就直接进入游戏界面读取 activeChat
      if (st.chats.length > 0) {
        setPhase('game');
      } else {
        st.showToast("没有找到可继续的存档！");
        setPhase('creation');
      }
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
        raw: '',
      };

  const rcLevel = parseInt(st.activeChat?.variables?.rcLevel?.toString() || '45');
  const hunger = parseInt(st.activeChat?.variables?.hunger?.toString() || '75');
  const suspicion = parseInt(st.activeChat?.variables?.suspicion?.toString() || '15');
  const sanity = parseInt(st.activeChat?.variables?.sanity?.toString() || '60');
  const location = st.activeChat?.variables?.location?.toString() || '20区 - 阴暗小巷';
  const time = st.activeChat?.variables?.time?.toString() || '23:45';

  const npcName = st.activeChat?.characterName || st.settings?.characterName || '未知角色';
  const npcProfile = NPC_PROFILES[npcName] || { title: '喰种 / 角色', color: 'from-gray-600' };

  // 提取好感度
  const affinityKey = `affinity_${npcName}`;
  const affinityValue = parseInt(st.activeChat?.variables?.[affinityKey]?.toString() || '0');

  // 删除当前对话
  const handleDeleteChat = () => {
    if (!st.activeChat) return;
    if (window.confirm('警告：是否彻底删除当前记忆回溯？此操作不可逆。')) {
      st.removeChat(st.activeChat.id);
      setPhase('title');
    }
  };

  return (
    <>
      <AnimatePresence>
        {phase === 'title' && (
          <TitleScreen key="title" onAction={handleTitleScreenAction} hasSaves={st.chats.length > 0} />
        )}
        {phase === 'creation' && (
          <CharacterCreationScreen key="creation" onComplete={handleCreationComplete} />
        )}
      </AnimatePresence>

      <div className="h-[100dvh] flex flex-col bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] bg-ghoul-dark text-ghoul-text relative overflow-hidden">
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
      <div className="flex gap-3 md:gap-4 px-3 py-2 md:p-4 border-b border-[#222] bg-[#050505] overflow-x-auto whitespace-nowrap flex-shrink-0">
        <button onClick={() => setPhase('title')} className="flex items-center gap-1 text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">
          <Home className="w-4 h-4" /> HOME
        </button>
        <button onClick={() => setHistoryOpen(true)} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">☰ HISTORY [{st.activeChat?.messages?.length ?? 0}]</button>
        <button onClick={() => st.openSettings()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">⚙ SETTINGS</button>
        <button onClick={() => st.openLorebooks()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">📖 LOREBOOKS [{st.settings?.activeLorebookIds?.length ?? 0}]</button>
        <button onClick={() => st.openPresets()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">✦ PRESETS</button>
        <button onClick={() => st.openPromptToggle()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">📚 PROMPTS</button>
        <button onClick={() => st.openInspector()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">📋 INSPECT</button>
        <button onClick={() => st.openVariables()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">📊 VARS [{Object.keys(st.activeChat?.variables ?? {}).length}]</button>
        <button onClick={() => st.openMemories()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors">🧠 MEMORY [{(st.activeChat?.memories ?? []).length}]</button>
        <button disabled={!lastAssistant} onClick={() => st.regenerateLast()} className="text-xs md:text-sm font-mono text-ghoul-muted hover:text-white active:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">↻ RE-ROLL</button>
        <div className="flex-1" /> {/* Spacer */}
        <button onClick={handleDeleteChat} className="flex items-center gap-1 text-xs md:text-sm font-mono text-ghoul-muted hover:text-ghoul-red active:text-ghoul-red transition-colors">
          <Trash2 className="w-4 h-4" /> DELETE
        </button>
      </div>

      {/* 移动端紧凑 NPC/地图 条 */}
      <MobileSideStrip
        npcName={npcName}
        npcTitle={npcProfile.title}
        affinity={affinityValue}
        onOpenNpc={() => setShowNpc(true)}
        onOpenMap={() => setShowMap(true)}
      />

      {/* 主界面 */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-3 md:p-4 gap-4 md:gap-6">

        {/* 左侧：环境立绘或氛围图（仅桌面端） */}
        <div className="hidden md:flex w-64 flex-shrink-0 flex-col gap-4">
          <div className="relative aspect-[3/4] border border-[#222] bg-[#0a0a0c] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505] z-10" />
            <div className={`absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-1000 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${npcProfile.color} via-ghoul-dark to-ghoul-darker`} />
            <div className="absolute bottom-4 left-4 z-20 w-[calc(100%-2rem)]">
              <h2 className="font-serif text-xl md:text-2xl text-white tracking-[0.2em] mb-1 glitch-effect" data-text={npcName}>{npcName}</h2>
              <p className="text-xs text-ghoul-muted font-mono mb-3">{npcProfile.title}</p>

              {/* 好感度模块 */}
              <div className="flex flex-col gap-1 w-full bg-black/40 p-2 rounded border border-[#333]/50 backdrop-blur-sm" title={`对你的当前好感度: ${affinityValue}`}>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-ghoul-muted flex items-center gap-1">
                    <Heart className={`w-3 h-3 ${affinityValue > 50 ? 'text-ghoul-red fill-ghoul-red/50' : 'text-gray-500'}`} />
                    AFFINITY
                  </span>
                  <span className={affinityValue > 50 ? 'text-ghoul-red' : 'text-gray-400'}>{affinityValue}</span>
                </div>
                <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-900 to-ghoul-red transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(0, affinityValue))}%` }}
                  />
                </div>
              </div>
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
            <span className="tracking-widest flex-1 text-left text-sm">检视区域地图</span>
          </button>
        </div>

        {/* 右侧：聊天记录与交互 */}
        <div className="flex-1 min-h-0 flex flex-col relative">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 md:space-y-6 scroll-smooth pr-2 md:pr-4 pb-4 font-serif">
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
      {st.showMemories && <MemoryPanel onClose={() => st.setShowMemories(false)} />}
      {st.showPromptToggle && <PromptTogglePanel onClose={() => st.setShowPromptToggle(false)} />}
      {st.showInspector && <PromptInspector onClose={() => st.setShowInspector(false)} />}
      <Toast message={st.toast} />

      {/* NPC 面板模态框 */}
      <NpcProfileModal isOpen={showNpc} onClose={() => setShowNpc(false)} />

      {/* 地图模态框 */}
      <AreaMapModal isOpen={showMap} onClose={() => setShowMap(false)} />
    </div>
    </>
  );
}