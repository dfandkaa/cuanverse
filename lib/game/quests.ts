export interface SavingsQuest {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  buildingName: string;
  buildingEmoji: string;
  isCompleted: boolean;
}

export const INITIAL_QUESTS: SavingsQuest[] = [
  {
    id: 'quest_emergency',
    title: 'Dana Darurat 1 Juta',
    targetAmount: 1000000,
    currentAmount: 350000,
    buildingName: 'Lumbung Emas',
    buildingEmoji: '🌾',
    isCompleted: false,
  },
  {
    id: 'quest_investment',
    title: 'Investasi Pertama',
    targetAmount: 500000,
    currentAmount: 500000,
    buildingName: 'Kastil Cuan',
    buildingEmoji: '🏰',
    isCompleted: true,
  },
];

export function getQuests(): SavingsQuest[] {
  if (typeof window === 'undefined') return INITIAL_QUESTS;
  try {
    const saved = localStorage.getItem('cuanverse_quests');
    return saved ? JSON.parse(saved) : INITIAL_QUESTS;
  } catch {
    return INITIAL_QUESTS;
  }
}