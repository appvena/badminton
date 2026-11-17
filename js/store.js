// ============================================================
// store.js — Lapisan data tunggal untuk aplikasi.
// Mode Firebase : Firestore collections + onSnapshot (realtime).
// Mode Demo     : localStorage + simulator skor agar live score
//                 tetap dapat dilihat tanpa proyek Firebase.
// ============================================================
import { APP } from "./config.js";
import { SETTINGS_DEFAULTS } from "./config.js";
import * as fb from "./firebase.js";
import { dateKey, pad2 } from "./ui.js";

const LS_DB = "srisp_db_v1";
const LS_USER = "srisp_user_v1";
const LS_LOGO = "srisp_logo";

export const state = {
  mode: "boot",           // boot | demo | firebase
  courts: [], bookings: [], tournaments: [], matches: [], settings: [],
  teams: [], chat: [], _chatUnsub: null, _chatTeam: "",
  user: loadJSON(LS_USER, { name: "", phone: "", admin: false, uid: "" }),
  net: navigator.onLine,
  ready: false,
  localMirror: false,   // true = memakai cadangan lokal krn server belum berisi data
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
    id: t1, name: "BWF Open 2026", startDate: today,
    endDate: dateKey(new Date(Date.now() + 2 * 864e5)),
    format: "Tunggal Putra — Sistem Bagan (8 Besar)", status: "live", venue: "BWF Hall",
  }];
  return { courts, bookings, tournaments, matches };
}

// Bila 3,5 dtk setelah init server masih belum mengirim data (rules belum
// publish / DB belum dibuat / koneksi lambat), tampilkan salinan lokal agar
// aplikasi tetap dapat dicoba. Tulis tetap ke server — gagal = pesan jelas.
function applyFallbackData() {
  if (state.mode !== "firebase" || state.courts.length) return;
  const s = seed();
  state.courts = s.courts; state.bookings = s.bookings;
  state.tournaments = s.tournaments; state.matches = s.matches;
  state.localMirror = true; emit();
}

function getDB() {
  let db = loadJSON(LS_DB, null);
  if (!db || !db.courts) { db = seed(); saveDB(db); }
  if ((db.tournaments || [])[0]?.name === "SRISP Open 2026") {
    db.tournaments[0].name = "BWF Open 2026"; db.tournaments[0].venue = "BWF Hall";
  }
  if (!db.teams) {
    db.teams = [{ id: "tm1", name: "PB Rajawali Muda", code: "SRISP1",
      ownerUid: "demo", ownerName: "Anda", createdAt: Date.now(),
      memberUids: ["demo"], members: [{ uid: "demo", name: "Anda", role: "Pemilik" }] }];
    db.messages = { tm1: [{ id: "msg1", teamId: "tm1", uid: "demo", name: "Anda",
      text: "Besok latihan jam 16.00 di Lapangan B ya!", at: Date.now() - 3600e3 }] };
    db.settings = {};
    saveDB(db);
  }
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
    const bind = (coll, key) => fb.fsSubscribe(coll, (rows) => {
      // Snapshot kosong tidak boleh menghapus data cadangan lokal; begitu
      // server benar-benar berisi, data server mengambil alih.
      if (key !== "settings" && !rows.length && state.localMirror) return;
      if (rows.length && key !== "settings") state.localMirror = false;
      state[key] = rows; emit();
    });
    bind("courts", "courts"); bind("bookings", "bookings");
    bind("tournaments", "tournaments"); bind("matches", "matches");
    bind("teams", "teams");
    bind("settings", "settings");
    state.ready = true; emit();
    try { await seedIfEmpty(); } catch (e) { console.warn("seed awal:", e.code || e.message); }
    setTimeout(applyFallbackData, 3500);
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
    if (s) {
      const lg = s.logo || "";
      lg ? localStorage.setItem(LS_LOGO, lg) : localStorage.removeItem(LS_LOGO);
      return lg;
    }
    return localStorage.getItem(LS_LOGO) || "";  // mirror — splash tampil cepat
  }
  return localStorage.getItem(LS_LOGO) || "";
}

