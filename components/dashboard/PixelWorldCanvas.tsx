'use client';

import { useEffect, useRef } from 'react';
import {
  GRID_SIZE,
  TILE_DEPTH,
  TILE_H,
  TILE_W,
  gridToScreen,
  hash2,
  hashString,
  type Point,
} from '@/lib/game/iso';
import type { SavingsQuest } from '@/types/database';
import type { WeatherType } from '@/types/game';

export type QuestBuilding = Pick<SavingsQuest, 'id' | 'building_unlock_id' | 'is_completed'>;

export interface PixelWorldCanvasProps {
  weather: WeatherType;
  /** Completed quests become buildings; the first unfinished one shows as a build site. */
  quests: readonly QuestBuilding[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Themes                                                              */
/* ------------------------------------------------------------------ */

interface TerrainTheme {
  top: readonly string[];
  left: string;
  right: string;
  accent: string;
  puddle: string;
}

const TERRAIN: Record<WeatherType, TerrainTheme> = {
  SUNNY: { top: ['#6cc24a', '#62b744', '#74cc52'], left: '#3f8a35', right: '#4e9e3d', accent: '#9be36d', puddle: '#6cc24a' },
  RAINY: { top: ['#7a5c3e', '#6e5236', '#836445'], left: '#4a3624', right: '#5a422c', accent: '#4a3624', puddle: '#4a77a8' },
  THUNDERSTORM: { top: ['#5e4a38', '#54422f', '#665240'], left: '#3a2b1e', right: '#463524', accent: '#33261a', puddle: '#3b5f8a' },
  VOLCANIC_DISASTER: { top: ['#3a2c2c', '#332626', '#423232'], left: '#1f1616', right: '#291c1c', accent: '#120a0a', puddle: '#b52a0c' },
};

const SKY: Record<WeatherType, readonly [string, string]> = {
  SUNNY: ['#7cc8ff', '#d9f2ff'],
  RAINY: ['#667a93', '#a3b3c4'],
  THUNDERSTORM: ['#232a3a', '#4a5568'],
  VOLCANIC_DISASTER: ['#2a0d0d', '#7a2412'],
};

const CLOUD: Record<WeatherType, readonly [string, string]> = {
  SUNNY: ['#ffffff', '#dbeeff'],
  RAINY: ['#b9c4d0', '#98a6b6'],
  THUNDERSTORM: ['#4b5563', '#374151'],
  VOLCANIC_DISASTER: ['#4a2420', '#2f1514'],
};

const TINT: Record<WeatherType, string | null> = {
  SUNNY: null,
  RAINY: 'rgba(40,60,90,0.16)',
  THUNDERSTORM: 'rgba(8,12,32,0.34)',
  VOLCANIC_DISASTER: 'rgba(40,0,0,0.22)',
};

/* ------------------------------------------------------------------ */
/* Pixel primitives                                                    */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Pixel-perfect iso diamond via scanlines. `top` is the top vertex; `halfW` must be even. */
function drawDiamond(ctx: Ctx, cx: number, top: number, halfW: number, color: string): void {
  ctx.fillStyle = color;
  const x0 = Math.round(cx);
  const y0 = Math.round(top);
  const rows = halfW;
  const mid = rows / 2;
  for (let r = 0; r < rows; r++) {
    const k = Math.min(r, rows - 1 - r) + 1;
    const half = Math.round((halfW * k) / mid);
    ctx.fillRect(x0 - half, y0 + r, half * 2, 1);
  }
}

interface BoxColors {
  top: string;
  left: string;
  right: string;
}

/** Iso box whose footprint diamond has its top vertex at (cx, fy). */
function drawBox(ctx: Ctx, cx: number, fy: number, hw: number, height: number, c: BoxColors): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(fy);
  ctx.fillStyle = c.left;
  for (let x = x0 - hw; x < x0; x++) {
    const bottom = y0 + hw / 2 + Math.floor((x - (x0 - hw)) / 2);
    ctx.fillRect(x, bottom - height, 1, height);
  }
  ctx.fillStyle = c.right;
  for (let x = x0; x < x0 + hw; x++) {
    const bottom = y0 + hw - Math.floor((x - x0) / 2);
    ctx.fillRect(x, bottom - height, 1, height);
  }
  drawDiamond(ctx, x0, y0 - height, hw, c.top);
}

/** Stacked shrinking diamonds read as a pyramid roof. */
function drawRoof(ctx: Ctx, cx: number, centerY: number, baseHalfW: number, a: string, b: string): void {
  let k = 0;
  for (let halfW = baseHalfW; halfW >= 2; halfW -= 2) {
    drawDiamond(ctx, cx, centerY - k * 2 - halfW / 2, halfW, k % 2 === 0 ? a : b);
    k++;
  }
}

function drawFlag(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(Math.round(x), Math.round(y), 1, 7);
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) + 1, Math.round(y), 4, 3);
}

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

