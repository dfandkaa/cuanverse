'use client';

import ModalShell from '../ui/ModalShell';

export interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  totalBalance: number;
  healthScore: number;
  streakDays: number;
  dailyLimit: number;
  onResetMonth?: () => void;
}

export default function StatsModal({
  open,
  onClose,
  totalBalance,
  healthScore,
  streakDays,
  dailyLimit,
  onResetMonth,
}: StatsModalProps) {
  const str = Math.min(99, Math.floor(totalBalance / 50000));
  const def = healthScore;
  const agi = Math.min(99, Math.floor(dailyLimit / 5000));
  const luk = Math.min(99, streakDays * 5);

  const stats = [
    { label: 'STR (Kekuatan Saldo)', val: str, icon: '⚔️', desc: 'Dihitung dari total saldo dompetmu.' },
    { label: 'DEF (Pertahanan HP)', val: def, icon: '🛡️', desc: 'Dihitung dari kesehatan anggaran bulan ini.' },
    { label: 'AGI (Kelincahan Harian)', val: agi, icon: '⚡', desc: 'Batas aman belanja harian kamu.' },
    { label: 'LUK (Keberuntungan Streak)', val: luk, icon: '🍀', desc: 'Bonus dari konsistensi streak harian.' },
  ];

  const handleNewMonth = () => {
    if (
      confirm(
        'Apakah kamu yakin ingin memulai Bulan Baru?\n\n- Pengeluaran anggaran akan di-reset ke 0%\n- Riwayat transaksi bulan ini akan dibersihkan\n- Level, EXP, dan Gold Koinmu TETAP AMAN!'
      )
    ) {
      onResetMonth?.();
      onClose();
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Status Karakter RPG" icon="📊">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/15 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xl">{s.icon}</span>
                <span className="text-xl font-black text-amber-300">{s.val}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-white">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-white/50">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-center text-xs text-amber-200">
          💡 Tingkatkan saldo dan pertahankan streak untuk menaikkan Atribut Karaktermu!
        </div>

        {/* Tombol Reset Bulan Baru */}
        <button
          type="button"
          onClick={handleNewMonth}
          className="w-full rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 py-2.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/30 active:scale-95"
        >
          🔄 Mulai Season / Bulan Baru (Reset Anggaran)
        </button>
      </div>
    </ModalShell>
  );
}