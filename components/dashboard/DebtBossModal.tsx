'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ModalShell from '../ui/ModalShell';
import { attackBoss, getBosses, type DebtBoss } from '../../lib/game/bosses';
import { sfx } from '../../lib/game/sfx';

export interface DebtBossModalProps {
  open: boolean;
  onClose: () => void;
  onBossDefeated?: () => void;
}

const formatIdr = (val: number) => `Rp ${new Intl.NumberFormat('id-ID').format(val)}`;

export default function DebtBossModal({ open, onClose, onBossDefeated }: DebtBossModalProps) {
  const [bosses, setBosses] = useState<DebtBoss[]>([]);
  const [selectedBoss, setSelectedBoss] = useState<DebtBoss | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [damageText, setDamageText] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const list = getBosses();
      setBosses(list);
      setSelectedBoss(list.find((b) => !b.isDefeated) || list[0] || null);
      setDamageText(null);
      setPayAmount('');
    }
  }, [open]);

  const handleAttack = () => {
    if (!selectedBoss || !payAmount) return;
    const amount = Number(payAmount.replace(/\D/g, ''));
    if (amount <= 0) return;

    const { updatedBosses, isFatal } = attackBoss(selectedBoss.id, amount);
    setBosses(updatedBosses);
    setSelectedBoss(updatedBosses.find((b) => b.id === selectedBoss.id) || null);

    setDamageText(`-${formatIdr(amount)} HP!`);
    sfx.coin();

    if (isFatal) {
      sfx.levelUp();
      onBossDefeated?.();
    }

    setPayAmount('');
    setTimeout(() => setDamageText(null), 1800);
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Pertarungan Bos Hutang" icon="⚔️">
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {bosses.map((boss) => (
            <button
              key={boss.id}
              type="button"
              onClick={() => setSelectedBoss(boss)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                selectedBoss?.id === boss.id
                  ? 'border-amber-300 bg-amber-400/20 text-amber-200'
                  : 'border-white/10 bg-black/20 text-white/60'
              }`}
            >
              <span>{boss.emoji}</span>
              <span>{boss.name}</span>
              {boss.isDefeated && <span className="text-emerald-400">✅</span>}
            </button>
          ))}
        </div>

        {selectedBoss ? (
          <div className="relative rounded-2xl border-2 border-rose-500/40 bg-gradient-to-b from-rose-950/40 to-black/60 p-4 text-center">
            {damageText && (
              <motion.div
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -40, scale: 1.3 }}
                transition={{ duration: 1.5 }}
                className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 text-2xl font-black text-amber-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)]"
              >
                💥 {damageText}
              </motion.div>
            )}

            <div className="mb-2 text-6xl">{selectedBoss.isDefeated ? '💀' : selectedBoss.emoji}</div>
            <h3 className="text-lg font-black text-white">{selectedBoss.name}</h3>
            <p className="text-xs text-rose-300">Bunga Cicilan: {selectedBoss.interestRate}% / bulan</p>

            <div className="my-3 space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-white/70">HP Bos (Sisa Hutang)</span>
                <span className="text-rose-300">
                  {formatIdr(selectedBoss.currentHp)} / {formatIdr(selectedBoss.maxHp)}
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full border border-white/20 bg-black/60">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500"
                  style={{ width: `${(selectedBoss.currentHp / selectedBoss.maxHp) * 100}%` }}
                />
              </div>
            </div>

            {!selectedBoss.isDefeated ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={payAmount ? new Intl.NumberFormat('id-ID').format(Number(payAmount.replace(/\D/g, ''))) : ''}
                  onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan nominal bayar cicilan"
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-center text-sm font-bold text-white placeholder:text-white/30 focus:border-amber-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAttack}
                  disabled={!payAmount}
                  className="w-full rounded-xl border-2 border-white/40 bg-gradient-to-b from-rose-400 to-red-600 py-3 text-sm font-black text-white shadow-lg transition active:scale-95 disabled:opacity-40"
                >
                  ⚔️ Serang Bos (Bayar Cicilan)!
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/20 py-2 text-sm font-bold text-emerald-300">
                🎉 Bos ini telah dikalahkan! Bebas dari hutang ini!
              </div>
            )}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}