# Drawly

> **Sketch, note, and share ideas effortlessly.**

Drawly adalah aplikasi papan tulis virtual dan kanvas catatan / diagram interaktif berbasis **Rough.js** dengan tampilan modern studio minimalis (*glassmorphism dock*) dan backend **NestJS + Prisma + PostgreSQL (Neon)**.

---

## ✨ Fitur Utama

- **Tanpa Registrasi / Login Wajib**: Buka langsung coret, gambar diagram, atau tulis catatan.
- **Hand-drawn Sketchy Aesthetic**: Didukung oleh library **Rough.js** untuk gaya sketsa tangan bebas yang unik dan bebas lisensi berbayar.
- **Peralatan Lengkap**: Seleksi & Geser (*Select & Move*), Pensil Bebas (*Pencil*), Persegi (*Rectangle*), Lingkaran (*Circle*), Panah (*Arrow*), Garis (*Line*), Teks (*Text Note*), dan Penghapus (*Eraser*).
- **Glassmorphism Floating Dock**: Toolbar melayang di bawah layar dengan shortcut keyboard lengkap.
- **Contextual Properties Panel**: Pengaturan warna stroke, fill, ketebalan garis, dan gaya sketsa muncul otomatis saat elemen dipilih.
- **Auto-save LocalStorage**: Coretan otomatis tersimpan di browser secara realtime.
- **Ekspor Instan**: Unduh kanvas ke format **PNG (Resolusi Tinggi)**, **SVG (Vektor)**, dan **JSON Project (.drawly)**.
- **Share Link Instan**: Simpan kanvas ke database Neon via NestJS REST API dan dapatkan link publik unik (`/c/[shareId]`).

---

## 🛠️ Tech Stack

### Frontend (`drawly-frontend`)
- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS & Lucide Icons
- **Canvas Engine**: Rough.js + HTML5 Canvas API

### Backend (`drawly-backend`)
- **Framework**: NestJS 11 (TypeScript)
- **Database ORM**: Prisma ORM
- **Database**: PostgreSQL (Neon Cloud)
- **Validation & Helpers**: `class-validator`, `class-transformer`, `nanoid`

---

## 🚀 Cara Menjalankan

### 1. Jalankan Sekaligus (Rekomendasi)
Di root direktori `Drawly`:
```bash
npm run dev
```
- **Backend**: Berjalan di `http://localhost:3001`
- **Frontend**: Berjalan di `http://localhost:3000`

### 2. Jalankan Terpisah
**Backend:**
```bash
cd drawly-backend
npm run start:dev
```

**Frontend:**
```bash
cd drawly-frontend
pnpm dev
```

---

## 📄 Lisensi
MIT License
