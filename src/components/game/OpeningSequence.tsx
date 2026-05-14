import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OpeningSequence.css';

export function OpeningSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),  // 句子1
      setTimeout(() => setPhase(2), 5500),  // 句子2
      setTimeout(() => setPhase(3), 10000), // 优雅浮现主标题
      setTimeout(() => setPhase(4), 14000), // 标题消失
      setTimeout(() => setPhase(5), 15000), // 斩击线出现
      setTimeout(() => setPhase(6), 15300), // 屏幕上下分割
      setTimeout(onComplete, 17000),        // 彻底卸载组件
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none pointer-events-none">
      
      {/* 屏幕上半区遮罩 */}
      <motion.div 
        className="absolute top-0 left-0 w-full h-[50vh] bg-[#030303] z-40 border-b border-transparent"
        initial={{ y: 0 }}
        animate={{ y: phase >= 6 ? "-100%" : 0, borderColor: phase === 5 ? "rgba(220, 38, 38, 0.8)" : "transparent" }}
        transition={{ 
          y: { duration: 1.2, ease: [0.76, 0, 0.24, 1] },
          borderColor: { duration: 0.1 } 
        }}
      >
        <div className="absolute inset-0 opening-noise" />
      </motion.div>

      {/* 屏幕下半区遮罩 */}
      <motion.div 
        className="absolute bottom-0 left-0 w-full h-[50vh] bg-[#030303] z-40 border-t border-transparent"
        initial={{ y: 0 }}
        animate={{ y: phase >= 6 ? "100%" : 0, borderColor: phase === 5 ? "rgba(220, 38, 38, 0.8)" : "transparent" }}
        transition={{ 
          y: { duration: 1.2, ease: [0.76, 0, 0.24, 1] },
          borderColor: { duration: 0.1 } 
        }}
      >
        <div className="absolute inset-0 opening-noise" />
      </motion.div>

      {/* 斩击特效线 */}
      <AnimatePresence>
        {phase === 5 && (
          <motion.div 
            className="absolute top-1/2 left-0 w-full h-[2px] bg-white shadow-[0_0_20px_red] z-50 origin-center -translate-y-1/2"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* 跳过按钮 */}
      <motion.button 
        onClick={onComplete}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 6 ? 0 : 0.5 }}
        whileHover={{ opacity: 1, textShadow: "0 0 8px rgba(255,255,255,0.8)" }}
        className="absolute top-8 right-8 text-xs tracking-[0.4em] text-[#888] transition-all z-50 cursor-pointer font-sans pointer-events-auto"
      >
        SKIP
      </motion.button>

      {/* 居中文字层 */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === 1 && (
            <motion.div
              key="phase1"
              initial={{ opacity: 0, filter: 'blur(20px)' }}
              animate={{ opacity: 0.9, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(15px)' }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="text-[#e2e2e2] text-xl md:text-2xl tracking-[0.6em] japanese-serif text-glow font-light"
            >
              美しく悲しい世界
            </motion.div>
          )}

          {phase === 2 && (
            <motion.div
              key="phase2"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
            >
              <h1 
                className="text-5xl md:text-8xl font-black text-white tracking-[0.3em] uppercase rgb-split z-20 english-title drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" 
                data-text="TOKYO GHOUL"
              >
                TOKYO GHOUL
              </h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 1.5 }}
                className="mt-12 text-ghoul-red tracking-[0.8em] text-xs md:text-sm english-title font-bold z-20 drop-shadow-[0_0_15px_rgba(220,38,38,1)]"
              >
                10th ANNIVERSARY INTERACTIVE PROJECT
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
