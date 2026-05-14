const fs = require('fs');
const path = 'B:/claudecode/tokyo-ghoul-tavern/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 将 App.tsx 还原回只渲染 GameView
content = `export { GameView as default } from './components/SillyTavern/GameView';
`;
fs.writeFileSync(path, content);
