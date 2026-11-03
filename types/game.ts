export type MascotMood = 'HAPPY' | 'NEUTRAL' | 'PANIC' | 'CRYING' | 'ATTACK';
export type WeatherType = 'SUNNY' | 'RAINY' | 'THUNDERSTORM' | 'VOLCANIC_DISASTER';

export interface MascotState {
  mood: MascotMood;
  currentDialogue: string;
  skinId: string;
}

export interface KingdomStatus {
  healthScore: number;
  weather: WeatherType;
  activeEffects: string[];
}

/** Matches the values accepted by `complete_onboarding` in schema.sql. */
export type StarterMascotId =
  | 'cuan_tiger_default'
  | 'ignis_dragon_default'
  | 'aero_phoenix_default';

export interface StarterMascot {
  id: StarterMascotId;
  name: string;
  /** Temporary stand-in until pixel sprites exist. */
  emoji: string;
  tagline: string;
  description: string;
  /** Full Tailwind class strings (must be literal so Tailwind can detect them). */
  glowClass: string;
  ringClass: string;
}
