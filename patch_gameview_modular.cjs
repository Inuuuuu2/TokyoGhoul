const fs = require('fs');
const path = 'B:/claudecode/tokyo-ghoul-tavern/src/components/SillyTavern/GameView.tsx';

let content = fs.readFileSync(path, 'utf8');

// 修改引用
content = content.replace(
  'import { OptionList } from \'./OptionList\';',
  ''
);

content = content.replace(
  'import { Map, User, Skull, Send } from "lucide-react";',
  'import { Map, User } from "lucide-react";\nimport { ChatHistoryList } from "../game/ChatHistoryList";\nimport { ChatInputArea } from "../game/ChatInputArea";\nimport { NpcProfileModal } from "../game/NpcProfileModal";\nimport { AreaMapModal } from "../game/AreaMapModal";'
);

// 提取右侧聊天记录区域，替换为 <ChatHistoryList /> 和 <ChatInputArea />
const oldChatAreaRegex = /<div className="flex-1 overflow-y-auto space-y-6 scroll-smooth pr-4 pb-4 font-serif">[\s\S]*?<\/div>\s*\{\/\* 底部输入与选项区域 \*\/\}\s*<div className="shrink-0 bg-gradient-to-t from-\[#050505\] via-\[#050505\] to-transparent pt-6 pb-2">[\s\S]*?<\/div>/m;

const newChatArea = `<div className="flex-1 overflow-y-auto space-y-6 scroll-smooth pr-4 pb-4 font-serif">
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
          />`;

content = content.replace(oldChatAreaRegex, newChatArea);

// 提取模态框
const oldNpcModalRegex = /\{\/\* NPC 面板模态框 \*\/\}\s*<Modal isOpen=\{showNpc\} onClose=\{\(\) => setShowNpc\(false\)\} title="情报档案: 目标对象">[\s\S]*?<\/Modal>/m;
const newNpcModal = `{/* NPC 面板模态框 */}
      <NpcProfileModal isOpen={showNpc} onClose={() => setShowNpc(false)} />`;
content = content.replace(oldNpcModalRegex, newNpcModal);

const oldMapModalRegex = /\{\/\* 地图模态框 \*\/\}\s*<Modal isOpen=\{showMap\} onClose=\{\(\) => setShowMap\(false\)\} title="区域简图: 第20区" className="max-w-3xl">[\s\S]*?<\/Modal>/m;
const newMapModal = `{/* 地图模态框 */}
      <AreaMapModal isOpen={showMap} onClose={() => setShowMap(false)} />`;
content = content.replace(oldMapModalRegex, newMapModal);

fs.writeFileSync(path, content);
