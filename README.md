<div align="center">

  <h1>⚔️ Cuanverse — Financial RPG App</h1>
  <p><b>Ubah Pencatatan Keuangan Harian Menjadi Petualangan RPG Retro 16-Bit!</b></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Capacitor-Android-blue?style=for-the-badge&logo=capacitor" alt="Capacitor" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </p>

</div>

---

## 📖 Tentang Project

**Cuanverse** adalah aplikasi manajemen keuangan pribadi berkonsep **Gamified RPG**. Aplikasi ini dirancang untuk mengubah rutinitas mencatat anggaran dan transaksi menjadi permainan yang menyenangkan. Pemain bisa menaikkan level karakter, mengalahkan "Bos Hutang", serta membuka berbagai aset kerajaan finansial.

---

## ✨ Fitur Utama

- 🐯 **Maskot Companion (Cuan Tiger)**: Teman petualangan yang siap memberikan masukan & nasihat finansial.
- ⚔️ **Debt Boss Battle**: Konversi tagihan/hutang menjadi monster RPG yang bisa diserang dengan pembayaran berkala.
- 📊 **Statistik RPG Keuangan**: 
  - **STR**: Berdasarkan total Saldo.
  - **DEF**: Berdasarkan sisa Health Anggaran.
  - **AGI**: Berdasarkan batas pengeluaran harian.
  - **LUK**: Berdasarkan *Streak Days* pencatatan.
- 💾 **Single-Page Offline Persistence**: Data tersimpan aman di `localStorage` HP tanpa perlu takut ter-reset saat aplikasi ditutup.
- 🔄 **Season Reset**: Fitur reset anggaran bulanan tanpa menghilangkan Level, EXP, dan Gold yang sudah dikumpulkan.

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
| :--- | :--- |
| **Frontend Framework** | [Next.js](https://nextjs.org/) (App Router) |
| **Mobile Runtime** | [Capacitor](https://capacitorjs.com/) (Android) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Database / Auth** | [Supabase](https://supabase.com/) & LocalStorage Fallback |
| **Language** | TypeScript |

---

## 🚀 Cara Menjalankan Project (Local Development)

### 1. Clone Repository
```bash
git clone [https://github.com/dafadwiandika2-beep/cuanverse.git]
cd cuanverse-app