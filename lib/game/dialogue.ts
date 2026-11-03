import type { MascotMood, StarterMascotId } from '../../types/game';

export function getDialoguePool(
  mood: MascotMood,
  healthScoreOrVariant?: number | StarterMascotId
): string[] {
  const dialogues: Record<string, string[]> = {
    HAPPY: [
      'Kerajaan keuangan kita sangat aman dan makmur!',
      'Kerja bagus! Tabunganmu terus berkembang hari ini.',
      'Tetap pertahankan gaya hidup hematmu, Pahlawan!',
    ],
    NEUTRAL: [
      'Hati-hati dengan pengeluaran kecil yang sering tak terduga.',
      'Pastikan anggaran bulan ini masih cukup sampai akhir bulan.',
      'Ayo cek catatan transaksimu hari ini!',
    ],
    PANIC: [
      'Waspada! Bar HP kerajaanmu mulai berkurang!',
      'Pengeluaranmu hampir melebihi batas bulanan.',
    ],
    CRYING: [
      'BAHAYA! Kerajaan keuanganmu dalam kondisi kritis!',
      'HP Anggaran hampir habis! Stop belanja sekarang juga!',
    ],
  };

  const key = String(mood).toUpperCase();
  return dialogues[key] || dialogues.NEUTRAL;
}