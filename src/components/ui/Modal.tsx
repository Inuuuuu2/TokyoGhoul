import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-full max-w-lg bg-[#0a0a0c] border border-ghoul-red/30 shadow-[0_0_30px_rgba(138,3,3,0.15)] rounded-lg overflow-hidden",
              className
            )}
          >
            <div className="flex items-center justify-between p-4 border-b border-ghoul-red/20 bg-gradient-to-r from-ghoul-red/10 to-transparent">
              <h2 className="font-serif text-xl text-white tracking-widest">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-ghoul-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}