'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import ModalShell from '../ui/ModalShell';
import { mockReceiptOcr, type ParsedReceipt } from '../../lib/receiptOcr';
import { CATEGORY_META, type CategoryKey, type TransactionPrefill } from '../../lib/transactions';

export interface ReceiptScanModalProps {
  open: boolean;
  onClose: () => void;
  onParsed: (prefill: TransactionPrefill) => void;
}

type Stage = 'pick' | 'scanning' | 'done' | 'error';

const SCAN_STEPS = ['Memindai merchant...', 'Membaca nominal...', 'Mengenali kategori...'] as const;
const STEP_MS = 1100;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const formatIdr = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

const CORNERS = [
  'top-2 left-2 border-t-4 border-l-4',
  'top-2 right-2 border-t-4 border-r-4',
  'bottom-2 left-2 border-b-4 border-l-4',
  'bottom-2 right-2 border-b-4 border-r-4',
] as const;

export default function ReceiptScanModal({ open, onClose, onParsed }: ReceiptScanModalProps) {
  const reduceMotion = useReducedMotion();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<ParsedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStage('pick');
    setFile(null);
    setStepIndex(0);
    setResult(null);
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  useEffect(() => {
    if (stage !== 'scanning' || !file) return;
    let cancelled = false;

    setStepIndex(0);
    const timers = SCAN_STEPS.map((_, index) => window.setTimeout(() => setStepIndex(index), index * STEP_MS));

    Promise.all([mockReceiptOcr(file), sleep(SCAN_STEPS.length * STEP_MS + 300)])
      .then(([parsed]) => {
        if (cancelled) return;
        setResult(parsed);
        setStage('done');
      })
      .catch(() => {
        if (cancelled) return;
        setError('Struk tidak bisa dibaca. Coba foto lain yang lebih jelas.');
        setStage('error');
      });

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [stage, file]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;

    if (!picked.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, atau HEIC).');
      setStage('error');
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setError('Ukuran foto maksimal 10 MB.');
      setStage('error');
      return;
    }

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(picked);
    });
    setFile(picked);
    setResult(null);
    setError(null);
    setStage('scanning');
  }

  function confirm() {
    if (!result) return;
    onParsed({
      type: 'expense',
      amount: result.total,
      categoryKey: result.categoryKey as CategoryKey,
      merchant: result.merchant,
      source: 'scan',
    });
  }

  const meta = result && result.categoryKey in CATEGORY_META ? CATEGORY_META[result.categoryKey as CategoryKey] : null;

  return (
    <ModalShell open={open} onClose={onClose} title="Scan Struk" icon="🧾">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden />

      {stage === 'pick' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-cyan-300/60 bg-cyan-400/10 px-4 py-8 text-center">
            <motion.span
              aria-hidden
              className="text-6xl"
              animate={reduceMotion ? undefined : { y: [0, -10, 0], rotate: [0, -6, 6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🧾
            </motion.span>
            <p className="font-bold">Foto struk belanjamu</p>
            <p className="max-w-xs text-sm text-white/70">
              Catat lewat scan struk dan dapatkan <span className="font-bold text-amber-200">2x lipat Gold Coins</span>{' '}
              dibanding ketik manual.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="rounded-2xl border-2 border-white/50 bg-gradient-to-b from-cyan-300 to-sky-500 px-3 py-3 font-extrabold text-slate-900 shadow-[0_5px_0_0_#075985] transition active:translate-y-1 active:shadow-[0_1px_0_0_#075985] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none"
            >
              📸 Ambil Foto
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="rounded-2xl border-2 border-white/50 bg-gradient-to-b from-violet-300 to-purple-500 px-3 py-3 font-extrabold text-slate-900 shadow-[0_5px_0_0_#581c87] transition active:translate-y-1 active:shadow-[0_1px_0_0_#581c87] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none"
            >
              🖼️ Pilih Galeri
            </button>
          </div>
        </div>
      )}

      {(stage === 'scanning' || stage === 'done') && previewUrl && (
        <div className="space-y-4">
          <div className="relative mx-auto aspect-[3/4] max-h-[45vh] overflow-hidden rounded-2xl border-2 border-cyan-300/70 bg-black shadow-[0_0_30px_rgba(34,211,238,0.35)]">
            <img src={previewUrl} alt="Foto struk yang dipindai" className="h-full w-full object-contain" />

            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(34,211,238,0.14) 0px, rgba(34,211,238,0.14) 1px, transparent 1px, transparent 4px)',
              }}
            />

            {CORNERS.map((corner) => (
              <span key={corner} aria-hidden className={`pointer-events-none absolute h-7 w-7 border-cyan-300 ${corner}`} />
            ))}

            {stage === 'scanning' && (
              <>
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-20 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent"
                  initial={{ top: reduceMotion ? '50%' : '0%' }}
                  animate={{ top: reduceMotion ? '50%' : ['0%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-cyan-200 shadow-[0_0_16px_6px_rgba(34,211,238,0.9)]"
                  initial={{ top: reduceMotion ? '50%' : '0%' }}
                  animate={{ top: reduceMotion ? '50%' : ['0%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                />
              </>
            )}
          </div>

          {stage === 'scanning' && (
            <ul aria-label="Progres pemindaian" className="space-y-1.5 text-sm">
              {SCAN_STEPS.map((label, index) => {
                const finished = index < stepIndex;
                const active = index === stepIndex;
                return (
                  <li
                    key={label}
                    aria-current={active ? 'step' : undefined}
                    className={`flex items-center gap-2 font-mono ${
                      finished ? 'text-emerald-300' : active ? 'text-cyan-200' : 'text-white/35'
                    }`}
                  >
                    <span aria-hidden className="w-5 text-center">
                      {finished ? '✅' : active ? '⏳' : '▫️'}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
          )}

          {stage === 'done' && result && meta && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 18 }}
              className="space-y-3 rounded-2xl border-2 border-emerald-300/60 bg-emerald-400/10 p-4"
            >
              <p className="text-sm font-bold text-emerald-200">
                ✅ Struk terbaca ({Math.round(result.confidence * 100)}% yakin)
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-white/65">Toko</dt>
                <dd className="text-right font-bold">{result.merchant}</dd>
                <dt className="text-white/65">Kategori</dt>
                <dd className="text-right font-bold">
                  {meta.emoji} {meta.label}
                </dd>
                <dt className="text-white/65">Total</dt>
                <dd className="text-right text-lg font-black text-amber-200">{formatIdr(result.total)}</dd>
              </dl>
              <ul className="space-y-0.5 border-t border-white/15 pt-2 text-xs text-white/70">
                {(result.items ?? []).map((item, idx) => (
                  <li key={item.name || idx} className="flex justify-between gap-3">
                    <span>{item.name}</span>
                    <span className="tabular-nums">{formatIdr(item.price)}</span>
                  </li>
                ))}
              </ul>
              <p className="rounded-lg bg-black/25 px-3 py-1.5 text-xs text-white/60">
                Mode demo: hasil ini masih simulasi, belum membaca isi foto sungguhan.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 font-bold transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  🔄 Scan ulang
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  className="rounded-xl border-2 border-white/50 bg-gradient-to-b from-emerald-300 to-green-500 px-3 py-2.5 font-extrabold text-slate-900 shadow-[0_4px_0_0_#14532d] transition active:translate-y-1 active:shadow-[0_1px_0_0_#14532d] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none"
                >
                  Lanjut Simpan
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {stage === 'error' && (
        <div className="space-y-4 text-center">
          <p role="alert" className="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
            {error ?? 'Terjadi kesalahan saat memindai.'}
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border-2 border-white/50 bg-gradient-to-b from-cyan-300 to-sky-500 px-5 py-2.5 font-extrabold text-slate-900 shadow-[0_4px_0_0_#075985] focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            Coba lagi
          </button>
        </div>
      )}
    </ModalShell>
  );
}