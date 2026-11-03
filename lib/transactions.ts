import { calculateKingdomHealth, type DebtSnapshot } from './game/mechanics';
import type { BudgetView } from '../components/dashboard/GlassCards';

export type TransactionKind = 'expense' | 'income';
export type WalletKind = 'cash' | 'bank';
export type CategoryKey = 'food' | 'transport' | 'shopping' | 'bills' | 'fun' | 'salary' | 'bonus';

export const MAX_AMOUNT = 999_999_999;

export interface CategoryMeta {
  label: string;
  emoji: string;
  kind: TransactionKind;
}

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  food: { label: 'Makanan', emoji: '🍔', kind: 'expense' },
  transport: { label: 'Transport', emoji: '🚀', kind: 'expense' },
  shopping: { label: 'Belanja', emoji: '🛍️', kind: 'expense' },
  bills: { label: 'Tagihan', emoji: '⚡', kind: 'expense' },
  fun: { label: 'Hiburan', emoji: '🎮', kind: 'expense' },
  salary: { label: 'Gaji', emoji: '💼', kind: 'income' },
  bonus: { label: 'Bonus', emoji: '🎁', kind: 'income' },
};

export const EXPENSE_CATEGORIES: CategoryKey[] = ['food', 'transport', 'shopping', 'bills', 'fun'];
export const INCOME_CATEGORIES: CategoryKey[] = ['salary', 'bonus'];

export interface HeroState {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  goldCoins: number;
  streakDays: number;
  lastActiveDate?: string | null;
}

export interface GameContext {
  hero: HeroState;
  totalBalance: number;
  budgets: readonly BudgetView[];
  debts: readonly DebtSnapshot[];
}

export interface TransactionInput {
  type: TransactionKind;
  amount: number;
  categoryKey: CategoryKey;
  source: 'manual' | 'scan';
  wallet: WalletKind;
  merchant?: string;
}

export interface TransactionPrefill {
  type?: TransactionKind;
  amount?: number;
  categoryKey?: CategoryKey;
  merchant?: string;
  source?: 'manual' | 'scan';
}

export interface TransactionRecord extends TransactionInput {
  id: string;
  createdAt: string;
}

export interface SaveRewards {
  exp: number;
  gold: number;
  comboMultiplier: number;
  scanBonus: boolean;
}

export interface SaveResult {
  record: TransactionRecord;
  context: GameContext;
  rewards: SaveRewards;
  levelsGained: number;
  levelUpBonusGold: number;
  loot: { emoji: string; name: string };
  persisted: { local: boolean; remote: boolean; remoteError?: string };
}

export function toJakartaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
}

export function getProjectedStreak(hero: HeroState): number {
  const today = toJakartaDateString();
  if (hero.lastActiveDate === today) return hero.streakDays;
  return hero.streakDays + 1;
}

export function getContextHealth(context: GameContext): number {
  const snapshots = context.budgets.map((b) => ({ monthly_limit: b.limit, current_spent: b.spent }));
  return calculateKingdomHealth(snapshots, context.debts, context.hero.streakDays);
}

export function calculateRewards(source: 'manual' | 'scan', streakDays: number): SaveRewards {
  const comboMultiplier = streakDays >= 7 ? 2 : streakDays >= 3 ? 1.5 : 1;
  const scanBonus = source === 'scan';
  const baseExp = 15;
  const baseGold = scanBonus ? 20 : 10;

  return {
    exp: Math.round(baseExp * comboMultiplier),
    gold: Math.round(baseGold * (scanBonus ? 2 : 1)),
    comboMultiplier,
    scanBonus,
  };
}

function isSameCategory(budgetLabel: string, categoryKey: CategoryKey): boolean {
  const metaLabel = CATEGORY_META[categoryKey]?.label.toLowerCase() || '';
  const label = budgetLabel.toLowerCase();
  return label.includes(metaLabel) || metaLabel.includes(label) || label.includes(categoryKey);
}

