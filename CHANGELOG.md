# CHANGELOG — SRISP Badminton

## v1.9.2 — 2026-11-17
- Splash loading: **ring berputar** sederhana (logo upload tetap tampil bila ada).
- Tab Lapangan: tombol **Ubah** — edit kode, nama, tarif/jam, jam buka–tutup,
  fasilitas langsung dari daftar (plus Batal).
- FIX besar rasa "harus refresh": tombol konsol mengunci fokus sehingga panel
  menolak menggambar ulang — kini fokus dilepas saat diklik dan re-render
  hanya ditunda bila pengguna sedang mengetik di form. Perawatan/Aktifkan,
  Hapus, Mulai, +/- skor, ganti tim/pemain, dan tab lain kini instan.


## v1.9.1 — 2026-11-17
- **Hapus lapangan**: tombol 🗑 Hapus per baris di Kelola → tab Lapangan,
  dengan konfirmasi + peringatan jumlah pesanan mendatang (Rules sudah
  mengizinkan admin; penonaktifan tetap tersedia lewat tombol Perawatan).

## v1.9.0 — 2026-11-17
- **Tema Merah-Putih** — gradasi merah di bar info, hero turnamen, footer,
  tombol; font **Plus Jakarta Sans**; nav header dengan animasi garis
  gradasi & teks gradasi saat dipilih (transisi tetap ringan).
- **Logo**: segitiga-S dihapus; merek = logo upload (auto favicon & header)
  atau wordmark; **BWF miring (italic)** — bisa dimatikan di Pengaturan;
  inisial/short brand dapat diisi manual.
- **Superadmin tanpa kode**: Kelola terbuka otomatis setelah login akun
  ber-role; tanpa PIN. (Mode demo lokal tetap memakai kode.)
- **Mode tamu bersih**: Tim & Tanding, Riwayat, Kelola, dan tautannya di
  footer/tabbar hanya muncul untuk akun login/pengelola.
- **Konsol superadmin bertab**: Skor & Wasit · Lapangan · Pesanan ·
  Pengaturan (identitas, tagline, pengumuman, gaya brand) · **Akun & Peran**
  (naik/turunkan role pemain/admin/superadmin langsung dari aplikasi) · Logo.
- **Wasit via QR**: tombol ▦ QR Wasit (Kelola & Tanding Saya) — perangkat
  wasit scan → rute `#wasit/<id>/<kode>` → tersambung & konsol terbuka
  otomatis. Admin/host dapat **mencabut wasit dengan konfirmasi kata sandi**.
- **Chat membaik**: gelembung kiri/kanan, avatar inisial, pemisah hari
  (Hari ini/Kemarin), chip anggota tim di atas chat.

## v1.8.1 — 2026-11-17
- FIX gerbang Kelola: peran `superadmin` kini diterima (sebelumnya hanya
  `admin` yang lolos sehingga superadmin ditolak).
- Role dibaca ulang dari server saat kode pengelola ditekan — ubah role di
  Firebase Console cukup lalu tekan "Masuk" lagi, tanpa refresh halaman.

## v1.8.0 — 2026-11-17
- **Nama pemain** (single/ganda) di kartu live, jadwal, konsol wasit, dan
  Mode Tayang — diisi lewat form tanding, konsol pengelola, atau host.
- **LED kedap-kedip** menandai pertandingan yang sedang berlaga (kartu,
  bagan, konsol, tayang).
- **Hasil → PDF**: tombol 🖨 pada baris Selesai → pratinjau laporan resmi
  + Cetak/Simpan PDF (A4).
- **🎮 per pertandingan**: klik ikon pada kartu → input kode dari
  penyelenggara → tersinkron sebagai wasit (tombol berubah jadi ⚙ Konsol;
  bisa dicabut). Banyak pertandingan dapat live bersamaan; pengelola dapat
  membuat/menyalin kode wasit tiap partai.
- Rebrand default: nama aplikasi **Badminton World Federation** (BWF) —
  splash, header, footer, manifest, judul halaman; tetap dapat diubah lewat
  Pengaturan Aplikasi (field appName baru). © SRISP 2026 dipertahankan.

