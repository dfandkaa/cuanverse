export interface DebtBoss {
  id: string;
  name: string;
  emoji: string;
  totalDebt: number;
  currentHp: number;
  maxHp: number;
  interestRate: number;
  isDefeated: boolean;
}

export const INITIAL_BOSSES: DebtBoss[] = [
  {
    id: 'paylater_dragon',
    name: 'Naga Paylater',
    emoji: '🐉',
    totalDebt: 750000,
    currentHp: 750000,
    maxHp: 750000,
    interestRate: 2.5,
    isDefeated: false,
  },
  {
    id: 'gadget_cicilan',
    name: 'Monster Cicilan Gadget',
    emoji: '👾',
    totalDebt: 1200000,
    currentHp: 1200000,
    maxHp: 1200000,
    interestRate: 1.8,
    isDefeated: false,
  },
];

export function getBosses(): DebtBoss[] {
  if (typeof window === 'undefined') return INITIAL_BOSSES;
  try {
    const saved = localStorage.getItem('cuanverse_bosses');
    return saved ? JSON.parse(saved) : INITIAL_BOSSES;
  } catch {
    return INITIAL_BOSSES;
  }
}

export function attackBoss(
  bossId: string,
  paymentAmount: number
): { updatedBosses: DebtBoss[]; isFatal: boolean; damageDealt: number } {
  const bosses = getBosses();
  let isFatal = false;

  const updatedBosses = bosses.map((boss) => {
    if (boss.id === bossId) {
      const newHp = Math.max(0, boss.currentHp - paymentAmount);
      if (newHp === 0 && !boss.isDefeated) {
        isFatal = true;
      }
      return {
        ...boss,
        currentHp: newHp,
        isDefeated: newHp === 0,
      };
    }
    return boss;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('cuanverse_bosses', JSON.stringify(updatedBosses));
  }

  return { updatedBosses, isFatal, damageDealt: paymentAmount };
}