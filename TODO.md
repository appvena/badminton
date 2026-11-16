# TODO — SRISP Badminton (PWA)

Status: ✅ 1–9 selesai (checkpoint `e9df026`, tervalidasi agen validator) · 🔄 10 publikasi berjalan; koneksi GitHub menunggu akun pengguna.

Style terpilih: **Kertas Turnamen** — tampilan terang terinspirasi bagan pertandingan dan lembar skor, garis tipis, ruang lapang, aksen merah #D64045, IBM Plex Sans.

## 1. Fondasi proyek modular
- HTML dan JavaScript dipisah dalam file tersendiri (tanpa framework, ES modules), aplikasi sangat ringan ketika dibuka.
- `config.js` berisi konfigurasi Firebase yang mudah diisi pemilik proyek; kosong → mode demo lokal.
- Struktur: `public/` (index.html, css/, js/, manifest, sw, icons) siap publikasi statis.
- Hak cipta "© SRISP 2026" tampil di aplikasi.

## 2. PWA
- `manifest.webmanifest` + ikon (192/512/maskable) → dapat dipasang.
- `sw.js` cache aset inti (app shell) + status koneksi jelas (indikator offline/banner).
- `pwa.manifestMode` = `application_owned`.

## 3. Animasi loading & transisi panel
- Splash loading ringan (shuttlecock animasi), skeleton saat data dimuat.
- Navigasi panel dengan efek transisi geser/fade hemat GPU; hormati `prefers-reduced-motion`.

## 4. Autentikasi & peran
- Firebase Auth (anonym/email demo) dengan peran pengunjung vs pengelola; panel admin muncul sesuai peran.

## 5. Dasbor lapangan real-time
- Menampilkan lapangan: aktif/sedang dipakai, telah dipesan, kosong — diperbarui real-time (onSnapshot / simulator demo).
- Ringkasan hari ini: jam sibuk, statistik okupansi sederhana.

## 6. Pemesanan lapangan
- Alur: pilih tanggal → jam → lapangan → data pemesan (nama, WA) → konfirmasi.
- Validasi benturan jadwal; slot yang sudah dipesan tidak dapat dipilih; status booking (aktif/selesai/batal).

## 7. Data lapangan & operasional
- Kelola lapangan (nama, tarif/jam, jam operasional, fasilitas) melalui panel admin; jam operasional membatasi slot booking.

## 8. Turnamen & live score
- Data turnamen, peserta/tim, pertandingan, jadwal, progres kompetisi (bagan per ronde).
- Live score pertandingan dengan pembaruan real-time via Firestore (skor gim, poin); tampil publik.
- Hasil turnamen (juara/ranking) tercatat.

## 9. Riwayat & pencarian
- Riwayat reservasi pengguna (cari/saring) dan riwayat pertandingan/hasil turnamen.

## 10. Git/GitHub & publikasi
- Checkpoint ke origin/main; tawarkan koneksi repositori GitHub milik pengguna.
- Build statis dideklarasikan (`build`), preview & publikasi.
