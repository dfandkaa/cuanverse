import type { Budget, DebtBoss } from '@/types/database';
import type { MascotMood, WeatherType } from '@/types/game';

/** Only the fields the pure game math needs. */
export type BudgetSnapshot = Pick<Budget, 'monthly_limit' | 'current_spent'>;
export type DebtSnapshot = Pick<DebtBoss, 'is_defeated'>;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/* ------------------------------------------------------------------ */
/* Kingdom health                                                      */
/* ------------------------------------------------------------------ */

const BUDGET_WEIGHT = 60;
const DEBT_WEIGHT = 25;
const STREAK_WEIGHT = 15;
const STREAK_CAP_DAYS = 14;
const DEBT_PENALTY_PER_BOSS = 5;
/** Score used when the user has no budget this month (untracked, so not perfect). */
const NO_BUDGET_FACTOR = 0.75;

/** spent / limit; a zero limit counts as 0 so it never divides by zero. */
export function budgetSpentRatio(budget: BudgetSnapshot): number {
  return budget.monthly_limit > 0 ? budget.current_spent / budget.monthly_limit : 0;
}

/** Number of budgets whose spending passed the monthly limit. */
export function countOverbudget(budgets: readonly BudgetSnapshot[]): number {
  return budgets.filter((b) => budgetSpentRatio(b) > 1).length;
}

/** 1 = healthy, 0 = ruined. Flat until 60% spent, 0.4 at 100%, 0 at 150%. */
function budgetFactor(ratio: number): number {
  if (ratio <= 0.6) return 1;
  if (ratio <= 1) return 1 - ((ratio - 0.6) / 0.4) * 0.6;
  return Math.max(0, 0.4 - (ratio - 1) * 0.8);
}

/**
 * Kingdom health 0-100:
 *  - up to 60 points from the average budget factor (spent ratio),
 *  - up to 25 points from active debts (-5 per undefeated boss),
 *  - up to 15 points from the login streak (caps at 14 days).
 */
export function calculateKingdomHealth(
  budgets: readonly BudgetSnapshot[],
  debts: readonly DebtSnapshot[],
  streakDays: number
): number {
  const budgetScore =
    budgets.length === 0
      ? NO_BUDGET_FACTOR * BUDGET_WEIGHT
      : (budgets.reduce((sum, b) => sum + budgetFactor(budgetSpentRatio(b)), 0) / budgets.length) *
        BUDGET_WEIGHT;

  const activeDebts = debts.filter((d) => !d.is_defeated).length;
  const debtScore = Math.max(0, DEBT_WEIGHT - activeDebts * DEBT_PENALTY_PER_BOSS);

  const streakScore = (clamp(streakDays, 0, STREAK_CAP_DAYS) / STREAK_CAP_DAYS) * STREAK_WEIGHT;

  return Math.round(clamp(budgetScore + debtScore + streakScore, 0, 100));
}

export function getWeatherFromHealth(healthScore: number): WeatherType {
  if (healthScore >= 80) return 'SUNNY';
  if (healthScore >= 50) return 'RAINY';
  if (healthScore >= 20) return 'THUNDERSTORM';
  return 'VOLCANIC_DISASTER';
}

export function getMascotMood(healthScore: number, overbudgetCategories: number): MascotMood {
  if (healthScore < 20) return 'CRYING';
  if (overbudgetCategories > 0) return 'PANIC';
  if (healthScore >= 80) return 'HAPPY';
  return 'NEUTRAL';
}

/* ------------------------------------------------------------------ */
/* HUD helpers                                                         */
/* ------------------------------------------------------------------ */

/** Remaining HP of a budget bar, 0-100 (100 = untouched, 0 = spent or overspent). */
export function getBudgetHp(budget: BudgetSnapshot): number {
  return Math.round(clamp(100 - budgetSpentRatio(budget) * 100, 0, 100));
}

export function expProgressPercent(currentExp: number, nextLevelExp: number): number {
  return nextLevelExp > 0 ? Math.round(clamp((currentExp / nextLevelExp) * 100, 0, 100)) : 0;
}

/**
 * Daily safe-to-spend: what is left of this month's budgets, capped by the money
 * you actually hold, spread over the days left (today included).
 */
export function calculateDailySafeToSpend(
  budgets: readonly BudgetSnapshot[],
  totalBalance: number,
  daysLeft: number
): number {
  const remainingBudget = budgets.reduce(
    (sum, b) => sum + Math.max(0, b.monthly_limit - b.current_spent),
    0
  );
  const spendable = Math.min(remainingBudget, Math.max(0, totalBalance));
  return Math.floor(spendable / Math.max(1, daysLeft));
}

export interface MonthProgress {
  year: number;
  month: number; // 1-12
  day: number;
  daysInMonth: number;
  /** Days remaining in the month, today included. */
  daysLeft: number;
}

/** Calendar position in Asia/Jakarta, independent of the server's timezone. */
export function getJakartaMonthProgress(now: Date = new Date()): MonthProgress {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const read = (type: string): number => Number(parts.find((p) => p.type === type)?.value);

  const year = read('year');
  const month = read('month');
  const day = read('day');
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day, daysInMonth, daysLeft: daysInMonth - day + 1 };
}
