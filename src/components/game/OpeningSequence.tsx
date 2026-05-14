import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OpeningSequence.css';

export function OpeningSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 阶段控制，让节奏更舒缓和富有电影感
    const timers = [
      setTimeout(() => setPhase(1), 1000), // 显示第一句话
      setTimeout(() => setPhase(2), 5000), // 第一句话消失，显示第二句话
      setTimeout(() => setPhase(3), 8500), // 爆发、RGB分离的故障效果
      setTimeout(() => setPhase(4), 11500), // 渐隐，进入深红深渊
      setTimeout(onComplete, 13000),        // 彻底卸载组件
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
            transition={{ duration: 2.5, ease: "easeInOut" }}
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
            transition={{ duration: 2, ease: "easeOut" }}
            className="text-ghoul-red text-2xl md:text-3xl tracking-[0.4em] japanese-serif text-glow-red font-bold"
          >
            ダークでスリリングな世界観
          </motion.div>
        )}

        {phase === 3 && (
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}
