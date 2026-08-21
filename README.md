# Plainly

AI yang mengubah bahasa hukum, birokrasi, dan medis yang rumit jadi kalimat yang
mudah dipahami. Tiga mode: **Simplify**, **Translate**, **Explain**.

Dibuat untuk hackathon NeuralSprint (Devpost).

## Arsitektur

```
Browser (React UI)
      ↓
/api/plainly   (Next.js Route Handler, jalan di server)
      ↓
Google Gemini API (gemini-2.5-flash, free tier)
      (API key hanya ada di server, tidak pernah dikirim ke browser)
```

Menggunakan **Gemini API free tier**. Ketersediaan model, limit request, dan
syarat penggunaannya mengikuti kebijakan Google yang berlaku dan bisa berubah —
cek kondisi aktif untuk project kamu langsung di
[Google AI Studio](https://aistudio.google.com).

## Menjalankan di komputer sendiri

1. Install dependencies:
   ```
   npm install
   ```
2. Copy file environment variable:
   ```
   # macOS / Linux
   cp .env.local.example .env.local

   # Windows (Command Prompt)
   copy .env.local.example .env.local
   ```
3. Buka https://aistudio.google.com/apikey, login dengan akun Google, klik
   **Create API key**. Copy key-nya ke `.env.local`
   pada baris `GEMINI_API_KEY=`.
4. Jalankan:
   ```
   npm run dev
   ```
5. Buka http://localhost:3000

## Deploy ke Vercel

1. Push folder ini ke repo GitHub baru.
2. Buka https://vercel.com → **New Project** → pilih repo tadi.
3. Saat konfigurasi, buka bagian **Environment Variables**, tambahkan:
   - Key: `GEMINI_API_KEY`
   - Value: API key Gemini kamu (dari aistudio.google.com/apikey)
4. Klik **Deploy**. Setelah selesai, kamu dapat URL publik (contoh:
   `plainly.vercel.app`) yang bisa dipakai untuk submission Devpost.

⚠️ **Jangan pernah commit `.env.local` atau API key ke GitHub.** File `.gitignore`
di project ini sudah menyertakan `.env.local` supaya aman.

⚠️ **Privasi:** Jangan masukkan data pribadi atau dokumen sensitif asli selama
testing — gunakan contoh teks umum seperti yang sudah tersedia di tombol "Try".
Untuk penanganan data oleh provider, rujuk ke kebijakan Google yang berlaku.

## Struktur file penting

- `app/page.js` — UI utama (client component)
- `app/api/plainly/route.js` — endpoint server yang membentuk prompt dan memanggil Gemini API
- `app/globals.css` — semua styling/design system
- `app/layout.js` — root layout + font

## Roadmap berikutnya

- [ ] Upload PDF / paste teks panjang → ekstrak teks
- [ ] Highlight kata/istilah sulit langsung di teks asli (klik untuk lihat penjelasan)
- [ ] Rate limiting sederhana di API route (opsional, biar tidak disalahgunakan)
