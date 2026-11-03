'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 p-8 border border-amber-500/20 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-amber-400 mb-2">⚔️ Cuanverse Login</h1>
        <p className="text-slate-400 text-sm mb-6">
          Masuk ke akun ksatria keuanganmu atau langsung mulai petualangan baru.
        </p>

        <Link
          href="/onboarding"
          className="inline-block w-full rounded-xl bg-amber-400 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
        >
          Lanjut ke Onboarding Karakter 🚀
        </Link>
      </div>
    </div>
  );
}