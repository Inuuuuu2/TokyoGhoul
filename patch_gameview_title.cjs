const fs = require('fs');
const path = 'B:/claudecode/tokyo-ghoul-tavern/src/components/SillyTavern/GameView.tsx';

let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'import { useSillytavern } from \'../../hooks/useSillytavern\';',
  'import { useSillytavern } from \'../../hooks/useSillytavern\';\nimport { TitleScreen } from \'../game/TitleScreen\';'
);

content = content.replace(
  'const [inputText, setInputText] = useState("");',
  `const [inputText, setInputText] = useState("");
  
  // 标题界面的控制
  const [showTitleScreen, setShowTitleScreen] = useState(true);

  // 处理开始画面的按钮点击
  const handleTitleScreenAction = (action: 'start' | 'presets' | 'settings') => {
    // 关闭标题画面
    setShowTitleScreen(false);
    
    // 如果需要打开特定弹窗，加一点延迟等斩击动画结束再弹出
    if (action === 'presets') {
      setTimeout(() => st.setShowPresets(true), 1200);
    } else if (action === 'settings') {
      setTimeout(() => st.setShowSettings(true), 1200);
    }
  };`
);

content = content.replace(
  '<div className="min-h-screen flex flex-col',
  `{showTitleScreen && (
        <TitleScreen onAction={handleTitleScreenAction} />
      )}

      <div className="min-h-screen flex flex-col`
);

// 此时因为是在外面包了一层，可能需要把外层改成 Fragment
content = content.replace(
  'return (\n    <div className',
  'return (\n    <>\n      <div className'
);

content = content.replace(
  '      </Modal>\n    </div>\n  );',
  '      </Modal>\n    </div>\n    </>\n  );'
);

fs.writeFileSync(path, content);
