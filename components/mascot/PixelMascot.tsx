'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
// GANTI BARIS 5 DAN 6 DENGAN INI:
import { getDialoguePool } from '../../lib/game/dialogue';
import type { MascotMood, StarterMascotId } from '../../types/game';

export interface PixelMascotProps {
  mood: MascotMood;
  healthScore: number;
  /** Fired on every tap; the parent plays the 8-bit sound here. */
  onTap: () => void;
  variant?: StarterMascotId;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Sprite data (16x16). Letters map to the palettes below.             */
/* ------------------------------------------------------------------ */

const SPRITE: readonly string[] = [
  '................',
  '..oo........oo..',
  '.obbo......obbo.',
  '.obbbbssbbssbbo.',
  'obbbbbbssbbbbbbo',
  'obbeebbbbbbeebbo',
  'obbewbbbbbbewbbo',
  'owwbbbbnnbbbbwwo',
  'owwwbbbbmmbbbwwo',
  '.owwwwwwwwwwwwo.',
  '..obbbbbbbbbbo..',
  '.obbbswwwwsbbbo.',
  '.obbbswwwwsbbbo.',
  '.obbbbwwwwbbbbo.',
  '.obbbo....obbbo.',
  '.oooooo..oooooo.',
];

type Palette = Record<string, string>;

const PALETTES: Record<StarterMascotId, Palette> = {
  cuan_tiger_default: {
    o: '#2b1a12', b: '#f5a623', s: '#7a3b0c', w: '#fff1d0', e: '#1a1a1a',
    n: '#ff7a8a', m: '#5a2a1a', h: '#fff1d0', g: '#ffd23f', r: '#ff6b35',
  },
  ignis_dragon_default: {
    o: '#2a0d0d', b: '#e8483a', s: '#8c1c13', w: '#ffd9a0', e: '#1a1a1a',
    n: '#ffb02e', m: '#5a1a12', h: '#ffe29a', g: '#ffd23f', r: '#ff6b35',
  },
  aero_phoenix_default: {
    o: '#0d2a3d', b: '#35b5ff', s: '#1565c0', w: '#e6fbff', e: '#14213d',
    n: '#ffcf33', m: '#0d4f7a', h: '#e6fbff', g: '#ffcf33', r: '#ff6b35',
  },
};

interface PixelOverride {
  x: number;
  y: number;
  ch: string;
}

/** Per-variant details laid over the shared body: horns for the dragon, a crest for the phoenix. */
const OVERRIDES: Record<StarterMascotId, readonly PixelOverride[]> = {
  cuan_tiger_default: [],
  ignis_dragon_default: [
    { x: 2, y: 2, ch: 'h' }, { x: 3, y: 2, ch: 'h' }, { x: 2, y: 1, ch: 'h' },
    { x: 13, y: 2, ch: 'h' }, { x: 12, y: 2, ch: 'h' }, { x: 13, y: 1, ch: 'h' },
  ],
  aero_phoenix_default: [
    { x: 7, y: 0, ch: 'g' }, { x: 8, y: 0, ch: 'g' },
    { x: 6, y: 1, ch: 'r' }, { x: 7, y: 1, ch: 'g' }, { x: 8, y: 1, ch: 'g' }, { x: 9, y: 1, ch: 'r' },
    { x: 7, y: 2, ch: 'r' }, { x: 8, y: 2, ch: 'r' },
  ],
};

/** Golden crown, drawn two rows above the head (grid y = -2 .. 0). */
const CROWN: readonly string[] = [
  '....g..gg..g....',
  '....gggggggg....',
  '....gjggggjg....',
];
const CROWN_PALETTE: Palette = { g: '#ffd23f', j: '#e63946' };

interface Rect {
  x: number;
  y: number;
  w: number;
  fill: string;
}

/** Merges horizontal runs of the same colour so the SVG stays small. */
function toRects(rows: readonly string[], palette: Palette, yOffset = 0): Rect[] {
  const rects: Rect[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x] ?? '.';
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      const fill = ch === '.' ? undefined : palette[ch];
      if (fill) rects.push({ x, y: y + yOffset, w: run, fill });
      x += run;
    }
  });
  return rects;
}

