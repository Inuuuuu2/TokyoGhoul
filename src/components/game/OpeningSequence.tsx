import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function OpeningSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 阶段控制
    const timers = [
      setTimeout(() => setPhase(1), 1500), // 显示第一句话
      setTimeout(() => setPhase(2), 4000), // 显示第二句话
      setTimeout(() => setPhase(3), 6000), // 爆发、故障效果
      setTimeout(() => setPhase(4), 8500), // 渐隐，结束
      setTimeout(onComplete, 9500),        // 彻底卸载组件
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden font-serif"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 4 ? 0 : 1 }}
      transition={{ duration: 1 }}
    >
      {/* 噪点背景层 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* 跳过按钮 */}
      <button 
        onClick={onComplete}
        className="absolute top-8 right-8 text-xs tracking-[0.3em] text-[#666] hover:text-white transition-colors z-50 cursor-pointer"
      >
        SKIP
      </button>

      <AnimatePresence mode="wait">
        {phase === 1 && (
          <motion.div
            key="phase1"
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 1.5 }}
            className="text-white text-xl tracking-[0.5em]"
          >
            美しく悲しい世界
          </motion.div>
        )}

        {phase === 2 && (
          <motion.div
            key="phase2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.5 }}
            className="text-ghoul-red text-2xl tracking-[0.3em] font-bold"
          >
            ダークでスリリングな世界観
          </motion.div>
        )}

        {phase === 3 && (
          <motion.div
            key="phase3"
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1, type: "spring", stiffness: 200 }}
          >
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-widest uppercase glitch-effect relative" data-text="TOKYO GHOUL">
              TOKYO GHOUL
            </h1>
            <p className="mt-6 text-ghoul-red tracking-[0.5em] text-sm md:text-base font-mono">
              INTERACTIVE NOVEL PROJECT
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
