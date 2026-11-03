'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createClient } from '../../lib/supabase/client';
import { STARTER_MASCOTS } from '../../lib/game/starters';
import type { StarterMascotId } from '../../types/game';

const STEPS = [
  { title: 'Pilih maskot pendampingmu', subtitle: 'Dia akan menemanimu menjaga kerajaan keuangan.' },
  { title: 'Tetapkan target bulan ini', subtitle: 'Berapa yang ingin kamu tabung, dan berapa batas belanjamu?' },
  { title: 'Isi peti harta pertamamu', subtitle: 'Masukkan saldo awal tunai dan rekening bank.' },
] as const;

const MAX_DIGITS = 12; // fits DECIMAL(15, 2)
const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, MAX_DIGITS);
const formatDigits = (digits: string) =>
  digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '';
const toNumber = (digits: string) => (digits ? Number(digits) : 0);
const formatRupiah = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

interface MoneyFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
}

function MoneyField({ id, label, hint, value, onChange, placeholder = '0' }: MoneyFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/85">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 transition focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-300/40">
        <span className="text-sm font-semibold text-amber-300">Rp</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={formatDigits(value)}
          placeholder={placeholder}
          onChange={(e) => onChange(digitsOnly(e.target.value))}
          className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>
      {hint ? <p className="mt-1.5 text-xs text-white/60">{hint}</p> : null}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const reduceMotion = useReducedMotion();

  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [heroName, setHeroName] = useState('');
  const [mascotId, setMascotId] = useState<StarterMascotId | null>(null);
  const [savingsTarget, setSavingsTarget] = useState('');
  const [spendingBudget, setSpendingBudget] = useState('');
  const [cashBalance, setCashBalance] = useState('');
  const [bankBalance, setBankBalance] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Fallback timer 1 detik agar TIDAK PERNAH STUCK di layar loading
    const timer = setTimeout(() => {
      if (active) {
        setHeroName((current) => current || 'Ksatria Cuan');
        setAuthChecked(true);
      }
    }, 1000);

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      clearTimeout(timer);
      if (data?.user) {
        const emailName = data.user.email?.split('@')[0] ?? '';
        setHeroName((current) => current || emailName.slice(0, 50));
      } else {
        setHeroName((current) => current || 'Ksatria Cuan');
      }
      setAuthChecked(true);
    }).catch(() => {
      if (!active) return;
      clearTimeout(timer);
      setHeroName((current) => current || 'Ksatria Cuan');
      setAuthChecked(true);
    });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [supabase]);

  const selectedMascot = STARTER_MASCOTS.find((m) => m.id === mascotId) ?? null;
  const isLast = step === STEPS.length - 1;

  const canContinue = Boolean(
    [
      heroName.trim().length >= 2 && mascotId !== null,
      toNumber(savingsTarget) > 0 && toNumber(spendingBudget) > 0,
      true,
    ][step]
  );

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setError(null);
    setStep(next);
  };

