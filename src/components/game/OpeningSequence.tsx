import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OpeningSequence.css';

export function OpeningSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 阶段控制，让节奏更舒缓和富有电影感
    const timers = [
      setTimeout(() => setPhase(1), 1000),  // [1.0s] 显示第一句话
      setTimeout(() => setPhase(2), 7000),  // [7.0s] 第一句话消失，显示第二句话
      setTimeout(() => setPhase(3), 13000), // [13.0s] 第二句话消失，爆发大标题
      setTimeout(() => setPhase(4), 22000), // [22.0s] 大标题停留9秒后开始特效渐隐，拉长沉浸感
      setTimeout(onComplete, 25000),        // [25.0s] 彻底卸载组件
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030303] overflow-hidden select-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 4 ? 0 : 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      {/* 动态噪点和暗角增强电影感 */}
      <div className="absolute inset-0 opening-noise" />
      <div className="absolute inset-0 opening-vignette" />

      {/* 跳过按钮，加入细微发光 */}
      <motion.button 
        onClick={onComplete}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        whileHover={{ opacity: 1, textShadow: "0 0 8px rgba(255,255,255,0.8)" }}
        className="absolute top-8 right-8 text-xs tracking-[0.4em] text-[#888] transition-all z-50 cursor-pointer font-sans"
      >
        SKIP
      </motion.button>

      <AnimatePresence mode="wait">
        {phase === 1 && (
          <motion.div
            key="phase1"
            initial={{ opacity: 0, filter: 'blur(20px)', scale: 0.95 }}
            animate={{ opacity: 0.9, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(15px)', scale: 1.05 }}
            transition={{ duration: 3.5, ease: "easeInOut" }}
            className="text-[#e2e2e2] text-xl md:text-2xl tracking-[0.6em] japanese-serif text-glow font-light"
          >
            美しく悲しい世界
          </motion.div>
        )}

        {phase === 2 && (
          <motion.div
            key="phase2"
            initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.1 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="text-ghoul-red text-2xl md:text-3xl tracking-[0.4em] japanese-serif text-glow-red font-bold"
          >
            ダークでスリリングな世界観
          </motion.div>
        )}

        {phase === 3 && (
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}
