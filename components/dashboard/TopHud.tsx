'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '../../lib/game/sfx';

export interface TopHudProps {
  username?: string | null;
  avatarEmoji: string;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  goldCoins: number;
  healthScore: number;
  weather?: string;
  onOpenStats?: () => void;
  onOpenBoss?: () => void;
}

export default function TopHud({
  username = 'Ksatria Cuan',
  avatarEmoji,
  level,
  currentExp,
  nextLevelExp,
  goldCoins,
  healthScore,
  onOpenStats,
  onOpenBoss,
}: TopHudProps) {
  const displayName = username || 'Ksatria Cuan';
  const expPercent = Math.min(100, Math.round((currentExp / Math.max(1, nextLevelExp)) * 100));
  const [isMuted, setIsMuted] = useState(() => sfx.getMuted());

  const handleToggleSound = () => {
    const nextState = sfx.toggleMute();
    setIsMuted(nextState);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-white/20 bg-black/40 p-2.5 backdrop-blur-md">
      <button
        type="button"
        onClick={onOpenStats}
        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-1.5 text-left transition hover:bg-white/15 active:scale-95"
        title="Klik untuk lihat Status Karakter RPG"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-2xl shadow-inner">
          {avatarEmoji}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white">{displayName}</span>
            <span className="rounded-md border border-amber-300/40 bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300">
              Lv. {level}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-2 w-20 overflow-hidden rounded-full border border-white/20 bg-black/60">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={false}
                animate={{ width: `${expPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/70">{expPercent}%</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        {/* Tombol Mute/Unmute */}
        <button
          type="button"
          onClick={handleToggleSound}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm transition hover:bg-white/15 active:scale-95"
          title={isMuted ? 'Buka Suara SFX' : 'Mute Suara SFX'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-xs font-extrabold text-amber-200">
          <span className="text-base">🪙</span>
          <span>{new Intl.NumberFormat('id-ID').format(goldCoins)}</span>
        </div>

        <button
          type="button"
          onClick={onOpenBoss}
          className="flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-gradient-to-b from-rose-500/30 to-red-700/40 px-3 py-1.5 text-xs font-extrabold text-rose-200 transition hover:bg-rose-500/40 active:scale-95"
          title="Klik untuk Lawan Bos Hutang"
        >
          <span className="text-base">⚔️</span>
          <span>Bos</span>
        </button>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white/80">
          <span>❤️</span>
          <span>{healthScore}%</span>
        </div>
      </div>
    </div>
  );
}