import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TitleScreen.css';

export function TitleScreen({ onAction }: { onAction: (action: "start" | "presets" | "settings") => void }) {

  // phase: 0=空白, 1=句1, 2=句2, 3=主标题展示, 4=主标题停留并显示菜单, 5=开始分割转场
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),  // 句子1
      setTimeout(() => setPhase(2), 5000),  // 句子2
      setTimeout(() => setPhase(3), 9000),  // 优雅浮现主标题
      setTimeout(() => setPhase(4), 11000), // 显示菜单
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleAction = (action: 'start' | 'presets' | 'settings') => {
    setPhase(5);
    setTimeout(() => onAction(action), 2000); // 2秒转场结束后触发行为
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-transparent">
      
      {/* 屏幕上半区遮罩 */}
      <motion.div 
        className="absolute top-0 left-0 w-full h-[50vh] bg-[#08080a] z-40 border-b border-transparent"
        initial={{ y: 0 }}
        animate={{ 
          y: phase === 5 ? "-100%" : 0, 
          borderColor: phase === 5 ? "rgba(220, 38, 38, 0.8)" : "transparent" 
        }}
        transition={{ 
          y: { duration: 1.2, ease: [0.76, 0, 0.24, 1] },
          borderColor: { duration: 0.1 } 
        }}
      >
        <div className="absolute inset-0 static-noise-bg" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      </motion.div>

      {/* 屏幕下半区遮罩 */}
      <motion.div 
        className="absolute bottom-0 left-0 w-full h-[50vh] bg-[#08080a] z-40 border-t border-transparent"
        initial={{ y: 0 }}
        animate={{ 
          y: phase === 5 ? "100%" : 0, 
          borderColor: phase === 5 ? "rgba(220, 38, 38, 0.8)" : "transparent" 
        }}
        transition={{ 
          y: { duration: 1.2, ease: [0.76, 0, 0.24, 1] },
          borderColor: { duration: 0.1 } 
        }}
      >
        <div className="absolute inset-0 static-noise-bg" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-transparent" />
      </motion.div>

      {/* 斩击特效线 */}
      <AnimatePresence>
        {phase === 5 && (
          <motion.div 
            className="absolute top-1/2 left-0 w-full h-[1px] bg-white shadow-[0_0_15px_red] z-50 origin-center -translate-y-1/2"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* 居中内容层 */}
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

          {phase >= 3 && phase < 5 && (
            <motion.div
              key="phase3"
              className="flex flex-col items-center justify-center relative w-full h-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <h1 
                className="text-5xl md:text-7xl font-black text-white tracking-[0.1em] uppercase english-title drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
              >
                TOKYO GHOUL
              </h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1.5 }}
                className="mt-6 text-ghoul-red tracking-[0.6em] text-xs font-mono font-bold drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]"
              >
                10th ANNIVERSARY INTERACTIVE PROJECT
              </motion.p>

              {/* 游戏开始菜单栏 */}
              {phase === 4 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1 }}
                  className="mt-16 flex flex-col gap-4 w-64 items-center"
                >
                  <button 
                    onClick={() => handleAction("start")}
                    className="w-full py-3 border border-ghoul-muted/30 text-white hover:border-ghoul-red hover:text-ghoul-red hover:bg-ghoul-red/10 transition-all font-serif tracking-widest bg-black/50 backdrop-blur-sm"
                  >
                    开始游戏
                  </button>
                  <button 
                    onClick={() => handleAction("presets")}
                    className="w-full py-3 border border-ghoul-muted/30 text-ghoul-muted hover:border-white hover:text-white transition-all font-serif tracking-widest bg-black/50 backdrop-blur-sm"
                  >
                    选择对话
                  </button>
                  <button 
                    onClick={() => handleAction("settings")}
                    className="w-full py-3 border border-ghoul-muted/30 text-ghoul-muted hover:border-white hover:text-white transition-all font-serif tracking-widest bg-black/50 backdrop-blur-sm"
                  >
                    API 设置
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
