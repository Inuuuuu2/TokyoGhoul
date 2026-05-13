import { useState } from "react";
import { StatusBar } from "./components/game/StatusBar";
import { OptionList } from "./components/game/OptionList";
import { Modal } from "./components/ui/Modal";
import { Map, User } from "lucide-react";
import { motion } from "framer-motion";

export default function App() {
  const [showMap, setShowMap] = useState(false);
  const [showNpc, setShowNpc] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] bg-ghoul-dark text-ghoul-text">
      {/* 顶部状态栏 */}
      <StatusBar
        rcLevel={45}
        hunger={75}
        suspicion={15}
        sanity={60}
        time="23:45"
        location="20区 - 阴暗小巷"
      />

      {/* 主界面 */}
      <main className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-4 gap-6">

        {/* 左侧/顶部：环境立绘或氛围图 (占位但有高质感) */}
        <div className="md:w-1/3 flex flex-col gap-4">
          <div className="relative aspect-[3/4] border border-[#222] bg-[#0a0a0c] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505] z-10" />
            <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-1000 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ghoul-red via-ghoul-dark to-ghoul-darker" />
            <div className="absolute bottom-4 left-4 z-20">
              <h2 className="font-serif text-2xl text-white tracking-[0.2em] mb-1 glitch-effect" data-text="神代利世">神代利世</h2>
              <p className="text-sm text-ghoul-muted font-mono">「暴食者」 | Binge Eater</p>
            </div>
            <button
              onClick={() => setShowNpc(true)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 border border-[#333] hover:border-ghoul-red hover:text-ghoul-red backdrop-blur-md transition-all rounded-full flex items-center justify-center cursor-pointer"
            >
              <User className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setShowMap(true)}
            className="flex items-center gap-3 p-4 bg-[#111] border border-[#222] hover:border-ghoul-red transition-colors w-full group cursor-pointer"
          >
            <Map className="w-5 h-5 text-ghoul-muted group-hover:text-ghoul-red transition-colors" />
            <span className="tracking-widest flex-1 text-left">检视区域地图</span>
          </button>
        </div>

        {/* 右侧：剧情文本与交互 */}
        <div className="md:w-2/3 flex flex-col relative">
          <div className="flex-1 overflow-y-auto pb-32 space-y-6 scroll-smooth pr-4 text-lg leading-relaxed text-[#d4d4d8] font-serif">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
              <p className="mb-4">
                你走在20区阴睡的小巷里，深夜的冷风夹杂着远处下水道的腥臭味。腹部的绞痛越来越强烈，仿佛有一团火在内脏里燃烧。<span className="text-red-500/80">（饥饿度急剧上升）</span>。
              </p>
              <p className="mb-4">
                前方出现了一个踉跄的醉汉，他身上散发出对现在的你来说极为诱人的气味。你的左眼开始不受控制地发热，视线被染上了一层猩红。
              </p>
              <p className="italic text-ghoul-muted border-l-2 border-ghoul-red/50 pl-4 py-2 bg-gradient-to-r from-ghoul-red/10 to-transparent">
                “好饿……真的好饿……” 你的脑海中只剩下这个声音。
              </p>
            </motion.div>

            <OptionList
              options={[
                { id: "1", text: "强忍饥饿，闭上眼睛迅速逃离这条小巷。" },
                { id: "2", text: "释放赫子，扑向那个毫无防备的猎物。" },
                { id: "3", text: "寻找附近的自动售货机，买杯黑咖啡试图压制本能。" }
              ]}
              onSelect={(id) => console.log('Selected:', id)}
            />
          </div>
        </div>
      </main>

      {/* NPC 面板模态框 */}
      <Modal isOpen={showNpc} onClose={() => setShowNpc(false)} title="情报档案: 目标对象">
        <div className="flex gap-6">
          <div className="w-32 h-40 bg-[#1a1a1a] border border-[#333] flex-shrink-0 relative overflow-hidden flex items-center justify-center">
            <span className="text-ghoul-muted text-xs">NO IMAGE DATA</span>
            <div className="absolute inset-0 bg-gradient-to-t from-ghoul-red/20 to-transparent mix-blend-overlay"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded">代号 NAME</span>
              <span className="text-ghoul-red font-bold tracking-widest text-lg">神代 利世 (Rize Kamishiro)</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded"> Rc类型 TYPE</span>
              <span className="text-white tracking-widest font-serif">鳞赫 (Rinkaku)</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-ghoul-muted font-mono text-xs border border-ghoul-muted/50 px-1.5 py-0.5 rounded"> 危险评级 RANK</span>
              <span className="text-orange-500 font-bold tracking-widest font-serif">S~SS</span>
            </div>
            <p className="text-sm text-ghoul-muted leading-relaxed mt-4 border-l-2 border-ghoul-red/50 pl-3">
              被CCG称为「暴食者」的危险喰种。外表是优雅的知性女性，但其捕食行为毫无节制且极端残忍。
            </p>
          </div>
        </div>
      </Modal>

      {/* 地图模态框 */}
      <Modal isOpen={showMap} onClose={() => setShowMap(false)} title="区域简图: 第20区" className="max-w-3xl">
        <div className="aspect-[16/9] bg-[#050505] relative border border-[#222] flex items-center justify-center overflow-hidden">
          {/* 纯CSS雷达/网格特效充当高级地图质感 */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute rounded-full border border-ghoul-red pointer-events-none"
            style={{ width: '100px', height: '100px', top: 'calc(40% - 50px)', left: 'calc(30% - 50px)' }}
          />
          <div className="absolute top-[40%] left-[30%] w-3 h-3 bg-red-600 rounded-full shadow-[0_0_10px_red] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-ghoul-red text-white text-xs whitespace-nowrap px-2 py-1 z-10">当前位置</div>
          </div>
          <span className="absolute top-[43%] left-[30%] text-xs text-red-500 font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]">CURRENT POS</span>

          <div className="absolute top-[20%] right-[30%] w-2 h-2 bg-[#ccc] rounded-full shadow-[0_0_5px_white] -translate-x-1/2 -translate-y-1/2 group cursor-pointer hover:scale-150 transition-transform">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[#ccc] text-white text-xs whitespace-nowrap px-2 py-1 z-10">咖啡店「古董」</div>
          </div>
          <span className="absolute top-[23%] right-[30%] text-xs text-[#ccc] font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">ANTEIKU</span>

          <div className="absolute bottom-[20%] left-[50%] w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_blue] -translate-x-1/2 -translate-y-1/2 group cursor-pointer hover:scale-150 transition-transform">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-blue-500 text-white text-xs whitespace-nowrap px-2 py-1 z-10">CCG 20区支部</div>
          </div>
          <span className="absolute bottom-[23%] left-[50%] text-xs text-blue-400 font-mono -translate-x-1/2 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">CCG BRANCH 20</span>

          <div className="absolute bottom-4 right-4 text-xs font-mono text-[#333]">MAP DATA: OFFLINE</div>
        </div>
      </Modal>
    </div>
  );
}