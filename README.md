# SRISP Badminton — PWA Lapangan & Turnamen

Aplikasi web ringan (PWA) untuk pengelolaan lapangan badminton: pemesanan,
status lapangan aktif/kosong real-time, turnamen dengan bagan pertandingan,
dan live score. Backend **Firebase (Firestore + Auth)** — dengan
config terisi aplikasi memakai Firestore realtime; jika config dikosongkan,
aplikasi otomatis berjalan dalam **Mode Demo** (localStorage + simulator
skor) sehingga bisa dicoba tanpa proyek Firebase.

© SRISP 2026

## Login

Tombol **MASUK / DAFTAR** ada di **pojok kanan atas** header dan membuka
modal. Pengunjung tanpa akun memakai sesi tamu anonim otomatis, tetap bisa
menjelajah dan memesan.

- **Daftar** — email + kata sandi (Firebase Auth Email/Password). Dokumen
  profil dibuat otomatis di koleksi `users` dengan peran `pemain`.
- **Masuk** — akun yang sudah terdaftar.
- **Keluar** — lewat menu chip pengguna di kanan atas; sesi kembali ke tamu.
- **Panel Kelola** — terbuka bila `APP.adminPin` benar DAN akun ber-`role`
  admin/superadmin di koleksi `users` (divalidasi oleh Rules server).
- Mode Demo (config kosong): login dipalsukan lokal perangkat.

## Menjalankan

Tanpa build, tanpa dependensi:

```sh
node server.js        # dev/preview pada port 3000
# atau: npx serve public
```

## Menyambungkan Firebase

Config proyek sudah terpasang di `public/js/config.js` (proyek
`vena-random`). Yang perlu dipastikan di https://console.firebase.google.com:

1. **Cloud Firestore** dibuat (mode produksi/starting rules apa pun boleh;
   lihat aturan contoh di bawah).
2. **Authentication → Sign-in method**: aktifkan **Email/Password**,
   **Anonymous**, dan provider lain yang diinginkan (Google, dsb.).
3. **Authentication → Settings → Authorized domains**: tambahkan domain
   situs Anda (mis. `www.bwf.web.id`) agar login tidak ditolak.
4. Deploy ulang setelah mengubah config — SDK Firebase dimuat dinamis
   dari CDN, tidak perlu `npm install`.

Aturan keamanan ada di `firestore.rules` (root repo) — tempel ke Console →
Firestore → Rules, atau `firebase deploy --only firestore:rules`. Ringkas:

- `courts`, `tournaments`, `matches`: dibaca publik, ditulis hanya admin.
- `bookings`: dibaca anggota yang login; dibuat atas nama diri sendiri
  (dengan validasi field), pemilik hanya bisa membatalkan.
- `users`: dibaca diri sendiri/admin; peran TIDAK bisa diubah sendiri.
- Data awal (seed) dimuat otomatis oleh akun pertama ber-role `admin`.

**Menyetel pengelola pertama:**

1. Daftar akun normal lewat aplikasi.
2. Console Firebase → Authentication → Users → salin **UID**.
3. Firestore → mulai koleksi `users` → buat dokumen ber-ID UID tadi →
   tambahkan field string `role` = `admin`.
4. Buka aplikasi → tab Kelola → masukkan kode pengelola (`APP.adminPin`).
   PIN hanya membuka sesi di perangkat; peran tetap diverifikasi server.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{coll}/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Seed awal (6 lapangan, turnamen SRISP Open, beberapa booking & pertandingan
live) dimuat otomatis saat koleksi `courts` masih kosong.

> Catatan: Firestore dan Realtime Database adalah produk berbeda — aplikasi
> ini memakai **Firestore**. `databaseURL` di config hanya diabaikan.

## Struktur

```
public/
  index.html            shell aplikasi (halaman login + 6 panel)
  css/style.css         gaya "Kertas Turnamen"
  js/
    app.js              bootstrap, gerbang auth, router panel, SW register
    auth.js             halaman Masuk/Daftar/tamu + kode pengelola
    config.js          ← konfigurasi Firebase & identitas merek
    firebase.js         loader SDK dinamis + Auth + CRUD + realtime
    store.js            lapisan data: Firestore realtime ↔ mode demo
    ui.js / ui-helpers.js / router-shim.js
    panels/home.js      dasbor status lapangan real-time
    panels/booking.js   pemesanan + validasi bentrok jadwal
    panels/courts.js    info tarif, fasilitas, jam operasional
    panels/tournament.js bagan, jadwal, hasil, live score
    panels/teams.js      Tim & Tanding: tim, kode undangan, chat, tanding
                         mandiri dgn skor live (publik bisa melihat)
    panels/history.js   profil, keluar, riwayat pemesanan
    panels/admin.js     konsol skor, kelola booking & lapangan
    manifest.webmanifest, sw.js, icons/
```

Koleksi Firestore: `courts`, `bookings`, `tournaments`, `matches`, `users`,
`teams`, `messages`, `settings` (logo + identitas aplikasi oleh superadmin).
Ruang pengelola dapat dibuka lewat klik nomor versi di footer.

## PWA

Terpasang dari browser (Add to Home Screen). Service worker meng-cache
app-shell untuk buka super cepat + banner status saat luring.
Ganti versi cache di `sw.js` (`V`) tiap kali merilis perubahan.

## GitHub & Hosting

Dorong repo ke GitHub, sajikan melalui GitHub Pages (folder `public/`) atau
Firebase Hosting (`firebase init hosting`, public = `public`). Halaman
situs adalah `public/index.html` — bila yang terbuka hanya teks README ini,
berarti host menunjuk ke README, bukan ke `index.html` (periksa pengaturan
folder/dokumen sumber).
