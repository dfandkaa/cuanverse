'use client';

import { useEffect, useState } from 'react';
import DashboardView, { type DashboardUser } from '@/components/dashboard/DashboardView';
import type { BudgetView } from '@/components/dashboard/GlassCards';
import type { DebtSnapshot } from '@/lib/game/mechanics';
import type { QuestBuilding } from '@/components/dashboard/PixelWorldCanvas';
import { getJakartaMonthProgress } from '@/lib/game/mechanics';
import { STARTER_MASCOTS } from '@/lib/game/starters';

export default function RootPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Form State Onboarding
  const [username, setUsername] = useState('');
  const [selectedMascot, setSelectedMascot] = useState('cuan_tiger_default');

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<{
    profile: DashboardUser;
    totalBalance: number;
    budgets: BudgetView[];
    debts: DebtSnapshot[];
    quests: QuestBuilding[];
    daysLeft: number;
    healthOverride: number | null;
  } | null>(null);

  const loadState = () => {
    const progress = getJakartaMonthProgress();
    const onboardedFlag = localStorage.getItem('cuanverse_onboarded') === 'true';
    const savedHeroRaw = localStorage.getItem('cuanverse_hero');

    // Jika belum pernah onboarding dan belum ada hero
    if (!onboardedFlag && !savedHeroRaw) {
      setIsOnboarded(false);
      setIsLoaded(true);
      return;
    }

    let localHero: any = { name: 'Ksatria Cuan', mascot: 'cuan_tiger_default', level: 1, exp: 0 };
    if (savedHeroRaw) {
      try {
        localHero = JSON.parse(savedHeroRaw);
      } catch (e) {
        console.error('Gagal parse hero local', e);
      }
    }

    const savedBalanceRaw = localStorage.getItem('cuanverse_balance');
    const totalBalance = savedBalanceRaw ? Number(savedBalanceRaw) : 1500000;

    const savedBudgetsRaw = localStorage.getItem('cuanverse_budgets');
    let budgets: BudgetView[] = [];
    if (savedBudgetsRaw) {
      try {
        budgets = JSON.parse(savedBudgetsRaw);
      } catch (e) {
        console.error('Gagal parse budget local', e);
      }
    }

    if (budgets.length === 0) {
      budgets = [
        { id: '1', label: 'Makanan & Minuman', limit: 1000000, spent: 0 },
        { id: '2', label: 'Hiburan', limit: 500000, spent: 0 },
      ];
      localStorage.setItem('cuanverse_budgets', JSON.stringify(budgets));
    }

    const profile: DashboardUser = {
      username: localHero.name || 'Ksatria Cuan',
      avatar_sprite_id: localHero.mascot || 'cuan_tiger_default',
      level: Number(localHero.level || 1),
      current_exp: Number(localHero.exp || 0),
      next_level_exp: 1000,
      gold_coins: Number(localHero.gold || 150),
      streak_days: 1,
    };

    setDashboardData({
      profile,
      totalBalance,
      budgets,
      debts: [],
      quests: [],
      daysLeft: progress.daysLeft,
      healthOverride: null,
    });

    setIsOnboarded(true);
    setIsLoaded(true);
  };

  useEffect(() => {
    loadState();
  }, []);

  const handleCompleteOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = username.trim() || 'Ksatria Cuan';

    const heroData = {
      name: finalName,
      mascot: selectedMascot,
      level: 1,
      exp: 0,
      gold: 150,
    };

    const defaultBudgets = [
      { id: '1', label: 'Makanan & Minuman', limit: 1000000, spent: 0 },
      { id: '2', label: 'Hiburan', limit: 500000, spent: 0 },
    ];

    // Tulis ke localStorage secara permanen
    localStorage.setItem('cuanverse_onboarded', 'true');
    localStorage.setItem('cuanverse_hero', JSON.stringify(heroData));
    localStorage.setItem('cuanverse_balance', '1500000');
    localStorage.setItem('cuanverse_budgets', JSON.stringify(defaultBudgets));
    localStorage.setItem('cuanverse_transactions', JSON.stringify([]));

    // Muat ulang state komponen tanpa reload halaman
    loadState();
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400">
        <p className="animate-pulse text-xl font-bold">⚔️ Memuat Kerajaan Cuanverse...</p>
      </div>
    );
  }

  // 1. TAMPILAN ONBOARDING (Jika pengguna pertama kali buka aplikasi)
  if (!isOnboarded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-white">
        <div className="w-full max-w-md space-y-6 rounded-3xl border-2 border-amber-400/40 bg-slate-900/90 p-6 text-center shadow-2xl backdrop-blur-md">
          <div className="space-y-2">
            <span className="text-5xl">👑</span>
            <h1 className="text-2xl font-black text-amber-300">Selamat Datang di Cuanverse!</h1>
            <p className="text-xs text-slate-400">Buat karakter RPG keuanganmu untuk memulai petualangan.</p>
          </div>

          <form onSubmit={handleCompleteOnboarding} className="space-y-5 text-left">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-amber-200">Nama Ksatria</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan nama karaktermu..."
                className="w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3 text-sm font-bold text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-amber-200">Pilih Maskot Pendamping</label>
              <div className="grid grid-cols-2 gap-2">
                {STARTER_MASCOTS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMascot(m.id)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                      selectedMascot === m.id
                        ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                        : 'border-white/10 bg-black/30 text-white/60'
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-xs font-bold">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-500 py-3.5 text-sm font-black text-slate-950 shadow-lg transition active:scale-95"
            >
              🚀 Mulai Petualangan Kerajaan!
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. TAMPILAN DASHBOARD (Jika data sudah tersimpan di localStorage)
  return (
    <DashboardView
      user={dashboardData!.profile}
      totalBalance={dashboardData!.totalBalance}
      budgets={dashboardData!.budgets}
      debts={dashboardData!.debts}
      quests={dashboardData!.quests}
      daysLeft={dashboardData!.daysLeft}
      healthOverride={dashboardData!.healthOverride}
    />
  );
}