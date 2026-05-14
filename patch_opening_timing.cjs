const fs = require('fs');
const path = 'B:/claudecode/tokyo-ghoul-tavern/src/components/game/OpeningSequence.tsx';

let content = fs.readFileSync(path, 'utf8');

// 找到旧的定时器设置，延长每一步的展示时间
const oldTimers = `const timers = [
      setTimeout(() => setPhase(1), 1000), // 显示第一句话
      setTimeout(() => setPhase(2), 5000), // 第一句话消失，显示第二句话
      setTimeout(() => setPhase(3), 8500), // 爆发、RGB分离的故障效果
      setTimeout(() => setPhase(4), 11500), // 渐隐，进入深红深渊
      setTimeout(onComplete, 13000),        // 彻底卸载组件
    ];`;

const newTimers = `const timers = [
      setTimeout(() => setPhase(1), 1000),  // [1.0s] 显示第一句话
      setTimeout(() => setPhase(2), 7000),  // [7.0s] 第一句话消失，显示第二句话（留了6秒阅读时间）
      setTimeout(() => setPhase(3), 13000), // [13.0s] 第二句话消失，爆发大标题（留了6秒阅读时间）
      setTimeout(() => setPhase(4), 18000), // [18.0s] 大标题停留5秒后开始渐隐
      setTimeout(onComplete, 20000),        // [20.0s] 彻底卸载组件（2秒淡出时间）
    ];`;

content = content.replace(oldTimers, newTimers);

// 找到第一句话的退场时间，调整得更慢一些
content = content.replace(
  'transition={{ duration: 2.5, ease: "easeInOut" }}',
  'transition={{ duration: 3.5, ease: "easeInOut" }}'
);

// 找到第二句话的退场时间
content = content.replace(
  'transition={{ duration: 2, ease: "easeOut" }}',
  'transition={{ duration: 3, ease: "easeOut" }}'
);

fs.writeFileSync(path, content);