function buildBodyRects(variant: StarterMascotId): Rect[] {
  const grid = SPRITE.map((row) => row.split(''));
  for (const o of OVERRIDES[variant]) {
    const row = grid[o.y];
    if (row) row[o.x] = o.ch;
  }
  return toRects(
    grid.map((row) => row.join('')),
    PALETTES[variant]
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const CELL = 7; // screen px per sprite pixel
const VIEW_TOP = -3; // room above the head for the crown
const VIEW_ROWS = 19;
const DIALOGUE_INTERVAL_MS = 9000;

export default function PixelMascot({
  mood,
  healthScore,
  onTap,
  variant = 'cuan_tiger_default',
  className = '',
}: PixelMascotProps) {
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const [lineIndex, setLineIndex] = useState(0);

  const bodyRects = useMemo(() => buildBodyRects(variant), [variant]);
  const crownRects = useMemo(() => toRects(CROWN, CROWN_PALETTE, -2), []);
  const pool = useMemo(() => getDialoguePool(mood, healthScore), [mood, healthScore]);
  const line = pool[lineIndex % pool.length] ?? '';

  // New mood -> start from the first line of its pool.
  useEffect(() => {
    setLineIndex(0);
  }, [mood]);

  // Rotate lines slowly so the mascot feels alive.
  useEffect(() => {
    const id = window.setInterval(() => setLineIndex((i) => i + 1), DIALOGUE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const handleTap = useCallback(async () => {
    onTap();
    setLineIndex((i) => i + 1);
    if (reduceMotion) return;
    // Squash, spring up, settle.
    await controls.start({ scaleX: 1.18, scaleY: 0.78, transition: { duration: 0.07 } });
    await controls.start({
      scaleX: 1,
      scaleY: 1,
      y: -30,
      transition: { type: 'spring', stiffness: 700, damping: 11 },
    });
    await controls.start({ y: 0, transition: { type: 'spring', stiffness: 260, damping: 9 } });
  }, [controls, onTap, reduceMotion]);

  const width = 16 * CELL;
  const height = VIEW_ROWS * CELL;

  return (
    <div className={`pm-root pm-${mood.toLowerCase()} ${className}`}>
      <style>{MASCOT_CSS}</style>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${mood}-${line}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="pm-bubble mb-3 ml-auto w-max max-w-[15rem] rounded-xl border-2 border-white/70 bg-white/15 px-3 py-2 text-sm font-medium leading-snug text-white shadow-lg backdrop-blur-xl"
        >
          {line}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={handleTap}
        aria-label="Si Cuan. Ketuk untuk mengajaknya bicara"
        className="relative mx-auto block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{ width, height }}
      >
        <motion.div animate={controls} style={{ originY: 1, width, height }}>
          <div className="pm-body" style={{ width, height }}>
            <svg
              width={width}
              height={height}
              viewBox={`0 ${VIEW_TOP} 16 ${VIEW_ROWS}`}
              shapeRendering="crispEdges"
              aria-hidden
              style={{ imageRendering: 'pixelated' }}
            >
              {bodyRects.map((r, i) => (
                <rect key={`b${i}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
              ))}
              {mood === 'HAPPY' &&
                crownRects.map((r, i) => (
                  <rect key={`c${i}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
                ))}
            </svg>

            {mood === 'HAPPY' && (
              <>
                <span className="pm-star" style={{ left: 2, top: 4, animationDelay: '0s' }} />
                <span className="pm-star" style={{ left: width - 18, top: 0, animationDelay: '0.6s' }} />
                <span className="pm-star" style={{ left: width / 2 - 7, top: -8, animationDelay: '1.2s' }} />
              </>
            )}

            {mood === 'PANIC' && (
              <span className="pm-sweat" aria-hidden>
                💦
              </span>
            )}

            {mood === 'CRYING' && (
              <>
                <span className="pm-tear" style={{ left: 3.5 * CELL, top: 9.5 * CELL, animationDelay: '0s' }} />
                <span className="pm-tear" style={{ left: 3.5 * CELL, top: 9.5 * CELL, animationDelay: '0.55s' }} />
                <span className="pm-tear" style={{ left: 11.5 * CELL, top: 9.5 * CELL, animationDelay: '0.25s' }} />
                <span className="pm-tear" style={{ left: 11.5 * CELL, top: 9.5 * CELL, animationDelay: '0.8s' }} />
              </>
            )}
          </div>
        </motion.div>
      </button>

      <div className="pm-shadow mx-auto" aria-hidden />
    </div>
  );
}

const MASCOT_CSS = `
.pm-root{position:relative;display:flex;flex-direction:column;align-items:flex-end}
.pm-body{position:relative;transform-origin:50% 100%;will-change:transform}
.pm-shadow{width:84px;height:10px;margin-top:-4px;border-radius:50%;background:rgba(0,0,0,.28);filter:blur(2px)}

.pm-neutral .pm-body{animation:pm-breathe 2.6s ease-in-out infinite}
.pm-happy .pm-body{animation:pm-jump .9s ease-in-out infinite}
.pm-panic .pm-body{animation:pm-shake .18s linear infinite}
.pm-crying .pm-body{animation:pm-sob 1.5s ease-in-out infinite}
.pm-attack .pm-body{animation:pm-lunge .7s ease-in-out infinite;filter:drop-shadow(0 0 6px #ff3b30)}

@keyframes pm-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.96)}}
@keyframes pm-jump{
  0%,100%{transform:translateY(0) scale(1.06,.92)}
  15%{transform:translateY(0) scale(.95,1.06)}
  50%{transform:translateY(-18px) scale(.97,1.04)}
  85%{transform:translateY(0) scale(1.05,.94)}
}
@keyframes pm-shake{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-4px) rotate(-2deg)}75%{transform:translateX(4px) rotate(2deg)}}
@keyframes pm-sob{0%,100%{transform:translateY(10px) scale(1.04,.86)}50%{transform:translateY(13px) scale(1.06,.82)}}
@keyframes pm-lunge{0%,100%{transform:translateX(0) scale(1)}50%{transform:translateX(-18px) scale(1.1,.95)}}

.pm-star{position:absolute;width:14px;height:14px;background:#ffd23f;opacity:0;
  clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
  animation:pm-star 1.8s ease-out infinite}
@keyframes pm-star{0%{opacity:0;transform:translateY(8px) scale(.4) rotate(0)}30%{opacity:1}100%{opacity:0;transform:translateY(-34px) scale(1) rotate(40deg)}}

.pm-sweat{position:absolute;right:-4px;top:6px;font-size:22px;line-height:1;animation:pm-sweat .7s ease-in-out infinite alternate}
@keyframes pm-sweat{from{transform:translateY(0) rotate(-6deg)}to{transform:translateY(6px) rotate(6deg)}}

.pm-tear{position:absolute;width:6px;height:10px;background:#5ac8fa;border:1px solid #1d7fb8;opacity:0;animation:pm-tear 1.1s linear infinite}
@keyframes pm-tear{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(38px)}}

@media (prefers-reduced-motion:reduce){
  .pm-root *{animation:none !important}
}
`;
