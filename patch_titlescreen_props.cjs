const fs = require('fs');
const path = 'B:/claudecode/tokyo-ghoul-tavern/src/components/game/TitleScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 把 onStartGame 替换为 onAction: (action: 'start'|'presets'|'settings') => void
content = content.replace(
  'export function TitleScreen({ onStartGame }: { onStartGame: () => void }) {',
  'export function TitleScreen({ onAction }: { onAction: (action: "start" | "presets" | "settings") => void }) {'
);

// 移除内部对 st 的直接依赖（因为 st 只能由 GameView 持有）
content = content.replace(
  '  const st = useSillytavern();\n  ',
  ''
);

// handleStart 函数修改
content = content.replace(
  `  const handleStart = () => {
    setPhase(5);
    setTimeout(onStartGame, 2000); // 2秒后完全加载游戏主界面
  };`,
  `  const handleAction = (action: 'start' | 'presets' | 'settings') => {
    setPhase(5);
    setTimeout(() => onAction(action), 2000); // 2秒转场结束后触发行为
  };`
);

// 更新三个按钮的onClick事件
content = content.replace(
  'onClick={handleStart}',
  'onClick={() => handleAction("start")}'
);

content = content.replace(
  `onClick={() => {
                      st.openPresets();
                      handleStart();
                    }}`,
  `onClick={() => handleAction("presets")}`
);

content = content.replace(
  `onClick={() => {
                      st.openSettings();
                      handleStart();
                    }}`,
  `onClick={() => handleAction("settings")}`
);

fs.writeFileSync(path, content);
