/** Isometric (2:1) grid math shared by the world renderer. All values are logical pixels. */
export const TILE_W = 32;
export const TILE_H = 16;
export const GRID_SIZE = 14;
/** Thickness of the island's edge faces. */
export const TILE_DEPTH = 6;

export interface Point {
  x: number;
  y: number;
}

/** Grid (gx, gy) -> screen position of the tile's top vertex. */
export function gridToScreen(gx: number, gy: number, origin: Point): Point {
  return {
    x: origin.x + (gx - gy) * (TILE_W / 2),
    y: origin.y + (gx + gy) * (TILE_H / 2),
  };
}

/** Inverse of gridToScreen (fractional grid coordinates; floor them to pick a tile). */
export function screenToGrid(sx: number, sy: number, origin: Point): Point {
  const dx = (sx - origin.x) / (TILE_W / 2);
  const dy = (sy - origin.y) / (TILE_H / 2);
  return { x: (dy + dx) / 2, y: (dy - dx) / 2 };
}

/** Deterministic pseudo-random 0..1 for a tile, so terrain does not flicker between frames. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hashString(value: string): number {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = (Math.imul(h, 33) + value.charCodeAt(i)) | 0;
  return h;
}
