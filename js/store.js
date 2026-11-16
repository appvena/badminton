// ============================================================
// store.js — Lapisan data tunggal untuk aplikasi.
// Mode Firebase : Firestore collections + onSnapshot (realtime).
// Mode Demo     : localStorage + simulator skor agar live score
//                 tetap dapat dilihat tanpa proyek Firebase.
// ============================================================
import { APP } from "./config.js";
import * as fb from "./firebase.js";
import { dateKey, pad2 } from "./ui.js";

const LS_DB = "srisp_db_v1";
const LS_USER = "srisp_user_v1";

export const state = {
  mode: "boot",           // boot | demo | firebase
  courts: [], bookings: [], tournaments: [], matches: [], settings: [],
  user: loadJSON(LS_USER, { name: "", phone: "", admin: false, uid: "" }),
  net: navigator.onLine,
  ready: false,
};

const listeners = new Set();
export function onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function emit() { for (const cb of listeners) { try { cb(state); } catch (e) { console.error(e); } } }
function loadJSON(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
function saveDB(db) { localStorage.setItem(LS_DB, JSON.stringify(db)); }
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

// ------------------------------------------------------------------
// SEED MODE DEMO
// ------------------------------------------------------------------
function nowHour() { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }

function seed() {
  const today = dateKey();
  const courts = [
    { id: "c1", code: "L1", name: "Lapangan Garuda 1", openFrom: 8, openTo: 22, price: 60000, facilities: ["Matras", "Kipas", "Parkir"], statusFlag: "ok" },
    { id: "c2", code: "L2", name: "Lapangan Garuda 2", openFrom: 8, openTo: 22, price: 60000, facilities: ["Matras", "Kipas"], statusFlag: "ok" },
    { id: "c3", code: "L3", name: "Lapangan Rajawali", openFrom: 8, openTo: 21, price: 50000, facilities: ["Kipas"], statusFlag: "ok" },
    { id: "c4", code: "L4", name: "Lapangan Elang", openFrom: 9, openTo: 22, price: 50000, facilities: ["Matras"], statusFlag: "ok" },
    { id: "c5", code: "L5", name: "Lapangan Halim", openFrom: 8, openTo: 20, price: 45000, facilities: ["Kipas"], statusFlag: "maint" },
    { id: "c6", code: "L6", name: "Lapangan Anggrek", openFrom: 10, openTo: 22, price: 45000, facilities: ["Matras", "Cafe"], statusFlag: "ok" },
  ];
  const h = Math.max(8, Math.floor(nowHour()));
  const mk = (courtId, start, end, name, phone) => ({
    id: uid(), courtId, date: today, startHour: start, endHour: end,
    name, phone, note: "", status: "active", createdAt: Date.now(),
  });
  const bookings = [
    mk("c1", h, Math.min(h + 2, 22), "Budi Santoso", "081234567001"),
    mk("c2", h, Math.min(h + 1, 22), "Tim Rajawali", "081234567002"),
    mk("c3", Math.min(h + 3, 20), Math.min(h + 4, 21), "Siti Aminah", "081234567003"),
    mk("c4", Math.min(h + 1, 21), Math.min(h + 3, 22), "Komunitas Smash", "081234567004"),
    mk("c6", 19, 21, "Arif & Friends", "081234567005"),
    mk("c1", 8, 9, "Olah Pagi", "081234567006"),
  ];
  const t1 = "t1";
  const teams = ["PB Cendrawasih", "PB Merapi", "PB Halim United", "PB Nitro", "PB Rajawali", "PB Sarana", "PB Turbo", "PB Anggrek"];
  const matches = [];
  const g = (round, slot, a, b, st) => ({
    id: uid(), tournamentId: t1, round, slot, teamA: a, teamB: b,
    status: "scheduled", time: "", courtId: "", games: [], curA: 0, curB: 0, winner: "", ...st,
  });
  // 8 besar
  matches.push(g(1, 0, teams[0], teams[1], { status: "done", games: [{ a: 21, b: 15 }, { a: 21, b: 18 }], winner: "A", time: "09.00", courtId: "c1" }));
  matches.push(g(1, 1, teams[2], teams[3], { status: "done", games: [{ a: 18, b: 21 }, { a: 12, b: 21 }], winner: "B", time: "10.30", courtId: "c2" }));
  matches.push(g(1, 2, teams[4], teams[5], { status: "live", time: "13.00", courtId: "c1", curA: 11, curB: 8, games: [{ a: 21, b: 17 }] }));
  matches.push(g(1, 3, teams[6], teams[7], { status: "scheduled", time: "14.30", courtId: "c2" }));
  // semifinal
  matches.push(g(2, 0, teams[0], teams[3], { status: "scheduled", time: "16.00", courtId: "c1" }));
  matches.push(g(2, 1, "", "", { status: "scheduled", time: "17.30", courtId: "c2" }));
  // final
  matches.push(g(3, 0, "", "", { status: "scheduled", time: "19.00", courtId: "c1" }));
  const tournaments = [{
    id: t1, name: "SRISP Open 2026", startDate: today,
    endDate: dateKey(new Date(Date.now() + 2 * 864e5)),
    format: "Tunggal Putra — Sistem Bagan (8 Besar)", status: "live", venue: "Gor SRISP",
  }];
  return { courts, bookings, tournaments, matches };
}

function getDB() {
  let db = loadJSON(LS_DB, null);
  if (!db || !db.courts) { db = seed(); saveDB(db); }
  return db;
}

// ------------------------------------------------------------------
// INIT
// ------------------------------------------------------------------
export async function init() {
  // Jangan pernah menggantung: bila SDK/connectivity bermasalah >6 dtk,
  // jalankan mode demo lokal agar aplikasi tetap terbuka.
  const ok = await Promise.race([
    fb.init(),
    new Promise((r) => setTimeout(() => r("timeout"), 6000)),
  ]).catch(() => false);
  if (ok === true) {
    state.mode = "firebase";
    const bind = (coll, key) => fb.fsSubscribe(coll, (rows) => { state[key] = rows; emit(); });
    bind("courts", "courts"); bind("bookings", "bookings");
    bind("tournaments", "tournaments"); bind("matches", "matches");
    bind("settings", "settings");
    state.ready = true; emit();
    try { await seedIfEmpty(); } catch (e) { console.warn("seed awal:", e.code || e.message); }
  } else {
    state.mode = "demo";
    hydrateDemo();
    state.ready = true; emit();
    startSimulator();
  }
  window.addEventListener("online", () => { state.net = true; emit(); });
  window.addEventListener("offline", () => { state.net = false; emit(); });
}

// Pantau status login Firebase; panggil cb(true) saat masuk, cb(false) saat keluar
let guestTried = false;
export function watchAuth(cb) {
  fb.onAuthChange(async (u) => {
    if (!u) {
      state.user = { name: "", phone: "", admin: false, uid: "", email: "", role: "", guest: false };
      localStorage.setItem(LS_USER, JSON.stringify(state.user));
      // Sesi anonim senyap: publik boleh menjelajah tanpa akun (diperlukan
      // oleh aturan Firestore untuk membaca jadwal/cek bentrok).
      if (!guestTried) { guestTried = true; fb.signInGuest().catch(() => { guestTried = false; }); }
      cb(false); emit(); return;
    }
    guestTried = false;
    state.user = { ...state.user, uid: u.uid, email: u.email, guest: !!u.isAnonymous };
    try {
      const prof = await fb.fsGet("users", u.uid);
      if (prof) Object.assign(state.user, { name: prof.name || state.user.name, phone: prof.phone || state.user.phone, role: prof.role || "pemain" });
      else if (!u.isAnonymous) await fb.fsSet("users", u.uid, { name: "", phone: "", role: "pemain", email: u.email });
    } catch (e) { console.warn("profil users:", e.code || e.message); }
    // Seed hanya boleh dilakukan pengelola (lihat aturan Firestore).
    if (isStaff() || state.mode === "demo")
      seedIfEmpty().catch((e) => console.warn("seed:", e.code || e.message));
    localStorage.setItem(LS_USER, JSON.stringify(state.user));
    cb(true); emit();
  });
}

export const isStaff = () => ["admin", "superadmin"].includes(state.user.role);

// Peran admin otoritatif dari koleksi users (Firestore). PIN hanya membuka
// sesi pengelola di perangkat ini — tidak bisa menulis peran sendiri ke DB.
export const isAdmin = () =>
  state.user.pinOk === true && (isStaff() || state.mode === "demo");

export function verifyAdminPin(pin) {
  if (pin !== APP.adminPin) return false;
  setUser({ pinOk: true });
  return true;
}

export const isSuperAdmin = () => state.user.role === "superadmin";

// ---- Logo aplikasi (unggah oleh superadmin) ----
export function logoData() {
  if (state.mode === "firebase") {
    const s = state.settings.find((x) => x.id === "app");
    return (s && s.logo) || "";
  }
  return localStorage.getItem("srisp_logo") || "";
}

export async function setLogo(dataURL) {
  if (state.mode === "firebase")
    await fb.fsSet("settings", "app", { logo: dataURL || "", updatedAt: Date.now() });
  else if (dataURL) localStorage.setItem("srisp_logo", dataURL);
  else localStorage.removeItem("srisp_logo");
  emit();
}

export function leaveAdmin() {
  state.user.pinOk = false;
  localStorage.setItem(LS_USER, JSON.stringify(state.user));
  emit();
}

async function countDocs() {
  const r = await fb.fsQuery("courts", [], 1);
  return r.length > 0;
}

async function seedIfEmpty() {
  if (state.mode !== "firebase") return;
  if (await countDocs()) { state.seeded = true; return; }
  await seedFirebase(seed());
  state.seeded = true;
}

async function seedFirebase(s) {
  for (const coll of ["courts", "bookings", "tournaments", "matches"])
    for (const row of s[coll]) {
      const { id, ...data } = row;
      await fb.fsSet(coll, id, data);
    }
}

function hydrateDemo() {
  const db = getDB();
  state.courts = db.courts; state.bookings = db.bookings;
  state.tournaments = db.tournaments; state.matches = db.matches;
}

function persistAndEmit() {
  if (state.mode === "demo") {
    saveDB({ courts: state.courts, bookings: state.bookings, tournaments: state.tournaments, matches: state.matches });
  }
  emit();
}

// ------------------------------------------------------------------
// STATUS LAPANGAN (turunan dari booking hari ini)
// ------------------------------------------------------------------
export function courtStatus(court, dateStr = dateKey(), at = new Date()) {
  if (court.statusFlag === "maint") return "maint";
  const h = at.getHours() + at.getMinutes() / 60;
  if (h < court.openFrom || h >= court.openTo) return "closed";
  const today = state.bookings.filter((b) => b.courtId === court.id && b.date === dateStr && b.status !== "cancelled");
  if (today.some((b) => h >= b.startHour && h < b.endHour)) return "playing";
  if (today.some((b) => b.startHour > h)) return "booked";
  return "free";
}

export function nextFreeSlot(court, dateStr = dateKey()) {
  const h = Math.ceil(new Date().getHours() + new Date().getMinutes() / 60);
  const today = state.bookings.filter((b) => b.courtId === court.id && b.date === dateStr && b.status !== "cancelled");
  for (let s = Math.max(h, court.openFrom); s < court.openTo; s++)
    if (!today.some((b) => s < b.endHour && s + 1 > b.startHour)) return s;
  return null;
}

export function occupancyToday() {
  const today = dateKey();
  let cap = 0, used = 0;
  for (const c of state.courts) {
    if (c.statusFlag === "maint") continue;
    cap += Math.max(0, c.openTo - c.openFrom);
    used += state.bookings
      .filter((b) => b.courtId === c.id && b.date === today && b.status !== "cancelled")
      .reduce((a, b) => a + (b.endHour - b.startHour), 0);
  }
  return cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
}

// ------------------------------------------------------------------
// PEMESANAN
// ------------------------------------------------------------------
export async function addBooking(b) {
  const court = state.courts.find((c) => c.id === b.courtId);
  if (!court) return { ok: false, error: "Lapangan tidak ditemukan." };
  if (b.start < court.openFrom || b.end > court.openTo)
    return { ok: false, error: `Di luar jam operasional (${pad2(court.openFrom)}.00–${pad2(court.openTo)}.00).` };
  if (b.end <= b.start) return { ok: false, error: "Jam selesai harus setelah jam mulai." };

  const clash = (x) => x.courtId === b.courtId && x.date === b.date && x.status !== "cancelled" && x.startHour < b.end && x.endHour > b.start;
  let conflicts;
  if (state.mode === "firebase") {
    const rows = await fb.fsQuery("bookings", [["courtId", "==", b.courtId], ["date", "==", b.date]]);
    conflicts = rows.filter(clash);
  } else {
    conflicts = state.bookings.filter(clash);
  }
  if (conflicts.length)
    return { ok: false, error: `Bentrok dengan pesanan ${pad2(conflicts[0].startHour)}.00–${pad2(conflicts[0].endHour)}.00. Pilih slot lain.` };

  const doc = { courtId: b.courtId, date: b.date, startHour: b.start, endHour: b.end, name: b.name, phone: b.phone, note: b.note || "", status: "active", createdAt: Date.now() };
  if (state.mode === "firebase") {
    if (state.user.uid) doc.ownerId = state.user.uid;
    await fb.fsAdd("bookings", doc);
  }
  else { doc.id = uid(); state.bookings.push(doc); }
  state.user.name = b.name; state.user.phone = b.phone;
  localStorage.setItem(LS_USER, JSON.stringify(state.user));
  if (state.mode === "firebase" && state.user.uid && !state.user.guest)
    fb.fsSet("users", state.user.uid, { name: b.name, phone: b.phone }).catch(() => {});
  persistAndEmit();
  return { ok: true };
}

export async function cancelBooking(id) {
  if (state.mode === "firebase") await fb.fsUpdate("bookings", id, { status: "cancelled" });
  else { const x = state.bookings.find((b) => b.id === id); if (x) x.status = "cancelled"; }
  persistAndEmit();
}

// ------------------------------------------------------------------
// KELOLA LAPANGAN
// ------------------------------------------------------------------
export async function addCourt(c) {
  if (state.mode === "firebase") await fb.fsAdd("courts", c);
  else { state.courts.push({ ...c, id: uid() }); persistAndEmit(); }
}
export async function updateCourt(id, patch) {
  if (state.mode === "firebase") await fb.fsUpdate("courts", id, patch);
  else { Object.assign(state.courts.find((c) => c.id === id) || {}, patch); persistAndEmit(); }
}

// ------------------------------------------------------------------
// TURNAMEN & LIVE SCORE
// ------------------------------------------------------------------
export function liveMatches() {
  return state.matches.filter((m) => m.status === "live");
}

export function matchLabel(m) {
  return m.round === 1 ? "8 Besar" : m.round === 2 ? "Semifinal" : "Final";
}

async function updateMatch(m, patch) {
  if (state.mode === "firebase") await fb.fsUpdate("matches", m.id, patch);
  else { Object.assign(m, patch); persistAndEmit(); }
}

export async function pointMatch(m, side, delta) {
  const cur = side === "A" ? "curA" : "curB";
  const val = Math.max(0, (m[cur] || 0) + delta);
  await updateMatch(m, { [cur]: val });
}

export async function winGame(m, side) {
  // Sisi yang menekan "Menang Gim" selalu tercatat sebagai pemenang gim,
  // dengan skor masuk akal dari poin berjalan (min. 21, selisih >= 2).
  let a = m.curA || 0, b = m.curB || 0;
  if (side === "A") { a = Math.max(21, b >= 19 ? b + 2 : 21, a); if (a - b < 2) a = b + 2; }
  else { b = Math.max(21, a >= 19 ? a + 2 : 21, b); if (b - a < 2) b = a + 2; }
  const games = [...(m.games || []), { a, b }];
  const patch = { games, curA: 0, curB: 0 };
  const winsA = games.filter((x) => x.a > x.b).length;
  const winsB = games.filter((x) => x.b > x.a).length;
  if (winsA >= 2 || winsB >= 2) {
    patch.status = "done";
    patch.winner = winsA >= 2 ? "A" : "B";
  }
  await updateMatch(m, patch);
  if (patch.winner) await advance(m, patch.winner);
}

export async function startMatch(m, courtId, time) {
  await updateMatch(m, { status: "live", courtId: courtId || m.courtId, time: time || m.time });
}

// Majukan pemenang ke bagan ronde berikutnya (realtime untuk semua perangkat)
async function advance(m, winner) {
  const teams = winner === "A" ? [m.teamA, m.teamB] : [m.teamB, m.teamA];
  const next = state.matches.find((x) => x.tournamentId === m.tournamentId && x.round === m.round + 1 && x.slot === Math.floor(m.slot / 2));
  if (!next) return;
  const side = m.slot % 2 === 0 ? "teamA" : "teamB";
  await updateMatch(next, { [side]: teams[0], status: next.teamA && next.teamB ? next.status : next.status });
}

export async function editTeam(m, side, name) {
  await updateMatch(m, { [`team${side}`]: name });
}

export async function updateMatchPublic(id, patch) {
  const m = state.matches.find((x) => x.id === id);
  if (m) await updateMatch(m, patch);
}

// ------------------------------------------------------------------
// PENGGUNA
// ------------------------------------------------------------------
export function setUser(u) {
  state.user = { ...state.user, ...u };
  localStorage.setItem(LS_USER, JSON.stringify(state.user));
  if (state.mode === "firebase" && state.user.uid && !state.user.guest)
    fb.fsSet("users", state.user.uid, { name: u.name ?? state.user.name, phone: u.phone ?? state.user.phone }).catch(() => {});
  emit();
}

export function myBookings() {
  const uidKey = state.user.uid;
  const p = (state.user.phone || "").replace(/\D/g, "");
  if (!uidKey && !p) return [];
  return state.bookings
    .filter((b) => (uidKey && b.ownerId === uidKey) ||
      (p && (b.phone || "").replace(/\D/g, "").endsWith(p.slice(-6))))
    .sort((a, b) => (b.date + pad2(b.startHour)).localeCompare(a.date + pad2(a.startHour)));
}

// ------------------------------------------------------------------
// SIMULATOR MODE DEMO — skor bergerak seperti Firestore realtime
// ------------------------------------------------------------------
function startSimulator() {
  setInterval(() => {
    if (state.mode !== "demo" || !navigator.onLine) return;
    let changed = false;
    for (const m of state.matches.filter((x) => x.status === "live")) {
      const side = Math.random() > 0.5 ? "curA" : "curB";
      m[side] = (m[side] || 0) + 1;
      const a = m.curA, b = m.curB;
      if ((a >= 21 || b >= 21) && Math.abs(a - b) >= 2) {
        m.games = [...(m.games || []), { a, b }];
        m.curA = 0; m.curB = 0;
        const wa = m.games.filter((x) => x.a > x.b).length;
        const wb = m.games.filter((x) => x.b > x.a).length;
        if (wa >= 2 || wb >= 2) {
          m.status = "done"; m.winner = wa >= 2 ? "A" : "B";
          const next = state.matches.find((x) => x.tournamentId === m.tournamentId
            && x.round === m.round + 1 && x.slot === Math.floor(m.slot / 2));
          if (next) {
            const t = m.winner === "A" ? m.teamA : m.teamB;
            if (m.slot % 2 === 0) next.teamA = t; else next.teamB = t;
          }
          const upNext = state.matches.find((x) => x.tournamentId === m.tournamentId
            && x.status === "scheduled" && x.teamA && x.teamB && !x.games?.length);
          if (upNext && Math.random() > 0.4) { upNext.status = "live"; }
        }
      }
      changed = true;
    }
    if (changed) persistAndEmit();
  }, 9000);
}