type BuildingKind = 'hut' | 'house' | 'tower' | 'castle';
const KINDS: readonly BuildingKind[] = ['hut', 'house', 'tower', 'castle'];

function kindFor(buildingId: string): BuildingKind {
  const id = buildingId.toLowerCase();
  if (id.includes('hut')) return 'hut';
  if (id.includes('house')) return 'house';
  if (id.includes('tower')) return 'tower';
  if (id.includes('castle') || id.includes('palace') || id.includes('keep')) return 'castle';
  const idx = Math.floor((Math.abs(hashString(id)) % 1000) / 250);
  return KINDS[idx] ?? 'hut';
}

/** `y` is the top vertex of the tile the building stands on. */
function drawBuilding(ctx: Ctx, kind: BuildingKind, cx: number, tileTop: number, gold = false): void {
  const x = Math.round(cx);
  const place = (hw: number) => Math.round(tileTop + TILE_H / 2 - hw / 2);

  switch (kind) {
    case 'hut': {
      const hw = 10;
      const fy = place(hw);
      drawBox(ctx, x, fy, hw, 8, { top: '#e8d2a6', left: '#c9a96e', right: '#a98650' });
      drawRoof(ctx, x, fy - 8 + hw / 2, hw + 2, '#c0392b', '#a93226');
      ctx.fillStyle = '#4a2f1a';
      ctx.fillRect(x - 6, fy + hw / 2 + 2 - 5, 3, 5);
      break;
    }
    case 'house': {
      const hw = 12;
      const fy = place(hw);
      drawBox(ctx, x, fy, hw, 12, { top: '#f2e6d0', left: '#d9c7a3', right: '#bfa97f' });
      drawRoof(ctx, x, fy - 12 + hw / 2, hw + 2, '#3b6fb6', '#2f5a96');
      ctx.fillStyle = '#4a2f1a';
      ctx.fillRect(x - 7, fy + hw / 2 + 3 - 6, 3, 6);
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(x + 3, fy + hw - 3 - 8, 3, 3);
      break;
    }
    case 'tower': {
      const hw = 8;
      const fy = place(hw);
      drawBox(ctx, x, fy, hw, 26, { top: '#b9bcc6', left: '#8f93a1', right: '#767a88' });
      drawRoof(ctx, x, fy - 26 + hw / 2, hw + 2, '#7b3fa0', '#63308a');
      drawFlag(ctx, x, fy - 26 - 10, '#ffd23f');
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(x + 2, fy + hw - 2 - 14, 2, 3);
      break;
    }
    case 'castle': {
      const hw = 14;
      const fy = place(hw);
      drawBox(ctx, x, fy, hw, 16, { top: '#c9ccd6', left: '#9a9eac', right: '#7d8190' });
      const towerHw = 8;
      const towerFy = fy - 16 + hw / 2 - towerHw / 2;
      drawBox(ctx, x, towerFy, towerHw, 12, { top: '#d6d9e2', left: '#a7abb9', right: '#8a8e9d' });
      drawRoof(ctx, x, towerFy - 12 + towerHw / 2, towerHw + 2, gold ? '#ffd23f' : '#c0392b', gold ? '#e0a800' : '#a93226');
      drawFlag(ctx, x, towerFy - 12 - 9, gold ? '#e63946' : '#ffd23f');
      ctx.fillStyle = '#4a2f1a';
      ctx.fillRect(x - 8, fy + hw / 2 + 4 - 6, 4, 6);
      break;
    }
  }
}