async function submit() {
    if (!mascotId) return;
    setSubmitting(true);
    setError(null);

    const totalInitBalance = toNumber(cashBalance) + toNumber(bankBalance);

    const heroData = {
      name: heroName.trim(),
      mascot: mascotId,
      monthlySavingsTarget: toNumber(savingsTarget),
      monthlySpendingBudget: toNumber(spendingBudget),
      cashBalance: toNumber(cashBalance),
      bankBalance: toNumber(bankBalance),
      initialBalance: totalInitBalance > 0 ? totalInitBalance : 1500000,
      level: 1,
      exp: 0,
      kingdomHealth: 100,
    };

    localStorage.setItem('cuanverse_hero', JSON.stringify(heroData));

    try {
      await (supabase.rpc as any)('complete_onboarding', {
        p_username: heroName.trim(),
        p_avatar_sprite_id: mascotId as string,
        p_monthly_savings_target: toNumber(savingsTarget),
        p_monthly_spending_budget: toNumber(spendingBudget),
        p_cash_balance: toNumber(cashBalance),
        p_bank_balance: toNumber(bankBalance),
      });
    } catch (err) {
      console.warn('Mode offline / Supabase RPC tidak terisi:', err);
    }

    setSubmitting(false);
    router.replace('/dashboard');
    router.refresh();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canContinue || submitting) return;
    if (isLast) void submit();
    else goTo(step + 1);
  }

  const slide = reduceMotion ? 0 : 48;
  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * slide }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -slide }),
  };

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-indigo-950 text-white/70">
        <p role="status">Menyiapkan petualanganmu…</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-950 px-4 py-10">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-amber-400/25 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <section className="relative w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-10">
        <ol className="mb-8 flex items-center gap-2" aria-label="Langkah onboarding">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                  initial={false}
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: reduceMotion ? 0 : 0.4 }}
                />
              </div>
              <span className="sr-only">
                Langkah {i + 1}: {s.title}
              </span>
            </li>
          ))}
        </ol>

        <header className="mb-6">
          <p className="text-sm text-white/60">
            Langkah {step + 1} dari {STEPS.length}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{STEPS[step].title}</h1>
          <p className="mt-1 text-white/70">{STEPS[step].subtitle}</p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="min-h-[22rem]">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
              >
                {step === 0 && (
                  <div className="space-y-6">
                    <div role="radiogroup" aria-label="Maskot starter" className="grid gap-3 sm:grid-cols-3">
                      {STARTER_MASCOTS.map((m) => {
                        const selected = m.id === mascotId;
                        const glowClass = (m as { glowClass?: string }).glowClass ?? '';
                        const ringClass = (m as { ringClass?: string }).ringClass ?? '';

                        return (
                          <motion.button
                            key={m.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setMascotId(m.id)}
                            whileHover={reduceMotion ? undefined : { y: -4 }}
                            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                            className={`relative flex flex-col items-center rounded-2xl border bg-gradient-to-b p-4 text-center text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${glowClass} ${
                              selected
                                ? `border-white/60 ring-2 ${ringClass}`
                                : 'border-white/15 hover:border-white/40'
                            }`}
                          >
                            <motion.span
                              aria-hidden
                              className="text-5xl"
                              animate={selected && !reduceMotion ? { y: [0, -6, 0] } : { y: 0 }}
                              transition={{ duration: 1.2, repeat: selected ? Infinity : 0 }}
                            >
                              {m.emoji}
                            </motion.span>
                            <span className="mt-3 font-semibold">{m.name}</span>
                            <span className="mt-1 text-xs text-white/70">{m.tagline}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    <p className="min-h-[3rem] text-sm text-white/75" aria-live="polite">
                      {selectedMascot
                        ? selectedMascot.description
                        : 'Pilih salah satu maskot untuk melihat gaya mainnya.'}
                    </p>

                    <div>
                      <label htmlFor="hero-name" className="mb-1.5 block text-sm font-medium text-white/85">
                        Nama pahlawan
                      </label>
                      <input
                        id="hero-name"
                        value={heroName}
                        maxLength={50}
                        autoComplete="nickname"
                        onChange={(e) => setHeroName(e.target.value)}
                        placeholder="Contoh: Budi si Penabung"
                        className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                      />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <MoneyField
                      id="savings-target"
                      label="Target tabungan bulan ini"
                      hint="Menjadi misi tabungan pertamamu dan membuka bangunan pertama di peta kerajaan."
                      value={savingsTarget}
                      onChange={setSavingsTarget}
                      placeholder="1.000.000"
                    />
                    <MoneyField
                      id="spending-budget"
                      label="Batas belanja bulan ini"
                      hint="Menjadi bar HP anggaran bulan ini. Makin banyak belanja, makin berkurang."
                      value={spendingBudget}
                      onChange={setSpendingBudget}
                      placeholder="3.000.000"
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <MoneyField
                      id="cash-balance"
                      label="Saldo tunai"
                      hint="Uang di dompet. Boleh dikosongkan."
                      value={cashBalance}
                      onChange={setCashBalance}
                    />
                    <MoneyField
                      id="bank-balance"
                      label="Saldo rekening bank"
                      hint="Total saldo rekening utamamu. Boleh dikosongkan."
                      value={bankBalance}
                      onChange={setBankBalance}
                    />

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-white/15 bg-black/20 p-4 text-sm">
                      <dt className="text-white/60">Pahlawan</dt>
                      <dd className="text-right font-medium text-white">
                        {selectedMascot?.emoji} {heroName.trim()}
                      </dd>
                      <dt className="text-white/60">Target tabungan</dt>
                      <dd className="text-right font-medium text-white">{formatRupiah(toNumber(savingsTarget))}</dd>
                      <dt className="text-white/60">Batas belanja</dt>
                      <dd className="text-right font-medium text-white">{formatRupiah(toNumber(spendingBudget))}</dd>
                      <dt className="text-white/60">Total saldo awal</dt>
                      <dd className="text-right font-medium text-amber-300">
                        {formatRupiah(toNumber(cashBalance) + toNumber(bankBalance))}
                      </dd>
                    </dl>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={step === 0 || submitting}
              className="rounded-xl border border-white/20 px-5 py-3 font-medium text-white/80 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:invisible"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={!canContinue || submitting}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 font-semibold text-indigo-950 shadow-lg shadow-orange-500/20 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Menyimpan…' : isLast ? 'Mulai petualangan' : 'Lanjut'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}