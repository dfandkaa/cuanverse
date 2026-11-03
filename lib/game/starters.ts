import type { StarterMascot } from '@/types/game';

export const STARTER_MASCOTS: readonly StarterMascot[] = [
  {
    id: 'cuan_tiger_default',
    name: 'Si Cuan Tiger',
    emoji: '🐯',
    tagline: 'Penjaga kas yang sabar',
    description: 'Tenang, teliti, dan tidak suka pemborosan. Cocok kalau kamu ingin mulai dari kebiasaan dasar.',
    glowClass: 'from-amber-400/40 to-orange-500/10',
    ringClass: 'ring-amber-300',
  },
  {
    id: 'ignis_dragon_default',
    name: 'Ignis Dragon',
    emoji: '🐉',
    tagline: 'Pemburu utang dan target besar',
    description: 'Berapi-api dan suka tantangan. Cocok kalau kamu ingin cepat melunasi utang dan mengejar target.',
    glowClass: 'from-rose-500/40 to-red-600/10',
    ringClass: 'ring-rose-300',
  },
  {
    id: 'aero_phoenix_default',
    name: 'Aero Phoenix',
    emoji: '🦅',
    tagline: 'Bangkit lagi setelah boncos',
    description: 'Ringan dan optimis. Cocok kalau kamu ingin bangun lagi setelah bulan yang berantakan.',
    glowClass: 'from-sky-400/40 to-cyan-500/10',
    ringClass: 'ring-sky-300',
  },
] as const;
