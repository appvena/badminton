// ============================================================
// SRISP Badminton — Konfigurasi
// Isi FIREBASE_CONFIG dengan kredensial proyek Firebase Anda
// (Console Firebase → Project Settings → Your apps → Web app →
//  "Config" object). Biarkan kosong untuk Mode Demo lokal.
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export const APP = {
  name: "SRISP Badminton",
  tagline: "Lapangan. Turnamen. Skor Langsung.",
  copyright: "© SRISP 2026",
  brand: "SRISP",
  // Kode untuk membuka panel Pengelola (ganti di produksi bersama aturan keamanan Firebase)
  adminPin: "srisp2026",
  // Jam operasional default bila lapangan tidak mengatur sendiri
  defaultOpen: 8,   // 08.00
  defaultClose: 22, // 22.00
  slotMinutes: 60,
};

export const isFirebaseConfigured = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