function drawBuildSite(ctx: Ctx, cx: number, tileTop: number, time: number): void {
  const hw = 12;
  const x = Math.round(cx);
  const fy = Math.round(tileTop + TILE_H / 2 - hw / 2);
  ctx.globalAlpha = 0.28 + 0.1 * Math.sin(time * 2.5);
  drawDiamond(ctx, x, fy, hw, '#ffffff');
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#caa56a';
  for (const [sx, sy] of [
    [x - hw, fy + hw / 2],
    [x + hw - 1, fy + hw / 2],
    [x, fy],
    [x, fy + hw - 1],
  ] as const) {
    ctx.fillRect(sx, sy - 5, 1, 5);
  }
}

/** Grid plots for quest buildings, plus the kingdom keep in the middle. */
const KEEP: readonly [number, number] = [6, 6];
const PLOTS: ReadonlyArray<readonly [number, number]> = [
  [3, 3], [9, 3], [3, 9], [9, 9], [6, 2], [2, 6], [10, 6], [6, 10],
];

interface Placed {
  gx: number;
  gy: number;
  draw: (ctx: Ctx, p: Point, time: number) => void;
}

function collectBuildings(quests: readonly QuestBuilding[]): Placed[] {
  const placed: Placed[] = [
    { gx: KEEP[0], gy: KEEP[1], draw: (ctx, p) => drawBuilding(ctx, 'castle', p.x, p.y, true) },
  ];
  let siteShown = false;
  quests.slice(0, PLOTS.length).forEach((quest, i) => {
    const plot = PLOTS[i];
    if (!plot) return;
    const [gx, gy] = plot;
    if (quest.is_completed) {
      const kind = kindFor(quest.building_unlock_id);
      placed.push({ gx, gy, draw: (ctx, p) => drawBuilding(ctx, kind, p.x, p.y) });
    } else if (!siteShown) {
      siteShown = true;
      placed.push({ gx, gy, draw: (ctx, p, time) => drawBuildSite(ctx, p.x, p.y, time) });
    }
  });
  return placed.sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
}

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

function drawSky(ctx: Ctx, w: number, h: number, weather: WeatherType): void {
  const [top, bottom] = SKY[weather];
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = lerpColor(top, bottom, i / (bands - 1));
    const y0 = Math.floor((i * h) / bands);
    const y1 = Math.floor(((i + 1) * h) / bands);
    ctx.fillRect(0, y0, w, y1 - y0);
  }
}

