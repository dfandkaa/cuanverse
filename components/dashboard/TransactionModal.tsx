'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ModalShell from '../ui/ModalShell';
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MAX_AMOUNT,
  calculateRewards,
  getContextHealth,
  getProjectedStreak,
  previewTransaction,
  saveTransaction,
  type CategoryKey,
  type GameContext,
  type SaveResult,
  type TransactionKind,
  type TransactionPrefill,
  type WalletKind,
} from '../../lib/transactions';

export interface TransactionModalProps {
  open: boolean;
  initialType?: TransactionKind;
  context: GameContext;
  prefill?: TransactionPrefill | null;
  onClose: () => void;
  onSaved: (result: SaveResult) => void;
}

const MAX_DIGITS = String(MAX_AMOUNT).length;
const QUICK_AMOUNTS = [10_000, 50_000, 100_000] as const;

const digitsOnly = (value: string): string => value.replace(/\D/g, '').slice(0, MAX_DIGITS);
const formatDigits = (digits: string): string =>
  digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '';
const formatIdr = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

const CARD_STYLES: Record<CategoryKey, { face: string; edge: string }> = {
  food: { face: 'bg-gradient-to-b from-orange-300 to-orange-500', edge: 'shadow-[0_6px_0_0_#9a3412]' },
  transport: { face: 'bg-gradient-to-b from-sky-300 to-blue-500', edge: 'shadow-[0_6px_0_0_#1e3a8a]' },
  shopping: { face: 'bg-gradient-to-b from-pink-300 to-pink-500', edge: 'shadow-[0_6px_0_0_#9d174d]' },
  bills: { face: 'bg-gradient-to-b from-yellow-200 to-amber-400', edge: 'shadow-[0_6px_0_0_#92400e]' },
  fun: { face: 'bg-gradient-to-b from-violet-300 to-purple-500', edge: 'shadow-[0_6px_0_0_#581c87]' },
  salary: { face: 'bg-gradient-to-b from-emerald-300 to-green-500', edge: 'shadow-[0_6px_0_0_#14532d]' },
  bonus: { face: 'bg-gradient-to-b from-fuchsia-300 to-rose-500', edge: 'shadow-[0_6px_0_0_#881337]' },
};

function hpColor(hp: number): string {
  if (hp >= 80) return 'bg-gradient-to-r from-emerald-300 to-green-500';
  if (hp >= 50) return 'bg-gradient-to-r from-amber-300 to-yellow-500';
  if (hp >= 20) return 'bg-gradient-to-r from-orange-300 to-orange-500';
  return 'bg-gradient-to-r from-red-400 to-red-600';
}

interface HealthImpactProps {
  baseline: number;
  after: number;
  message: string;
  tone: 'safe' | 'warn' | 'danger' | 'info';
}

const TONE_TEXT: Record<HealthImpactProps['tone'], string> = {
  safe: 'text-emerald-200',
  warn: 'text-amber-200',
  danger: 'text-red-200',
  info: 'text-white/75',
};

function HealthImpact({ baseline, after, message, tone }: HealthImpactProps) {
  const reduceMotion = useReducedMotion();
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 180, damping: 22 };

  return (
    <div className="rounded-2xl border border-white/20 bg-black/25 p-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-white/85">❤️ HP Kerajaan</span>
        <span className="tabular-nums text-white/80">
          {baseline !== after ? `${baseline} → ${after}` : after} / 100
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="HP Kerajaan setelah transaksi"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={after}
        className="relative h-4 overflow-hidden rounded-md border border-white/25 bg-black/40"
      >
        <motion.div
          className="absolute inset-y-0 left-0 bg-red-500/70"
          initial={false}
          animate={{ width: `${baseline}%` }}
          transition={spring}
        />
        <motion.div
          className={`absolute inset-y-0 left-0 ${hpColor(after)}`}
          initial={false}
          animate={{ width: `${after}%` }}
          transition={spring}
        />
      </div>
      <p role="status" aria-live="polite" className={`mt-2 text-sm font-medium ${TONE_TEXT[tone]}`}>
        {message}
      </p>
    </div>
  );
}

