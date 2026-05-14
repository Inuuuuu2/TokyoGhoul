const fs = require('fs');
const path = 'B:/claudecode/tokyo-ghoul-tavern/src/components/SillyTavern/GameView.tsx';

let content = fs.readFileSync(path, 'utf8');

// 移除不需要的 import
content = content.replace("import { ThinkingFold } from './ThinkingFold';\n", "");
content = content.replace("import { MainTextPane } from './MainTextPane';\n", "");
content = content.replace("import { Modal } from '../ui/Modal';\n", "");
content = content.replace('import { motion } from "framer-motion";\n', "");

fs.writeFileSync(path, content);