export async function setLogo(dataURL) {
  if (state.mode === "firebase") {
    await fb.fsSet("settings", "app", { logo: dataURL || "", updatedAt: Date.now() });
    dataURL ? localStorage.setItem(LS_LOGO, dataURL) : localStorage.removeItem(LS_LOGO);
  } else if (dataURL) localStorage.setItem(LS_LOGO, dataURL);
  else localStorage.removeItem(LS_LOGO);
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
  state.teams = db.teams;
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
  if (state.mode === "firebase" && !state.localMirror) {
    try {
      const rows = await fb.fsQuery("bookings", [["courtId", "==", b.courtId], ["date", "==", b.date]]);
      conflicts = rows.filter(clash);
    } catch (e) { conflicts = state.bookings.filter(clash); }
  } else {
    conflicts = state.bookings.filter(clash);
  }
  if (conflicts.length)
    return { ok: false, error: `Bentrok dengan pesanan ${pad2(conflicts[0].startHour)}.00–${pad2(conflicts[0].endHour)}.00. Pilih slot lain.` };

  const doc = { courtId: b.courtId, date: b.date, startHour: b.start, endHour: b.end, name: b.name, phone: b.phone, note: b.note || "", status: "active", createdAt: Date.now() };
  if (state.mode === "firebase") {
    if (state.user.uid) doc.ownerId = state.user.uid;
    try {
      await fb.fsAdd("bookings", doc);
    } catch (e) {
      return { ok: false, error: e.code === "permission-denied"
        ? "Server belum menerima tulisan: Rules Firestore belum dipublikasikan / database belum dibuat. Selesaikan pengaturan Console lalu pesan ulang."
        : "Gagal menyimpan pesanan (" + (e.code || e.message) + ")." };
    }
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

export function advanceWinner(m, winner) { return advance(m, winner); }

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

// ------------------------------------------------------------------
// PENGATURAN APLIKASI (superadmin) — nama venue, alamat, kontak
// ------------------------------------------------------------------
export function settingsData() {
  let extra = {};
  if (state.mode === "firebase") {
    const s = state.settings.find((x) => x.id === "app");
    if (s) extra = s;
  } else extra = getDB().settings || {};
  return { ...SETTINGS_DEFAULTS, ...extra };
}

export async function saveAppSettings(patch) {
  if (state.mode === "firebase") {
    await fb.fsSet("settings", "app", { ...patch, updatedAt: Date.now() });
  } else {
    const db = getDB();
    db.settings = { ...(db.settings || {}), ...patch };
    saveDB(db);
  }
  emit();
}

// ------------------------------------------------------------------
// TIM — satu pengguna terdaftar bisa punya/masuk banyak tim
// ------------------------------------------------------------------
const meUid = () => state.user.uid || (state.mode === "demo" ? "demo" : "");

function requireAccount() {
  if (state.mode !== "firebase") return null;             // demo selalu boleh
  if (!state.user.uid || state.user.guest || !state.user.email)
    return "Fitur tim membutuhkan akun terdaftar — silakan Masuk/Daftar.";
  return null;
}

export function myTeams() {
  const me = meUid();
  return state.teams.filter((t) => (t.memberUids || []).includes(me));
}
export function teamById(id) { return state.teams.find((t) => t.id === id) || null; }

export async function createTeam(name) {
  const err = requireAccount(); if (err) return { ok: false, error: err };
  name = String(name || "").trim();
  if (name.length < 3) return { ok: false, error: "Nama tim minimal 3 karakter." };
  const me = meUid();
  const code = Math.random().toString(36).slice(2, 7).toUpperCase();
  const mem = { uid: me, name: state.user.name || state.user.email || "Pemilik", role: "Pemilik" };
  if (state.mode === "firebase") {
    try { await fb.fsAdd("teams", { name, code, ownerUid: me, ownerName: mem.name, memberUids: [me], members: [mem], createdAt: Date.now() }); }
    catch (e) { return { ok: false, error: "Gagal menyimpan tim (" + (e.code || e.message) + ")." }; }
  } else {
    const db = getDB();
    db.teams.push({ id: uid(), name, code, ownerUid: me, ownerName: mem.name, memberUids: [me], members: [mem], createdAt: Date.now() });
    saveDB(db); state.teams = db.teams;
  }
  emit();
  return { ok: true, code };
}

export async function joinTeam(code) {
  const err = requireAccount(); if (err) return { ok: false, error: err };
  code = String(code || "").trim().toUpperCase();
  const t = state.teams.find((x) => (x.code || "").toUpperCase() === code);
  if (!t) return { ok: false, error: "Kode tim tidak ditemukan." };
  const me = meUid();
  if ((t.memberUids || []).includes(me)) return { ok: false, error: "Anda sudah menjadi anggota tim itu." };
  const mem = { uid: me, name: state.user.name || state.user.email || "Anggota", role: "Anggota" };
  const memberUids = [...(t.memberUids || []), me];
  const members = [...(t.members || []), mem];
  if (state.mode === "firebase") {
    try { await fb.fsUpdate("teams", t.id, { memberUids, members }); }
    catch (e) { return { ok: false, error: "Gagal bergabung (" + (e.code || e.message) + ")." }; }
  } else {
    const db = getDB();
    const x = db.teams.find((y) => y.id === t.id);
    x.memberUids = memberUids; x.members = members;
    saveDB(db); state.teams = db.teams;
  }
  emit();
  return { ok: true, name: t.name };
}

// ------------------------------------------------------------------
// CHAT antar anggota tim
// ------------------------------------------------------------------
export function openChat(teamId) {
  closeChat();
  state._chatTeam = teamId;
  if (state.mode === "firebase" && teamId) {
    state.chat = [];
    state._chatUnsub = fb.fsSubscribeQ("messages", [["teamId", "==", teamId]], (rows) => {
      state.chat = rows; emit();
    });
  } else if (teamId) {
    state.chat = ((getDB().messages || {})[teamId] || []).slice().sort((a, b) => a.at - b.at);
    emit();
  }
}
export function closeChat() {
  if (state._chatUnsub) { state._chatUnsub(); state._chatUnsub = null; }
  state._chatTeam = ""; state.chat = [];
}

export async function sendChat(teamId, text) {
  text = String(text || "").trim();
  if (!text) return { ok: false };
  const err = requireAccount(); if (err) return { ok: false, error: err };
  const msg = { teamId, uid: meUid(), name: state.user.name || state.user.email || "Anggota", text, at: Date.now() };
  if (state.mode === "firebase") {
    try { await fb.fsAdd("messages", msg); }
    catch (e) { return { ok: false, error: "Pesan gagal dikirim (" + (e.code || e.message) + ")." }; }
  } else {
    const db = getDB();
    db.messages = db.messages || {};
    (db.messages[teamId] = db.messages[teamId] || []).push({ id: uid(), ...msg });
    saveDB(db);
    if (state._chatTeam === teamId) openChat(teamId);
  }
  return { ok: true };
}

// ------------------------------------------------------------------
// TANDING MANDIRI antar tim (dikelola pembuatnya, publik bisa melihat)
// ------------------------------------------------------------------
export async function createPrivateMatch(v) {
  const err = requireAccount(); if (err) return { ok: false, error: err };
  if (!v.teamA?.trim() || !v.teamB?.trim()) return { ok: false, error: "Nama kedua tim wajib diisi." };
  if (v.start == null) return { ok: false, error: "Pilih jam tanding." };
  const doc = {
    scope: "private", hostUid: meUid(),
    refCode: Math.random().toString(36).slice(2, 7).toUpperCase(), refUids: [], hostName: state.user.name || state.user.email || "Tuan rumah",
    teamA: v.teamA.trim(), teamB: v.teamB.trim(),
    playersA: v.playersA || [], playersB: v.playersB || [], courtId: v.courtId || "",
    date: v.date, startHour: v.start, endHour: (v.start + (v.hours || 1)), time: pad2(v.start) + ".00",
    format: v.format || "Gim 21 — best of 3", status: "scheduled",
    games: [], curA: 0, curB: 0, winner: "", round: 0, slot: Date.now() % 100000,
  };
  if (state.mode === "firebase") {
    try { await fb.fsAdd("matches", doc); }
    catch (e) { return { ok: false, error: "Gagal membuat tanding (" + (e.code || e.message) + ")." }; }
  } else {
    doc.id = uid();
    state.matches.push(doc);
    if (state.mode === "demo") persistAndEmit(); else { const db = getDB(); db.matches = state.matches; saveDB(db); }
  }
  emit();
  return { ok: true };
}

export function communityMatches(showPast = false) {
  const now = Date.now();
  return state.matches
    .filter((m) => m.scope === "private")
    .filter((m) => showPast || m.status !== "done" || (m.endTs || 0) > now - 24 * 3600e3)
    .sort((a, b) => (b.slot || 0) - (a.slot || 0));
}

export function myHostedMatches() {
  const me = meUid();
  return communityMatches(true).filter((m) => m.hostUid === me);
}

// ---- Klaim WASIT lewat kode (sinkron dengan uid penebak kode) ----
export async function claimReferee(m, code) {
  const err = requireAccount();
  if (err) return { ok: false, error: err + " (wasit perlu akun agar skornya tercatat atas namanya)" };
  if (!m) return { ok: false, error: "Pertandingan tidak ditemukan." };
  code = String(code || "").trim().toUpperCase();
  if (!m.refCode || m.refCode !== code) return { ok: false, error: "Kode wasit tidak cocok." };
  const me = meUid();
  if ((m.refUids || []).includes(me)) return { ok: true, m };
  try {
    await updateMatch(m, { refUids: [...(m.refUids || []), me] });
    return { ok: true, m };
  } catch (e) {
    return { ok: false, error: "Gagal masuk sebagai wasit: " + (e.code || e.message) +
      " (publikasikan rules terbaru)" };
  }
}
export function findMatchByRefCode(code) {
  code = String(code || "").trim().toUpperCase();
  if (code.length < 4) return null;
  const hits = state.matches.filter((m) => m.refCode === code);
  if (!hits.length) return null;
  return hits.find((m) => m.status === "live") || hits.find((m) => m.status === "scheduled") || hits[0];
}

// Buat/ambil kode wasit suatu pertandingan (dipakai pengelola)
export async function ensureRefCode(m) {
  if (m.refCode) return m.refCode;
  const c = Math.random().toString(36).slice(2, 7).toUpperCase();
  await updateMatch(m, { refCode: c, refUids: m.refUids || [] });
  return c;
}
// Cabut diri sebagai wasit (hanya menghapus uid sendiri dari refUids)
export async function withdrawReferee(m) {
  const me = meUid();
  if (!(m.refUids || []).includes(me)) return { ok: false, error: "Anda bukan wasit pertandingan ini." };
  try {
    await updateMatch(m, { refUids: m.refUids.filter((u) => u !== me) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Gagal mencabut: " + (e.code || e.message) };
  }
}
export const isRefOf = (m) => {
  const me = meUid();
  return !!(me && (m.refUids || []).includes(me));
};
