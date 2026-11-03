'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardView, { type DashboardUser } from '../../components/dashboard/DashboardView';
import type { BudgetView } from '../../components/dashboard/GlassCards';
import type { DebtSnapshot } from '../../lib/game/mechanics';
import type { QuestBuilding } from '../../components/dashboard/PixelWorldCanvas';
import { clamp, getJakartaMonthProgress } from '../../lib/game/mechanics';
import { createClient } from '../../lib/supabase/client';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    profile: DashboardUser;
    totalBalance: number;
    budgets: BudgetView[];
    debts: DebtSnapshot[];
    quests: QuestBuilding[];
    daysLeft: number;
    healthOverride: number | null;
  } | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const progress = getJakartaMonthProgress();

      const savedHeroRaw = localStorage.getItem('cuanverse_hero');
      let localHero: any = null;
      if (savedHeroRaw) {
        try {
          localHero = JSON.parse(savedHeroRaw);
        } catch (e) {
          console.error('Gagal membaca data lokal hero', e);
        }
      }

      let supabaseProfile: any = null;
      let totalBalance = localHero?.initialBalance || 1500000;
      let budgets: BudgetView[] = [];
      let debts: DebtSnapshot[] = [];
      let quests: QuestBuilding[] = [];

      try {
        const supabase = createClient() as any;
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (user) {
          const [profileRes, walletsRes, budgetsRes, categoriesRes, debtsRes, questsRes] = await Promise.all([
            supabase
              .from('users')
              .select('username, avatar_sprite_id, level, current_exp, next_level_exp, gold_coins, streak_days')
              .eq('id', user.id)
              .maybeSingle(),
            supabase.from('wallets').select('balance').eq('user_id', user.id),
            supabase
              .from('budgets')
              .select('id, category_id, monthly_limit, current_spent')
              .eq('user_id', user.id)
              .eq('month', progress.month)
              .eq('year', progress.year),
            supabase.from('categories').select('id, name').eq('user_id', user.id),
            supabase.from('debt_bosses').select('is_defeated, interest_rate_percent').eq('user_id', user.id),
            supabase
              .from('savings_quests')
              .select('id, building_unlock_id, is_completed')
              .eq('user_id', user.id)
              .order('id'),
          ]);

          if (profileRes.data) supabaseProfile = profileRes.data;
          if (walletsRes.data && walletsRes.data.length > 0) {
            totalBalance = walletsRes.data.reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0);
          }

          const categoryNames = new Map<string, string>(
            (categoriesRes.data ?? []).map((c: any) => [String(c.id), String(c.name)])
          );

          budgets = (budgetsRes.data ?? []).map((b: any) => ({
            id: String(b.id),
            label: (b.category_id ? categoryNames.get(String(b.category_id)) : undefined) ?? 'Umum',
            limit: Number(b.monthly_limit || 0),
            spent: Number(b.current_spent || 0),
          }));

          debts = (debtsRes.data ?? []).map((d: any) => ({
            is_defeated: Boolean(d.is_defeated),
            interest_rate_percent: Number(d.interest_rate_percent || 0),
          }));

          quests = (questsRes.data ?? []).map((q: any) => ({
            id: String(q.id),
            building_unlock_id: String(q.building_unlock_id || 'castle'),
            is_completed: Boolean(q.is_completed),
          }));
        }
      } catch (err) {
        console.warn('Mode offline / Supabase tidak terhubung:', err);
      }

      if (!supabaseProfile && !localHero) {
        router.push('/onboarding');
        return;
      }

      const profile: DashboardUser = {
        username: supabaseProfile?.username || localHero?.name || 'Ksatria Cuan',
        avatar_sprite_id: supabaseProfile?.avatar_sprite_id || localHero?.mascot || 'cuan_tiger_default',
        level: Number(supabaseProfile?.level ?? localHero?.level ?? 1),
        current_exp: Number(supabaseProfile?.current_exp ?? localHero?.exp ?? 0),
        next_level_exp: Number(supabaseProfile?.next_level_exp ?? 1000),
        gold_coins: Number(supabaseProfile?.gold_coins ?? 150),
        streak_days: Number(supabaseProfile?.streak_days ?? 1),
      };

      if (budgets.length === 0) {
        budgets = [
          { id: '1', label: 'Makanan & Minuman', limit: 1000000, spent: 350000 },
          { id: '2', label: 'Hiburan', limit: 500000, spent: 120000 },
        ];
      }

      const rawHealth = searchParams.get('health');
      const parsedHealth = rawHealth ? Number(rawHealth) : Number.NaN;
      const healthOverride = Number.isFinite(parsedHealth) ? clamp(parsedHealth, 0, 100) : null;

      setDashboardData({
        profile,
        totalBalance,
        budgets,
        debts,
        quests,
        daysLeft: progress.daysLeft,
        healthOverride,
      });

      setIsLoading(false);
    }

    loadDashboard();
  }, [router, searchParams]);

  if (isLoading || !dashboardData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400">
        <div className="text-center">
          <p className="animate-pulse text-xl font-bold mb-2">⚔️ Memuat Kerajaan Cuanverse...</p>
          <p className="text-slate-500 text-sm">Menyiapkan peta & statistik keuanganmu</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      user={dashboardData.profile}
      totalBalance={dashboardData.totalBalance}
      budgets={dashboardData.budgets}
      debts={dashboardData.debts}
      quests={dashboardData.quests}
      daysLeft={dashboardData.daysLeft}
      healthOverride={dashboardData.healthOverride}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400">
          <p className="animate-pulse text-xl font-bold">⚔️ Memuat Cuanverse...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}