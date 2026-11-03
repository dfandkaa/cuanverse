'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type QuickAction = 'expense' | 'income' | 'scan';

export interface QuickActionFabProps {
  onSelect: (action: QuickAction) => void;
  onToggle?: (open: boolean) => void;
  className?: string;
}

export default function QuickActionFab({
  onSelect,
  onToggle,
  className = '',
}: QuickActionFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(next);
  };

  const handleAction = (action: QuickAction) => {
    setIsOpen(false);
    onSelect(action);
  };

  return (
    <div className={className}>
      <div className="relative flex flex-col items-center">
        {/* Sub-tombol Pilihan */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.8 }}
              className="absolute bottom-16 flex gap-2 sm:gap-3"
            >
              <button
                type="button"
                onClick={() => handleAction('expense')}
                className="flex flex-col items-center gap-1 whitespace-nowrap rounded-2xl border-2 border-white/40 bg-gradient-to-b from-rose-400 to-red-600 px-3 py-2 text-xs font-black text-white shadow-lg transition active:scale-95"
              >
                <span>⚔️</span>
                <span>Pengeluaran</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction('scan')}
                className="flex flex-col items-center gap-1 whitespace-nowrap rounded-2xl border-2 border-white/40 bg-gradient-to-b from-cyan-400 to-blue-600 px-3 py-2 text-xs font-black text-white shadow-lg transition active:scale-95"
              >
                <span>🧾</span>
                <span>Scan Struk</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction('income')}
                className="flex flex-col items-center gap-1 whitespace-nowrap rounded-2xl border-2 border-white/40 bg-gradient-to-b from-amber-300 to-yellow-500 px-3 py-2 text-xs font-black text-slate-900 shadow-lg transition active:scale-95"
              >
                <span>🪙</span>
                <span>Pemasukan</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tombol Utama (+) */}
        <motion.button
          type="button"
          onClick={toggleOpen}
          whileTap={{ scale: 0.9 }}
          className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-amber-300 bg-gradient-to-b from-amber-400 to-yellow-600 text-2xl font-bold text-slate-900 shadow-[0_0_25px_rgba(251,191,36,0.5)] focus:outline-none"
        >
          {isOpen ? '✕' : '＋'}
        </motion.button>
      </div>
    </div>
  );
}