## v1.7.0 — 2026-11-17
- **Masuk sebagai wasit cukup dengan kode**: setiap tanding komunitas punya
  `refCode` (dikirim ke kartu Tanding Saya, bisa disalin). Wasit memasukkan
  kode lewat tombol 🏸 di halaman Turnamen → uid-nya tercatat di `refUids`
  (tersinkron dengan akunnya; rules menolak tanpa kode) → konsol wasit terbuka.
- **Mode Tayang ⛶** — layar skor besar publik, rotasi otomatis antar
  pertandingan live, realtime; tamu menonton TANPA login.
- Rules matches: wasit terdaftar boleh menulis skor; penambahan refUids
  dibatasi hanya append.

## v1.6.0 — 2026-11-17
- **Konsol Wasit** (⛶ Mode Wasit) di Kelola & Tanding Saya: layar khusus
  fullscreen, hitung poin per reli (ketuk sisi / keyboard A·L), model resmi
  21 poin, deuce, batas 30, best of 3, indikator servis, Undo, tulisan
  GAME/MATCH POINT — tiap klik langsung tersinkron realtime ke penonton.
- Splash loading memakai logo hasil upload (mirror localStorage, tampil
  sebelum server merespons).
- `firestore.indexes.json` (indeks chat) disertakkan dalam paket.
- Paket deploy lengkap 1 zip: frontend + rules + indexes + dokumentasi.

Aturan rilis: setiap update wajib (1) naikkan `APP.version` di
`public/js/config.js`, (2) naikkan `V` di `public/sw.js`, (3) tambah entri
di file ini. Versi tampil di splash, footer, dan ikut di commit message.

## v1.4.1 — 2026-11-17
- Service worker: HTML/JS/CSS kini network-first (tidak ada lagi versi lama
tertahan cache), gambar tetap cache-first.
## v1.5.0 — 2026-11-17
- Panel baru **Tim & Tanding**: pengguna terdaftar membuat tim (kode
  undangan), chat antar anggota (realtime, privasi per anggota), dan
  tanding antar tim dengan konsol skor langsung — tampil untuk publik
  di halaman Turnamen.
- **Pengaturan Aplikasi** di Kelola (superadmin): nama venue, alamat, jam
  operasional, kontak WA/email — realtime di footer/bar info/lapangan.
- Masuk pengelola lewat **klik nomor versi** di kanan bawah.
- Kata "Firestore" dihapus dari seluruh UI (status kini LIVE / DATA
  CADANGAN / MODE LOKAL).
- Halaman umum menampilkan "Penuh s/d HH.00" per lapangan.
- Rules: koleksi `teams` & `messages`, hak host atas tanding miliknya.

## v1.4.0 — 2026-11-17
- Perbaikan pemesanan: klik jam mulai → jam akhir (sebelumnya tidak bisa
  memilih rentang), validasi bentrok saat memperpanjang, auto-pilih
  lapangan, panel ter-render ulang saat data tiba.
- Data cadangan lokal bila server Firestore kosong/belum diatur (banner
  peringatan + status "FIRESTORE (DATA CADANGAN)" di footer).
- Pesan gagal pesan jelas saat rules/database belum aktif.
- Nomor versi di splash & footer.

## v1.3.0 — 2026-11-17
- Foto hero/banner menjadi aset lokal `img/` (tidak lagi bergantung
  storage Manus); SW precache foto.
- Seksi unggah logo tampil untuk semua pengelola (tulis tetap superadmin).

## v1.2.0 — 2026-11-17
- Failsafe boot: watchdog splash 3,5 dtk, timeout init Firebase 6 dtk,
  SW daftar lebih dulu + auto-reload, guard modal auth.

## v1.1.0 — 2026-11-17
- Tema "Arena BWF": header putih + garis merah, nav uppercase, login/daftar
  pojok kanan atas (modal), footer navy, sesi tamu anonim otomatis.

## v1.0.x — 2026-11-17
- Rules perbaikan (`.matches()`), peran superadmin, unggah logo settings/app.
- Login Firebase Email/Password + tamu, config vena-random terpasang.
- Tema awal "Kertas Turnamen", PWA, mode demo, konsol skor, seed data.