function drawTerrain(ctx: Ctx, weather: WeatherType, time: number, origin: Point): void {
  const theme = TERRAIN[weather];
  const last = GRID_SIZE - 1;

  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const p = gridToScreen(gx, gy, origin);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const h = hash2(gx, gy, 1);
      const h2 = hash2(gx, gy, 2);
      const color = theme.top[Math.floor(h * theme.top.length)] ?? theme.top[0] ?? '#000';

      // Island edge faces (only the two front edges are ever visible).
      if (gy === last) {
        ctx.fillStyle = theme.left;
        for (let i = 0; i < TILE_W / 2; i++) {
          ctx.fillRect(x - TILE_W / 2 + i, y + TILE_H / 2 + Math.floor(i / 2), 1, TILE_DEPTH);
        }
      }
      if (gx === last) {
        ctx.fillStyle = theme.right;
        for (let i = 0; i < TILE_W / 2; i++) {
          ctx.fillRect(x + i, y + TILE_H - Math.floor(i / 2), 1, TILE_DEPTH);
        }
      }

      const lava = weather === 'VOLCANIC_DISASTER' && h > 0.8;
      drawDiamond(ctx, x, y, TILE_W / 2, lava ? '#b52a0c' : color);

      if (weather === 'SUNNY') {
        if (h2 > 0.55) {
          const ox = Math.round((hash2(gx, gy, 3) - 0.5) * 14);
          const oy = 5 + Math.round(hash2(gx, gy, 4) * 5);
          ctx.fillStyle = theme.accent;
          ctx.fillRect(x + ox, y + oy, 1, 2);
          ctx.fillRect(x + ox + 2, y + oy + 1, 1, 1);
          if (h2 > 0.93) {
            ctx.fillStyle = '#ff8fb1';
            ctx.fillRect(x + ox - 2, y + oy, 1, 1);
          }
        }
      } else if (weather === 'RAINY' || weather === 'THUNDERSTORM') {
        if (h > 0.82) {
          drawDiamond(ctx, x, y + 4, 8, theme.puddle);
          ctx.fillStyle = '#9cc7f0';
          ctx.fillRect(x - 2, y + 7, 2, 1);
          if (Math.floor(time * 3 + h * 10) % 3 === 0) {
            ctx.fillStyle = '#cfe6ff';
            ctx.fillRect(x + 1, y + 9, 3, 1);
          }
        } else if (h2 > 0.6) {
          const ox = Math.round((hash2(gx, gy, 3) - 0.5) * 14);
          ctx.fillStyle = theme.accent;
          ctx.fillRect(x + ox, y + 7, 3, 1);
        }
      } else if (lava) {
        const flicker = Math.sin(time * 3 + h * 40) > 0;
        drawDiamond(ctx, x, y + 5, 6, flicker ? '#ff7a1f' : '#ffb02e');
      } else if (h2 > 0.45) {
        // Cracked, scorched ground.
        const ox = Math.round((hash2(gx, gy, 3) - 0.5) * 8);
        ctx.fillStyle = theme.accent;
        ctx.fillRect(x + ox - 3, y + 6, 2, 1);
        ctx.fillRect(x + ox - 1, y + 7, 2, 1);
        ctx.fillRect(x + ox + 1, y + 8, 2, 1);
        ctx.fillRect(x + ox + 3, y + 9, 2, 1);
        if (Math.sin(time * 2 + h2 * 30) > 0.3) {
          ctx.fillStyle = '#ff5a1f';
          ctx.fillRect(x + ox + 1, y + 8, 1, 1);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Particles and weather effects                                       */
/* ------------------------------------------------------------------ */

interface Drop { x: number; y: number; speed: number; len: number }
interface Ember { x: number; y: number; vx: number; vy: number; size: number; phase: number }
interface Sparkle { x: number; y: number; phase: number; speed: number }
interface Cloud { x: number; y: number; speed: number; scale: number }

interface FxState {
  drops: Drop[];
  embers: Ember[];
  sparkles: Sparkle[];
  clouds: Cloud[];
  flash: number;
  nextFlash: number;
  bolt: Point[] | null;
}

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

function seedFx(weather: WeatherType, w: number, h: number): FxState {
  const storm = weather === 'THUNDERSTORM';
  const dropCount = weather === 'RAINY' ? 120 : storm ? 260 : 0;
  const cloudCount = weather === 'SUNNY' ? 4 : 6;
  return {
    clouds: Array.from({ length: cloudCount }, () => ({
      x: rand(-30, w),
      y: rand(4, h * 0.3),
      speed: rand(2, storm ? 10 : 6),
      scale: rand(2, 4),
    })),
    drops: Array.from({ length: dropCount }, () => ({
      x: rand(0, w + 40),
      y: rand(0, h),
      speed: storm ? rand(220, 320) : rand(140, 220),
      len: Math.round(rand(4, 8)),
    })),
    embers: Array.from({ length: weather === 'VOLCANIC_DISASTER' ? 80 : 0 }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-4, 4),
      vy: -rand(8, 30),
      size: Math.random() > 0.7 ? 2 : 1,
      phase: rand(0, 6.28),
    })),
    sparkles: Array.from({ length: weather === 'SUNNY' ? 36 : 0 }, () => ({
      x: rand(w * 0.2, w * 0.8),
      y: rand(h * 0.25, h * 0.85),
      phase: rand(0, 6.28),
      speed: rand(1.5, 3.5),
    })),
    flash: 0,
    nextFlash: rand(1.5, 4),
    bolt: null,
  };
}

