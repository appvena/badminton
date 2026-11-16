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
  name: "SRISP Badminton",
  tagline: "Lapangan. Turnamen. Skor Langsung.",
  copyright: "© SRISP 2026",
  brand: "SRISP",
  // Kode untuk menaikkan peran akun menjadi Pengelola (gerbang UI;
  // otorisasi sesungguhnya sebaiknya dipindah ke Custom Claims/Aturan Firestore)
  adminPin: "srisp2026",
  defaultOpen: 8,   // 08.00
  defaultClose: 22, // 22.00
  slotMinutes: 60,
};

export const isFirebaseConfigured = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
