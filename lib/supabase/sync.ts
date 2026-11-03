import { createClient } from './client';

export async function syncLocalTransactionsToSupabase(): Promise<{ syncedCount: number; error: string | null }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, error: 'Offline' };
  }

  try {
    const rawTx = localStorage.getItem('cuanverse_transactions') || '[]';
    const transactions = JSON.parse(rawTx);

    if (transactions.length === 0) {
      return { syncedCount: 0, error: null };
    }

    const supabase = createClient() as any;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return { syncedCount: 0, error: 'Not authenticated' };
    }

    // Filter transaksi yang belum di-sync (tanpa flag syncedRemote)
    const unsynced = transactions.filter((t: any) => !t.syncedRemote);
    if (unsynced.length === 0) {
      return { syncedCount: 0, error: null };
    }

    const payload = unsynced.map((t: any) => ({
      user_id: authData.user.id,
      amount: t.amount,
      type: t.type,
      category_key: t.categoryKey,
      merchant: t.merchant || null,
      created_at: t.createdAt,
    }));

    const { error } = await supabase.from('transactions').insert(payload);
    if (error) throw error;

    // Tandai sudah ter-sync
    const updated = transactions.map((t: any) => ({ ...t, syncedRemote: true }));
    localStorage.setItem('cuanverse_transactions', JSON.stringify(updated));

    return { syncedCount: unsynced.length, error: null };
  } catch (err: any) {
    return { syncedCount: 0, error: err?.message || 'Sync failed' };
  }
}