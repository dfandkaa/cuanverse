'use client';

import { useEffect, useState } from 'react';
import ModalShell from '../ui/ModalShell';
import { CATEGORY_META, type CategoryKey, type TransactionRecord } from '../../lib/transactions';

export interface TransactionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  onRefreshDashboard?: () => void;
}

const formatIdr = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

export default function TransactionHistoryModal({ open, onClose, onRefreshDashboard }: TransactionHistoryModalProps) {
  const [items, setItems] = useState<TransactionRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('cuanverse_transactions') || '[]';
      setItems(JSON.parse(raw));
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  const handleDelete = (id: string) => {
    const target = items.find((t) => t.id === id);
    if (!target) return;

    const updated = items.filter((t) => t.id !== id);
    setItems(updated);
    localStorage.setItem('cuanverse_transactions', JSON.stringify(updated));

    // Kembalikan saldo & budget saat transaksi dihapus
    const currentBalance = Number(localStorage.getItem('cuanverse_balance') || '1500000');
    const newBalance = target.type === 'expense' ? currentBalance + target.amount : currentBalance - target.amount;
    localStorage.setItem('cuanverse_balance', String(newBalance));

    onRefreshDashboard?.();
  };

  const filtered = items.filter((t) => filter === 'all' || t.type === filter);

  return (
    <ModalShell open={open} onClose={onClose} title="Riwayat Keuangan" icon="📜">
      <div className="space-y-4">
        {/* Filter Tab */}
        <div className="flex gap-2 rounded-xl bg-black/30 p-1 text-xs font-bold">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'expense', label: '⚔️ Pengeluaran' },
              { id: 'income', label: '🪙 Pemasukan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex-1 rounded-lg py-2 transition ${
                filter === tab.id ? 'bg-white/90 text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Daftar Transaksi */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-white/50">Belum ada catatan transaksi.</div>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {filtered.map((tx) => {
              const meta = CATEGORY_META[tx.categoryKey as CategoryKey] || { emoji: '📦', label: 'Umum' };
              const isExpense = tx.type === 'expense';
              const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-3 text-sm transition hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <p className="font-bold text-white">{tx.merchant || meta.label}</p>
                      <p className="text-xs text-white/50">
                        {dateStr} • {tx.wallet === 'cash' ? '💵 Tunai' : '🏦 Bank'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-black tabular-nums ${isExpense ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {isExpense ? '-' : '+'}{formatIdr(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(tx.id)}
                      title="Hapus transaksi"
                      className="rounded-lg p-1 text-white/40 hover:bg-rose-500/20 hover:text-rose-300"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}