function makeBolt(w: number, h: number): Point[] {
  let x = rand(w * 0.2, w * 0.8);
  const points: Point[] = [{ x, y: 0 }];
  for (let y = 8; y <= h * 0.55; y += 8) {
    x += rand(-7, 7);
    points.push({ x, y });
  }
  return points;
}

function stepFx(fx: FxState, weather: WeatherType, dt: number, w: number, h: number): void {
  for (const c of fx.clouds) {
    c.x += c.speed * dt;
    if (c.x > w + 20) c.x = -40;
  }
  for (const d of fx.drops) {
    d.y += d.speed * dt;
    d.x -= d.speed * 0.25 * dt;
    if (d.y > h || d.x < -10) {
      d.y = -d.len;
      d.x = rand(0, w + 40);
    }
  }
  for (const e of fx.embers) {
    e.y += e.vy * dt;
    e.x += e.vx * dt + Math.sin(e.phase + e.y * 0.05) * 0.2;
    if (e.y < -4) {
      e.y = h + 4;
      e.x = rand(0, w);
    }
  }
  if (weather === 'THUNDERSTORM') {
    fx.nextFlash -= dt;
    if (fx.nextFlash <= 0) {
      fx.flash = 1;
      fx.bolt = makeBolt(w, h);
      fx.nextFlash = rand(3, 8);
    }
    fx.flash = Math.max(0, fx.flash - dt * 2.2);
    if (fx.flash === 0) fx.bolt = null;
  }
}

function drawCloud(ctx: Ctx, c: Cloud, colors: readonly [string, string]): void {
  const u = c.scale;
  const x = Math.round(c.x);
  const y = Math.round(c.y);
  ctx.fillStyle = colors[1];
  ctx.fillRect(x, Math.round(y + 2 * u), Math.round(14 * u), Math.round(3 * u));
  ctx.fillStyle = colors[0];
  ctx.fillRect(Math.round(x + 2 * u), Math.round(y + u), Math.round(10 * u), Math.round(2 * u));
  ctx.fillRect(Math.round(x + 5 * u), y, Math.round(5 * u), Math.round(u));
}