export function previewTransaction(
  context: GameContext,
  input: TransactionInput
): {
  healthAfter: number;
  spendingHealthLoss: number;
  overBudgetBy: number;
  hasBudget: boolean;
} {
  const isExpense = input.type === 'expense';

  const targetBudget = context.budgets.find((b) => isSameCategory(b.label, input.categoryKey));

  const updatedBudgets = context.budgets.map((b) => {
    if (isSameCategory(b.label, input.categoryKey)) {
      return { ...b, spent: isExpense ? b.spent + input.amount : Math.max(0, b.spent - input.amount) };
    }
    return b;
  });

  const oldSnapshots = context.budgets.map((b) => ({ monthly_limit: b.limit, current_spent: b.spent }));
  const newSnapshots = updatedBudgets.map((b) => ({ monthly_limit: b.limit, current_spent: b.spent }));

  const currentHealth = calculateKingdomHealth(oldSnapshots, context.debts, context.hero.streakDays);
  const healthAfter = calculateKingdomHealth(newSnapshots, context.debts, context.hero.streakDays);

  const overBudgetBy = targetBudget && isExpense ? Math.max(0, targetBudget.spent + input.amount - targetBudget.limit) : 0;

  return {
    healthAfter,
    spendingHealthLoss: Math.max(0, currentHealth - healthAfter),
    overBudgetBy,
    hasBudget: Boolean(targetBudget),
  };
}

export async function saveTransaction(input: TransactionInput, context: GameContext): Promise<SaveResult> {
  const today = toJakartaDateString();
  const streakDays = getProjectedStreak(context.hero);
  const rewards = calculateRewards(input.source, streakDays);

  let newExp = context.hero.currentExp + rewards.exp;
  let newLevel = context.hero.level;
  let nextExp = context.hero.nextLevelExp;
  let levelUpBonus = 0;
  let levelsGained = 0;

  while (newExp >= nextExp) {
    newExp -= nextExp;
    newLevel += 1;
    levelsGained += 1;
    levelUpBonus += 100;
    nextExp = Math.round(nextExp * 1.25);
  }

  const updatedHero: HeroState = {
    ...context.hero,
    level: newLevel,
    currentExp: newExp,
    nextLevelExp: nextExp,
    goldCoins: context.hero.goldCoins + rewards.gold + levelUpBonus,
    streakDays,
    lastActiveDate: today,
  };

  const isExpense = input.type === 'expense';
  const updatedBalance = isExpense
    ? context.totalBalance - input.amount
    : context.totalBalance + input.amount;

  const updatedBudgets = context.budgets.map((b) => {
    if (isSameCategory(b.label, input.categoryKey)) {
      return { ...b, spent: isExpense ? b.spent + input.amount : Math.max(0, b.spent - input.amount) };
    }
    return b;
  });

  const record: TransactionRecord = {
    ...input,
    id: `tx_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const existingTxRaw = localStorage.getItem('cuanverse_transactions') || '[]';
    const existingTx = JSON.parse(existingTxRaw);
    localStorage.setItem('cuanverse_transactions', JSON.stringify([record, ...existingTx]));
    localStorage.setItem('cuanverse_balance', String(updatedBalance));
    localStorage.setItem('cuanverse_budgets', JSON.stringify(updatedBudgets));
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }

  const updatedContext: GameContext = {
    hero: updatedHero,
    totalBalance: updatedBalance,
    budgets: updatedBudgets,
    debts: context.debts,
  };

  const lootEmojis = ['💎', '🗝️', '📜', '🔮', '🛡️'];
  const randomLoot = lootEmojis[Math.floor(Math.random() * lootEmojis.length)];

  return {
    record,
    context: updatedContext,
    rewards,
    levelsGained,
    levelUpBonusGold: levelUpBonus,
    loot: { emoji: randomLoot, name: `${CATEGORY_META[input.categoryKey].label} Chest` },
    persisted: { local: true, remote: false },
  };
}