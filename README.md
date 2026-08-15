# Dapur Ku

Aplikasi tracking menu mingguan, stok bahan, dan anggaran belanja.

## Jalanin di komputer sendiri

```bash
npm install
npm run dev
```

Buka `http://localhost:5173` di browser.

## Deploy jadi web app online

Cara termudah: **Vercel**.

1. Push folder ini ke GitHub (lihat langkah di chat).
2. Buka [vercel.com](https://vercel.com), login pakai akun GitHub.
3. Klik **"Add New" → "Project"**, pilih repo `dapur-ku` ini.
4. Vercel otomatis detect ini project Vite — biarkan setting default, klik **Deploy**.
5. Selesai, dapat link seperti `dapur-ku.vercel.app`.

Data tersimpan di `localStorage` browser kamu, jadi tetap ada tiap kali dibuka lagi di browser & perangkat yang sama.
