// ============================================================
// SRISP Badminton — Konfigurasi
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3x8BVWF2RTTtHUzzmwhQ5O-7bsf8GThc",
  authDomain: "vena-random.firebaseapp.com",
  databaseURL: "https://vena-random-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vena-random",
  storageBucket: "vena-random.firebasestorage.app",
  messagingSenderId: "446089956208",
  appId: "1:446089956208:web:60b8324cd58fc456c01db5",
};

export const APP = {
  name: "Badminton World Federation",
  tagline: "Lapangan. Turnamen. Skor Langsung.",
  copyright: "© SRISP 2026",
  brand: "SRISP",
  // CATATAN RILIS: setiap update ubah versi di SINI + sw.js (V) + CHANGELOG.md.
  version: "1.8.0",
  // Kode untuk menaikkan peran akun menjadi Pengelola (gerbang UI;
  // otorisasi sesungguhnya sebaiknya dipindah ke Custom Claims/Aturan Firestore)
  adminPin: "srisp2026",
  defaultOpen: 8,   // 08.00
  defaultClose: 22, // 22.00
  slotMinutes: 60,
};

// Nilai awal identitas lokasi — SEMUA bisa diubah superadmin lewat
// Kelola → Pengaturan Aplikasi (tersimpan di server, realtime).
export const SETTINGS_DEFAULTS = {
  appName: "Badminton World Federation",
  venueName: "BWF Hall",
  address: "Jl. Sport Center No. 1",
  contactWA: "0812-3456-7890",
  contactEmail: "info@srisp.id",
  openHours: "08.00 – 22.00, setiap hari",
};

export const isFirebaseConfigured = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
