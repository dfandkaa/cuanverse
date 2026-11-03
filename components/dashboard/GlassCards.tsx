'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatIdr } from '@/lib/utils/format';
import { getBudgetHp } from '@/lib/game/mechanics';

function GlassCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-white/25 bg-white/10 p-4 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl ${className}`}
    >
      <h2 className="text-sm font-medium text-white/75">{title}</h2>
      {children}
    </section>
  );
}

export function BalanceCard({ totalBalance, className }: { totalBalance: number; className?: string }) {
  return (
    <GlassCard title="Total saldo" className={className}>
      <p className="mt-1 text-2xl font-bold tabular-nums text-amber-200">{formatIdr(totalBalance)}</p>
      <p className="mt-1 text-xs text-white/60">Semua wallet digabung</p>
    </GlassCard>
  );
}

export function SafeToSpendCard({ dailyLimit, daysLeft, className }: { dailyLimit: number; daysLeft: number; className?: string }) {
  return (
    <GlassCard title="Aman dibelanjakan per hari" className={className}>
      <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-200">{formatIdr(dailyLimit)}</p>
      <p className="mt-1 text-xs text-white/60">Untuk {daysLeft} hari tersisa bulan ini</p>
    </GlassCard>
  );
}

export interface BudgetView {
  id: string;
  label: string;
  limit: number;
  spent: number;
}

function hpTone(hp: number): string {
  if (hp > 60) return 'from-emerald-300 to-green-500';
  if (hp > 30) return 'from-amber-300 to-yellow-500';
  return 'from-red-400 to-red-600';
}

export function BudgetHpCard({ budgets, className }: { budgets: readonly BudgetView[]; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <GlassCard title="HP anggaran bulan ini" className={className}>
      {budgets.length === 0 ? (
        <p className="mt-2 text-sm text-white/70">Belum ada anggaran. Buat satu untuk mulai melawan pengeluaran.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {budgets.map((b) => {
            const hp = getBudgetHp({ monthly_limit: b.limit, current_spent: b.spent });
            const over = b.spent > b.limit;
            return (
              <li key={b.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-white/90">{b.label}</span>
                  <span className={over ? 'font-semibold text-red-200' : 'text-white/70'}>
                    {over ? `Lewat ${formatIdr(b.spent - b.limit)}` : `${formatIdr(b.limit - b.spent)} tersisa`}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`HP anggaran ${b.label}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={hp}
                  className="h-3.5 overflow-hidden rounded-md border border-white/25 bg-black/35"
                >
                  <motion.div
                    className={`h-full bg-gradient-to-r ${hpTone(hp)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${hp}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut' }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