export default function TransactionModal({
  open,
  initialType = 'expense',
  context,
  prefill = null,
  onClose,
  onSaved,
}: TransactionModalProps) {
  const reduceMotion = useReducedMotion();

  const [type, setType] = useState<TransactionKind>(initialType);
  const [categoryKey, setCategoryKey] = useState<CategoryKey | null>(null);
  const [amountDigits, setAmountDigits] = useState('');
  const [note, setNote] = useState('');
  const [wallet, setWallet] = useState<WalletKind>('cash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = prefill?.source ?? 'manual';

  useEffect(() => {
    if (!open) return;
    setType(prefill?.type ?? initialType);
    setCategoryKey(prefill?.categoryKey ?? null);
    setAmountDigits(prefill?.amount ? String(Math.round(prefill.amount)) : '');
    setNote(prefill?.merchant ?? '');
    setWallet('cash');
    setSaving(false);
    setError(null);
  }, [open, initialType, prefill]);

  const amount = amountDigits ? Number(amountDigits) : 0;
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const outcome = useMemo(
    () =>
      amount > 0 && categoryKey
        ? previewTransaction(context, { type, amount, categoryKey, source, wallet, merchant: note })
        : null,
    [amount, categoryKey, context, note, source, type, wallet]
  );

  const rewards = useMemo(
    () => calculateRewards(source, getProjectedStreak(context.hero)),
    [context.hero, source]
  );

  const currentHealth = getContextHealth(context);
  const canSave = amount > 0 && categoryKey !== null && !saving;

  function health(): HealthImpactProps {
    if (type === 'income') {
      return {
        baseline: currentHealth,
        after: outcome?.healthAfter ?? currentHealth,
        tone: 'safe',
        message: amount > 0
          ? `Pemasukan memperkuat kerajaan. Saldo jadi ${formatIdr(context.totalBalance + amount)}.`
          : 'Masukkan nominal untuk melihat dampaknya.',
      };
    }
    if (!outcome) {
      return {
        baseline: currentHealth,
        after: currentHealth,
        tone: 'info',
        message: 'Pilih kategori dan masukkan nominal untuk melihat dampaknya.',
      };
    }
    const after = outcome.healthAfter;
    const baseline = after + outcome.spendingHealthLoss;
    if (!outcome.hasBudget) {
      return { baseline, after, tone: 'info', message: 'Belum ada anggaran aktif, jadi HP Kerajaan tidak berubah.' };
    }
    if (outcome.overBudgetBy > 0) {
      return {
        baseline,
        after,
        tone: 'danger',
        message: `Awas! Anggaran bulan ini jebol ${formatIdr(outcome.overBudgetBy)} dan mengikis ${outcome.spendingHealthLoss}% HP Kerajaan!`,
      };
    }
    if (outcome.spendingHealthLoss > 0) {
      return {
        baseline,
        after,
        tone: 'warn',
        message: `Peringatan: Transaksi ini akan mengikis ${outcome.spendingHealthLoss}% HP Kerajaan!`,
      };
    }
    return { baseline, after, tone: 'safe', message: 'Aman! Transaksi ini belum mengikis HP Kerajaan.' };
  }

  const impact = health();
  const lowBalance = type === 'expense' && amount > Math.max(0, context.totalBalance);

  function switchType(next: TransactionKind) {
    if (next === type) return;
    setType(next);
    setCategoryKey(null);
    setError(null);
  }

  async function handleSave() {
    if (!categoryKey || amount <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveTransaction(
        { type, amount, categoryKey, source, wallet, merchant: note },
        context
      );
      onSaved(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan transaksi. Coba lagi.');
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Catat Transaksi" icon={source === 'scan' ? '🧾' : '📜'}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        noValidate
        className="space-y-5"
      >
        {source === 'scan' && (
          <p className="rounded-xl border border-cyan-300/50 bg-cyan-400/15 px-3 py-2 text-sm text-cyan-100">
            🧾 Hasil scan struk sudah terisi. Periksa lagi, lalu simpan untuk bonus 2x Gold!
          </p>
        )}

        <div role="tablist" aria-label="Jenis transaksi" className="grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1.5">
          {(
            [
              { id: 'expense', label: '⚔️ Pengeluaran', active: 'from-rose-400 to-red-600 shadow-[0_4px_0_0_#7f1d1d]' },
              { id: 'income', label: '🪙 Pemasukan', active: 'from-amber-300 to-yellow-500 shadow-[0_4px_0_0_#854d0e]' },
            ] as const
          ).map((tab) => {
            const selected = type === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => switchType(tab.id)}
                className={`relative rounded-xl px-3 py-2.5 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                  selected ? 'text-slate-900' : 'text-white/70 hover:text-white'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="tx-tab-highlight"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-b ${tab.active}`}
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <p id="tx-category-label" className="mb-2 text-sm font-medium text-white/85">
            Pilih kategori
          </p>
          <div role="radiogroup" aria-labelledby="tx-category-label" className="grid grid-cols-3 gap-3 pb-2">
            {categories.map((key) => {
              const meta = CATEGORY_META[key];
              const style = CARD_STYLES[key];
              const selected = categoryKey === key;
              return (
                <motion.button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCategoryKey(key)}
                  animate={selected ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
                  whileTap={{ scale: 0.92, y: 3 }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 11 }}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-slate-900 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${style.face} ${style.edge} ${
                    selected ? 'border-white ring-4 ring-white/60' : 'border-white/40 opacity-90'
                  }`}
                >
                  <motion.span
                    aria-hidden
                    className="text-3xl"
                    animate={
                      selected && !reduceMotion
                        ? { rotate: [0, -16, 16, -8, 0], scale: [1, 1.35, 1] }
                        : { rotate: 0, scale: 1 }
                    }
                    transition={{ duration: 0.5 }}
                  >
                    {meta.emoji}
                  </motion.span>
                  <span className="text-xs font-extrabold">{meta.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="tx-amount" className="mb-1.5 block text-sm font-medium text-white/85">
            Nominal
          </label>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-white/25 bg-black/30 px-4 py-3 focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-300/40">
            <span className="text-sm font-bold text-amber-300">Rp</span>
            <input
              id="tx-amount"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={formatDigits(amountDigits)}
              placeholder="0"
              onChange={(event) => setAmountDigits(digitsOnly(event.target.value))}
              className="w-full bg-transparent text-2xl font-extrabold text-white placeholder:text-white/25 focus:outline-none"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setAmountDigits(digitsOnly(String(Math.min(MAX_AMOUNT, amount + quick))))}
                className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/85 transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                +{quick / 1000}rb
              </button>
            ))}
          </div>
          {lowBalance && (
            <p className="mt-2 text-xs text-amber-200">Nominal ini lebih besar dari total saldo kamu saat ini.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="tx-note" className="mb-1.5 block text-sm font-medium text-white/85">
              {source === 'scan' ? 'Nama toko' : 'Catatan (opsional)'}
            </label>
            <input
              id="tx-note"
              value={note}
              maxLength={80}
              onChange={(event) => setNote(event.target.value)}
              placeholder={source === 'scan' ? 'Nama merchant' : 'Contoh: makan siang'}
              className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/40 focus:outline-none"
            />
          </div>
          <div>
            <p id="tx-wallet-label" className="mb-1.5 text-sm font-medium text-white/85">
              Dompet
            </p>
            <div role="radiogroup" aria-labelledby="tx-wallet-label" className="flex gap-1.5 rounded-2xl bg-black/30 p-1">
              {(
                [
                  { id: 'cash', label: '💵 Tunai' },
                  { id: 'bank', label: '🏦 Bank' },
                ] as const
              ).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="radio"
                  aria-checked={wallet === w.id}
                  onClick={() => setWallet(w.id)}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                    wallet === w.id ? 'bg-white/90 text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <HealthImpact {...impact} />

        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${rewards.exp}-${rewards.gold}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -4, 0] }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { scale: { type: 'spring', stiffness: 500, damping: 12 }, y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' } }
              }
              className="rounded-full border-2 border-amber-200/70 bg-gradient-to-r from-amber-400/30 to-orange-400/30 px-4 py-1.5 text-sm font-extrabold text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.35)]"
            >
              🎁 Estimasi Loot: +{rewards.exp} EXP | +{rewards.gold} Gold Coins
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
            {rewards.comboMultiplier > 1 && (
              <span className="rounded-full bg-fuchsia-500/30 px-2.5 py-1 text-fuchsia-100">
                🔥 Combo streak x{rewards.comboMultiplier}
              </span>
            )}
            {rewards.scanBonus && (
              <span className="rounded-full bg-cyan-500/30 px-2.5 py-1 text-cyan-100">🧾 Receipt Collector: 2x Gold</span>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={!canSave}
          whileTap={canSave ? { scale: 0.96, y: 3 } : undefined}
          className={`w-full rounded-2xl border-2 border-white/50 px-5 py-3.5 text-lg font-black text-slate-900 transition focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 ${
            type === 'expense'
              ? 'bg-gradient-to-b from-rose-300 to-red-500 shadow-[0_6px_0_0_#7f1d1d]'
              : 'bg-gradient-to-b from-amber-200 to-yellow-500 shadow-[0_6px_0_0_#854d0e]'
          }`}
        >
          {saving ? 'Menyimpan…' : type === 'expense' ? '⚔️ Simpan & Ambil Loot!' : '🪙 Simpan & Ambil Loot!'}
        </motion.button>
      </form>
    </ModalShell>
  );
}