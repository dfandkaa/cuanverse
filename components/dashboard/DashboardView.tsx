'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PixelMascot from '../mascot/PixelMascot';
import RewardPop, { type RewardPopPayload } from '../ui/RewardPop';
import { STARTER_MASCOTS } from '../../lib/game/starters';
import { sfx } from '../../lib/game/sfx';
import {
  calculateDailySafeToSpend,
  calculateKingdomHealth,
  countOverbudget,
  getMascotMood,
  getWeatherFromHealth,
  type DebtSnapshot,
} from '../../lib/game/mechanics';
import type {
  GameContext,
  HeroState,
  SaveResult,
  TransactionKind,
  TransactionPrefill,
} from '../../lib/transactions';
import type { StarterMascotId } from '../../types/game';
import { BalanceCard, BudgetHpCard, SafeToSpendCard, type BudgetView } from './GlassCards';
import PixelWorldCanvas, { type QuestBuilding } from './PixelWorldCanvas';
import QuickActionFab, { type QuickAction } from './QuickActionFab';
import ReceiptScanModal from './ReceiptScanModal';
import TopHud from './TopHud';
import TransactionModal from './TransactionModal';
import TransactionHistoryModal from './TransactionHistoryModal';
import DebtBossModal from './DebtBossModal';
import StatsModal from './StatsModal';

export interface DashboardUser {
  username?: string | null;
  avatar_sprite_id?: string | null;
  level: number;
  current_exp: number;
  next_level_exp: number;
  gold_coins: number;
  streak_days: number;
}

export interface DashboardViewProps {
  user: DashboardUser;
  totalBalance: number;
  budgets: readonly BudgetView[];
  debts: readonly DebtSnapshot[];
  quests: readonly QuestBuilding[];
  daysLeft: number;
  lastActiveDate?: string | null;
  healthOverride?: number | null;
}

type ModalState =
  | { kind: 'transaction'; type: TransactionKind; prefill: TransactionPrefill | null }
  | { kind: 'scan' }
  | null;

const isStarterId = (id: string): id is StarterMascotId => STARTER_MASCOTS.some((m) => m.id === id);