function drawFx(ctx: Ctx, fx: FxState, weather: WeatherType, time: number, w: number, h: number): void {
  if (weather === 'SUNNY') {
    // Sunbeams
    for (let i = 0; i < 5; i++) {
      const x0 = w * (0.05 + i * 0.22) + Math.sin(time * 0.3 + i) * 6;
      ctx.fillStyle = `rgba(255,244,180,${0.08 + 0.04 * Math.sin(time * 0.8 + i * 1.7)})`;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + 22, 0);
      ctx.lineTo(x0 + 22 + h * 0.45, h);
      ctx.lineTo(x0 + h * 0.45, h);
      ctx.closePath();
      ctx.fill();
    }
    // Sparkles
    ctx.fillStyle = '#fff7b0';
    for (const s of fx.sparkles) {
      const a = Math.sin(time * s.speed + s.phase);
      if (a <= 0.35) continue;
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      ctx.globalAlpha = a;
      ctx.fillRect(x, y, 1, 1);
      if (a > 0.8) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (weather === 'RAINY' || weather === 'THUNDERSTORM') {
    ctx.fillStyle = weather === 'THUNDERSTORM' ? '#8fb4e8' : '#7fb0ee';
    ctx.globalAlpha = 0.75;
    for (const d of fx.drops) {
      for (let i = 0; i < d.len; i += 2) {
        ctx.fillRect(Math.round(d.x - i * 0.3), Math.round(d.y + i), 1, 2);
      }
    }
    ctx.globalAlpha = 1;

    if (weather === 'THUNDERSTORM' && fx.bolt && fx.flash > 0.25) {
      ctx.fillStyle = '#fffbd0';
      ctx.globalAlpha = Math.min(1, fx.flash * 1.4);
      for (let i = 1; i < fx.bolt.length; i++) {
        const a = fx.bolt[i - 1];
        const b = fx.bolt[i];
        if (!a || !b) continue;
        const left = Math.round(Math.min(a.x, b.x)) - 1;
        ctx.fillRect(left, Math.round(a.y), Math.round(Math.abs(b.x - a.x)) + 3, Math.round(b.y - a.y));
      }
      ctx.globalAlpha = 1;
    }
    return;
  }

  // Volcanic: embers
  for (const e of fx.embers) {
    const flick = Math.sin(time * 6 + e.phase);
    ctx.fillStyle = flick > 0.4 ? '#ffd24a' : flick > -0.3 ? '#ff7a1f' : '#d9380f';
    ctx.fillRect(Math.round(e.x), Math.round(e.y), e.size, e.size);
  }
}

function drawOverlays(ctx: Ctx, fx: FxState, weather: WeatherType, time: number, w: number, h: number): void {
  const tint = TINT[weather];
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
  }
  if (weather === 'THUNDERSTORM' && fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(fx.flash * 0.55).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (weather === 'VOLCANIC_DISASTER') {
    const alpha = 0.38 + 0.12 * Math.sin(time * 2);
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    g.addColorStop(0, 'rgba(255,60,0,0)');
    g.addColorStop(1, `rgba(255,70,10,${alpha.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PixelWorldCanvas({ weather, quests, className = '' }: PixelWorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const questsRef = useRef(quests);

  useEffect(() => {
    questsRef.current = quests;
  });

  const questKey = quests.map((q) => `${q.id}:${q.is_completed}:${q.building_unlock_id}`).join('|');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const ctx: Ctx = context;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let fx = seedFx(weather, 1, 1);
    let raf = 0;
    let last = performance.now();

    const draw = (time: number) => {
      ctx.imageSmoothingEnabled = false;
      const origin: Point = {
        x: Math.round(width / 2),
        y: Math.round(height * 0.55 - (GRID_SIZE * TILE_H) / 2),
      };
      drawSky(ctx, width, height, weather);
      for (const c of fx.clouds) drawCloud(ctx, c, CLOUD[weather]);
      drawTerrain(ctx, weather, time, origin);
      for (const b of collectBuildings(questsRef.current)) {
        b.draw(ctx, gridToScreen(b.gx, b.gy, origin), time);
      }
      drawFx(ctx, fx, weather, time, width, height);
      drawOverlays(ctx, fx, weather, time, width, height);
    };

    const resize = () => {
      const scale = window.innerWidth < 640 ? 2 : 3;
      width = Math.ceil(window.innerWidth / scale);
      height = Math.ceil(window.innerHeight / scale);
      canvas.width = width;
      canvas.height = height;
      fx = seedFx(weather, width, height);
      if (reduced) draw(0);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stepFx(fx, weather, dt, width, height);
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    // Reduced motion: one static frame instead of an animation loop.
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [weather, questKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`h-full w-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
