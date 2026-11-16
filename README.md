# SRISP Badminton — PWA Lapangan & Turnamen

Aplikasi web ringan (PWA) untuk pengelolaan lapangan badminton: pemesanan,
status lapangan aktif/kosong real-time, turnamen dengan bagan pertandingan,
dan live score. Backend **Firebase (Firestore + Auth)** opsional — tanpa
konfigurasi, aplikasi otomatis berjalan dalam **Mode Demo** (localStorage +
simulator skor) sehingga bisa langsung dicoba.

© SRISP 2026

## Menjalankan

Tanpa build, tanpa dependensi:

```sh
node server.js        # dev/preview pada port 3000
# atau: npx serve public
```

## Menyambungkan Firebase (Mode Produksi)

1. Buat proyek di https://console.firebase.google.com
2. Aktifkan **Cloud Firestore** dan **Authentication → Anonymous**.
3. Project settings → Your apps → Web app → salin objek config.
4. Isi `public/js/config.js`:

```js
export const FIREBASE_CONFIG = {
  apiKey: "AIza...", authDomain: "xxx.firebaseapp.com",
  projectId: "xxx", storageBucket: "xxx.appspot.com",
  messagingSenderId: "123...", appId: "1:123:web:abc",
};
```

5. Aturan Firestore awal (ketatkan sebelum produksi; `adminPin` di config.js
   hanya gerbang UI, bukan keamanan — pindahkan otorisasi ke Custom Claims):

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
live) dimuat otomatis saat koleksi masih kosong.

## Struktur

```
public/
  index.html            shell aplikasi (6 panel)
  css/style.css         gaya "Kertas Turnamen"
  js/
    app.js              bootstrap, router panel, SW register
    config.js          ← ISI KREDENSIAL FIREBASE DI SINI
    firebase.js         loader SDK dinamis (hanya dimuat saat terkonfigurasi)
    store.js            lapisan data: Firestore realtime ↔ demo localStorage
    ui.js / ui-helpers.js / router-shim.js
    panels/home.js      dasbor status lapangan real-time
    panels/booking.js   pemesanan + validasi bentrok jadwal
    panels/courts.js    info tarif, fasilitas, jam operasional
    panels/tournament.js bagan, jadwal, hasil, live score
    panels/history.js   profil & riwayat pemesanan
    panels/admin.js     konsol skor, kelola booking & lapangan (PIN)
    manifest.webmanifest, sw.js, icons/
```

Koleksi Firestore: `courts`, `bookings`, `tournaments`, `matches`.

## PWA

Terpasang dari browser (Add to Home Screen). Service worker meng-cache
app-shell untuk buka super cepat + banner status saat luring.
Ganti versi cache di `sw.js` (`V`) tiap kali merilis perubahan.

## GitHub

Proyek ini disimpan dengan Git; dorong ke repositori GitHub Anda dan
aktifkan Firebase Hosting (`firebase init hosting`, public = `public`)
atau GitHub Pages untuk hosting statis.