export default function DashboardView({
  user,
  totalBalance,
  budgets,
  debts,
  quests,
  daysLeft,
  lastActiveDate = null,
  healthOverride = null,
}: DashboardViewProps) {
  const [hero, setHero] = useState<HeroState>(() => ({
    level: user.level,
    currentExp: user.current_exp,
    nextLevelExp: user.next_level_exp,
    goldCoins: user.gold_coins,
    streakDays: user.streak_days,
    lastActiveDate,
  }));
  const [balance, setBalance] = useState(totalBalance);
  const [budgetState, setBudgetState] = useState<readonly BudgetView[]>(budgets);

  const [modal, setModal] = useState<ModalState>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showBoss, setShowBoss] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [reward, setReward] = useState<RewardPopPayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const context = useMemo<GameContext>(
    () => ({ hero, totalBalance: balance, budgets: budgetState, debts }),
    [hero, balance, budgetState, debts]
  );

  const { healthScore, weather, mood, dailyLimit } = useMemo(() => {
    const snapshots = budgetState.map((b) => ({ monthly_limit: b.limit, current_spent: b.spent }));
    const health = healthOverride ?? calculateKingdomHealth(snapshots, debts, hero.streakDays);
    return {
      healthScore: health,
      weather: getWeatherFromHealth(health),
      mood: getMascotMood(health, countOverbudget(snapshots)),
      dailyLimit: calculateDailySafeToSpend(snapshots, balance, daysLeft),
    };
  }, [budgetState, debts, hero.streakDays, balance, daysLeft, healthOverride]);

  const rawSpriteId = user.avatar_sprite_id ?? 'cuan_tiger_default';
  const variant: StarterMascotId = isStarterId(rawSpriteId) ? rawSpriteId : 'cuan_tiger_default';
  const avatarEmoji = STARTER_MASCOTS.find((m) => m.id === variant)?.emoji ?? '🐯';

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleMascotTap = useCallback(() => sfx.tap(), []);

  const handleFabToggle = useCallback((open: boolean) => {
    if (open) sfx.open();
  }, []);

  const handleFabSelect = useCallback((action: QuickAction) => {
    sfx.select();
    if (action === 'scan') {
      setModal({ kind: 'scan' });
    } else {
      setModal({
        kind: 'transaction',
        type: action,
        prefill: null,
      });
    }
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const handleScanParsed = useCallback((prefill: TransactionPrefill) => {
    setModal({ kind: 'transaction', type: prefill.type ?? 'expense', prefill });
  }, []);

  const handleSaved = useCallback((result: SaveResult) => {
    setModal(null);
    setHero(result.context.hero);
    setBalance(result.context.totalBalance);
    setBudgetState(result.context.budgets);

    setReward({
      id: result.record.id,
      exp: result.rewards.exp,
      gold: result.rewards.gold,
      comboMultiplier: result.rewards.comboMultiplier,
      scanBonus: result.rewards.scanBonus,
      levelUp:
        result.levelsGained > 0
          ? { newLevel: result.context.hero.level, bonusGold: result.levelUpBonusGold }
          : null,
      lootEmoji: result.loot.emoji,
      lootName: result.loot.name,
    });

    if (result.levelsGained > 0) sfx.levelUp();
    else sfx.coin();
  }, []);

  const handleRewardDone = useCallback(() => setReward(null), []);

  const handleRefreshFromHistory = useCallback(() => {
    const freshBal = Number(localStorage.getItem('cuanverse_balance') || '1500000');
    setBalance(freshBal);
    const savedBudgetsRaw = localStorage.getItem('cuanverse_budgets');
    if (savedBudgetsRaw) {
      try {
        setBudgetState(JSON.parse(savedBudgetsRaw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleResetMonth = useCallback(() => {
    // 1. Reset pengeluaran anggaran ke 0
    const resetBudgets = budgetState.map((b) => ({ ...b, spent: 0 }));
    setBudgetState(resetBudgets);
    localStorage.setItem('cuanverse_budgets', JSON.stringify(resetBudgets));

    // 2. Kosongkan riwayat transaksi bulanan
    localStorage.setItem('cuanverse_transactions', JSON.stringify([]));

    sfx.levelUp();
    setToast('⚔️ Season Baru Dimulai! Pengeluaran di-reset ke 0.');
  }, [budgetState]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <PixelWorldCanvas weather={weather} quests={quests} />
      </div>

      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col gap-3 p-3 pb-56 sm:p-5">
        <div className="pointer-events-auto">
          <TopHud
            username={user?.username ?? 'Ksatria Cuan'}
            avatarEmoji={avatarEmoji}
            level={hero.level}
            currentExp={hero.currentExp}
            nextLevelExp={hero.nextLevelExp}
            goldCoins={hero.goldCoins}
            healthScore={healthScore}
            weather={weather}
            onOpenStats={() => setShowStats(true)}
            onOpenBoss={() => setShowBoss(true)}
          />
        </div>

        <div className="pointer-events-auto grid grid-cols-2 gap-3 md:w-80 md:grid-cols-1">
          <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-1">
            <div className="flex-1">
              <BalanceCard totalBalance={balance} />
            </div>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-white/30 bg-black/40 px-3.5 py-3 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 active:scale-95"
            >
              <span className="text-xl">📜</span>
              <span>Riwayat</span>
            </button>
          </div>
          <SafeToSpendCard dailyLimit={dailyLimit} daysLeft={daysLeft} />
          <BudgetHpCard budgets={budgetState} className="col-span-2 md:col-span-1" />
        </div>
      </div>

      <div className="fixed right-3 bottom-4 z-20 sm:right-6">
        <PixelMascot mood={mood} healthScore={healthScore} onTap={handleMascotTap} variant={variant} />
      </div>

      <QuickActionFab
        onSelect={handleFabSelect}
        onToggle={handleFabToggle}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2"
      />

      <TransactionModal
        open={modal?.kind === 'transaction'}
        initialType={modal?.kind === 'transaction' ? modal.type : 'expense'}
        prefill={modal?.kind === 'transaction' ? modal.prefill : null}
        context={context}
        onClose={closeModal}
        onSaved={handleSaved}
      />

      <ReceiptScanModal open={modal?.kind === 'scan'} onClose={closeModal} onParsed={handleScanParsed} />

      <TransactionHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onRefreshDashboard={handleRefreshFromHistory}
      />

      <DebtBossModal
        open={showBoss}
        onClose={() => setShowBoss(false)}
        onBossDefeated={() => setToast('🎉 Selamat! Bos Hutang berhasil dikalahkan!')}
      />

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        totalBalance={balance}
        healthScore={healthScore}
        streakDays={hero.streakDays}
        dailyLimit={dailyLimit}
        onResetMonth={handleResetMonth}
      />

      <RewardPop reward={reward} onDone={handleRewardDone} />

      {toast ? (
        <p
          role="status"
          className="fixed bottom-28 left-1/2 z-30 w-[min(90vw,24rem)] -translate-x-1/2 rounded-xl border border-white/30 bg-black/60 px-4 py-3 text-center text-sm text-white backdrop-blur-xl"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}