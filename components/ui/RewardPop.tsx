'use client';

import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface RewardPopPayload {
  /** Changes on every new reward so the animation restarts. */
  id: string;
  exp: number;
  gold: number;
  /** 1 = no combo. */
  comboMultiplier: number;
  scanBonus: boolean;
  levelUp: { newLevel: number; bonusGold: number } | null;
  lootEmoji?: string;
  lootName?: string;
}

export interface RewardPopProps {
  reward: RewardPopPayload | null;
  onDone: () => void;
}

type Tone = 'exp' | 'gold' | 'combo' | 'scan' | 'level' | 'loot';

interface PopLine {
  key: string;
  text: string;
  tone: Tone;
  big: boolean;
}

const TONE_CLASS: Record<Tone, string> = {
  exp: 'text-sky-300',
  gold: 'text-amber-300',
  combo: 'text-fuchsia-300',
  scan: 'text-cyan-300',
  level: 'text-lime-300',
  loot: 'text-orange-200',
};

const LINE_STAGGER = 0.3;
const LINE_DURATION = 2.1;
const BURST_EMOJI = ['🪙', '✨', '⭐', '🪙'] as const;

interface Particle {
  key: number;
  emoji: string;
  x: number;
  y: number;
  rotate: number;
  delay: number;
}

function buildLines(reward: RewardPopPayload): PopLine[] {
  const lines: PopLine[] = [
    { key: 'exp', text: `+${reward.exp} EXP!`, tone: 'exp', big: true },
    { key: 'gold', text: `+${reward.gold} COINS!`, tone: 'gold', big: true },
  ];
  if (reward.comboMultiplier > 1) {
    lines.push({ key: 'combo', text: `COMBO STREAK x${reward.comboMultiplier}!`, tone: 'combo', big: false });
  }
  if (reward.scanBonus) {
    lines.push({ key: 'scan', text: 'RECEIPT BONUS: 2x GOLD!', tone: 'scan', big: false });
  }
  if (reward.levelUp) {
    lines.push({
      key: 'level',
      text: `LEVEL UP! Lv ${reward.levelUp.newLevel} (+${reward.levelUp.bonusGold} COINS)`,
      tone: 'level',
      big: true,
    });
  }
  if (reward.lootName) {
    lines.push({ key: 'loot', text: `${reward.lootEmoji ?? '🎁'} ${reward.lootName}`, tone: 'loot', big: false });
  }
  return lines;
}

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 130 + Math.random() * 170;
    return {
      key: i,
      emoji: BURST_EMOJI[i % BURST_EMOJI.length] ?? '✨',
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: (Math.random() - 0.5) * 360,
      delay: Math.random() * 0.15,
    };
  });
}

/** Full-screen RPG reward burst. Call with a new payload after a save; `onDone` fires when it ends. */
export default function RewardPop({ reward, onDone }: RewardPopProps) {
  const reduceMotion = useReducedMotion();
  const lines = useMemo(() => (reward ? buildLines(reward) : []), [reward]);
  const particles = useMemo(
    () => (reward && !reduceMotion ? buildParticles(reward.levelUp ? 26 : 16) : []),
    [reward, reduceMotion]
  );

  useEffect(() => {
    if (!reward) return;
    const totalMs = (lines.length * LINE_STAGGER + LINE_DURATION + 0.2) * 1000;
    const timer = window.setTimeout(onDone, totalMs);
    return () => window.clearTimeout(timer);
  }, [reward, lines.length, onDone]);

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          key={reward.id}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <p role="status" className="sr-only">
            Kamu mendapat {reward.exp} EXP dan {reward.gold} koin
            {reward.levelUp ? `, naik ke level ${reward.levelUp.newLevel}` : ''}.
          </p>

          {/* Flash ring */}
          {!reduceMotion && (
            <motion.div
              aria-hidden
              className="absolute h-40 w-40 rounded-full border-4 border-amber-300"
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          )}

          {/* Particle burst */}
          {particles.map((p) => (
            <motion.span
              key={p.key}
              aria-hidden
              className="absolute text-3xl"
              initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
              animate={{ x: p.x, y: p.y, scale: [0, 1.3, 0.7], opacity: [1, 1, 0], rotate: p.rotate }}
              transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
            >
              {p.emoji}
            </motion.span>
          ))}

          {/* Floating texts */}
          <div className="relative flex flex-col items-center gap-2 px-4 text-center">
            {lines.map((line, i) => (
              <motion.div
                key={line.key}
                initial={{ scale: 0, rotate: reduceMotion ? 0 : -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 520, damping: 10, mass: 0.8, delay: i * LINE_STAGGER }
                }
              >
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={reduceMotion ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], y: [24, 0, -8, -70] }}
                  transition={{
                    duration: LINE_DURATION,
                    delay: i * LINE_STAGGER,
                    times: [0, 0.12, 0.75, 1],
                    ease: 'easeOut',
                  }}
                  className={`font-black tracking-wide ${TONE_CLASS[line.tone]} ${
                    line.big ? 'text-5xl sm:text-6xl' : 'text-2xl sm:text-3xl'
                  }`}
                  style={{
                    WebkitTextStroke: '2px #1a1033',
                    paintOrder: 'stroke fill',
                    textShadow: '0 4px 0 #1a1033, 0 0 24px rgba(255, 210, 63, 0.35)',
                  }}
                >
                  {line.text}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
