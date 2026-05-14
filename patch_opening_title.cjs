const fs = require('fs');
const path = 'B:/claudecode/tokyo-ghoul-tavern/src/components/game/OpeningSequence.tsx';

let content = fs.readFileSync(path, 'utf8');

const oldTimers = `const timers = [
      setTimeout(() => setPhase(1), 1000),  // [1.0s] 显示第一句话
      setTimeout(() => setPhase(2), 7000),  // [7.0s] 第一句话消失，显示第二句话（留了6秒阅读时间）
      setTimeout(() => setPhase(3), 13000), // [13.0s] 第二句话消失，爆发大标题（留了6秒阅读时间）
      setTimeout(() => setPhase(4), 18000), // [18.0s] 大标题停留5秒后开始渐隐
      setTimeout(onComplete, 20000),        // [20.0s] 彻底卸载组件（2秒淡出时间）
    ];`;

const newTimers = `const timers = [
      setTimeout(() => setPhase(1), 1000),  // [1.0s] 显示第一句话
      setTimeout(() => setPhase(2), 7000),  // [7.0s] 第一句话消失，显示第二句话
      setTimeout(() => setPhase(3), 13000), // [13.0s] 第二句话消失，爆发大标题
      setTimeout(() => setPhase(4), 22000), // [22.0s] 大标题停留9秒后开始特效渐隐，拉长沉浸感
      setTimeout(onComplete, 25000),        // [25.0s] 彻底卸载组件
    ];`;

content = content.replace(oldTimers, newTimers);

const oldPhase3 = `{phase === 3 && (
          <motion.div
            key="phase3"
            className="flex flex-col items-center justify-center relative w-full h-full"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1, type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* 血红冲击波背景 */}
            <motion.div 
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.4)_0%,_transparent_60%)] pointer-events-none"
            />
            
            <h1 
              className="text-6xl md:text-9xl font-black text-white tracking-widest uppercase rgb-split z-20 mix-blend-screen" 
              data-text="TOKYO GHOUL"
              style={{ fontFamily: "Impact, 'Arial Black', sans-serif" }}
            >
              TOKYO GHOUL
            </h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mt-8 text-ghoul-red tracking-[0.8em] text-xs md:text-sm font-mono font-bold z-20 drop-shadow-[0_0_5px_rgba(220,38,38,1)]"
            >
              10th ANNIVERSARY INTERACTIVE PROJECT
            </motion.p>
          </motion.div>
        )}`;

const newPhase3 = `{phase === 3 && (
          <motion.div
            key="phase3"
            className="flex flex-col items-center justify-center relative w-full h-full animate-shake"
            initial={{ opacity: 0, scale: 1.5, filter: 'brightness(2) contrast(2)' }}
            animate={{ opacity: 1, scale: 1, filter: 'brightness(1) contrast(1)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px) sepia(1) hue-rotate(-50deg) saturate(5)' }}
            transition={{ duration: 3, ease: "easeOut" }}
          >
            {/* 血红冲击波背景与裂痕转场暗示 */}
            <motion.div 
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 3 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.8)_0%,_transparent_50%)] pointer-events-none mix-blend-color-dodge z-10"
            />
            
            {/* 更优雅且具有电影感的西文字体 */}
            <h1 
              className="text-5xl md:text-8xl font-black text-white tracking-[0.3em] uppercase rgb-split z-20 mix-blend-screen english-title drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" 
              data-text="TOKYO GHOUL"
            >
              TOKYO GHOUL
            </h1>
            
            {/* 底部副标题同样更换字体 */}
            <motion.p 
              initial={{ opacity: 0, y: 30, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 1, duration: 2 }}
              className="mt-12 text-ghoul-red tracking-[0.8em] text-xs md:text-sm english-title font-bold z-20 drop-shadow-[0_0_15px_rgba(220,38,38,1)]"
            >
              10th ANNIVERSARY INTERACTIVE PROJECT
            </motion.p>
          </motion.div>
        )}`;

content = content.replace(oldPhase3, newPhase3);

fs.writeFileSync(path, content);
