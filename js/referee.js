// ============================================================
// referee.js — KONSOL WASIT: layar khusus (bisa fullscreen) untuk
// menghitung skor per reli. Seketuk = poin. Model badminton resmi:
// reli point, gim s/d 21 (deuce 2-selisih, batas 30), best of 3.
// Setiap perubahan ditulis ke server → semua penonton live-terupdate.
// ============================================================
import * as store from "./store.js";
import { toast } from "./ui.js";
import { courtName } from "./ui-helpers.js";
import qrcode from "./vendor/qrcode.js";

let root = null, mid = "", L = null, onKey = null;

const fresh = () => store.state.matches.find((x) => x.id === mid) || null;

export function openReferee(m) {
  if (!m) return;
  closeReferee();
  mid = m.id;
  L = {
    a: m.curA || 0, b: m.curB || 0, games: (m.games || []).slice(),
    status: m.status || "scheduled", winner: m.winner || "",
    serve: "", last: "",
  };
  root = document.createElement("div");
  root.id = "refOverlay";
  root.className = "ref";
  root.innerHTML = `
    <header class="ref-head">
      <span class="ref-meta" id="refMeta"></span>
      <span class="tag" id="refStat"></span>
      <div class="ref-tools">
        <button data-ref="undo" title="Batalkan poin terakhir">↺ Undo</button>
        <button data-ref="fs" title="Layar penuh (F)">⛶ Layar Penuh</button>
        <button data-ref="exit" class="x" title="Keluar (Esc)">✕</button>
      </div>
    </header>
    <div class="ref-body">
      <div class="ref-side" data-side="A">
        <span class="ref-serve" id="srvA" hidden>◆ servis</span>
        <h2 id="nmA"></h2>
        <div class="ref-players" id="plaA"></div>
        <div class="ref-score" id="scA">0</div>
        <div class="ref-flag" id="flA"></div>
        <button class="ref-minus" data-minus="A">−1</button>
      </div>
      <div class="ref-center">
        <div id="refGame">GIM 1</div>
        <div class="ref-dots" id="refDots"></div>
        <p>ketuk sisi = reli menang</p>
      </div>
      <div class="ref-side" data-side="B">
        <span class="ref-serve" id="srvB" hidden>◆ servis</span>
        <h2 id="nmB"></h2>
        <div class="ref-players" id="plaB"></div>
        <div class="ref-score" id="scB">0</div>
        <div class="ref-flag" id="flB"></div>
        <button class="ref-minus" data-minus="B">−1</button>
      </div>
    </div>
    <footer class="ref-hint">Keyboard: A = poin kiri · L = poin kanan · Backspace = undo · F = layar penuh · Esc = keluar</footer>`;
  document.body.append(root);
  document.body.classList.add("ref-open");

  root.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-ref],[data-minus]");
    if (t?.dataset.minus) return point(t.dataset.minus, -1);
    if (t?.dataset.ref === "undo") return L.last ? point(L.last, -1, true) : 0;
    if (t?.dataset.ref === "fs") return toggleFs();
    if (t?.dataset.ref === "exit") return closeReferee();
    const side = e.target.closest(".ref-side")?.dataset.side;
    if (side) point(side, 1);
  });

  onKey = (e) => {
    if (e.target.matches("input,textarea,select")) return;
    const k = e.key.toLowerCase();
    if (k === "a") point("A", 1);
    else if (k === "l") point("B", 1);
    else if (k === "backspace") { e.preventDefault(); L.last && point(L.last, -1, true); }
    else if (k === "f") toggleFs();
    else if (k === "escape") closeReferee();
  };
  document.addEventListener("keydown", onKey);
  paint();
}

// ---- reli: +1 / -1 dengan deteksi gim & pertandingan ----
async function point(side, delta, isUndo = false) {
  const m = fresh();
  if (!m) return closeReferee();
  if (L.status === "done") return toast("Pertandingan sudah selesai.", "error");
  if (delta < 0 && L[side === "A" ? "a" : "b"] <= 0) return;
  if (L.status === "scheduled") {
    L.status = "live";
    await store.startMatch(m, m.courtId, m.time).catch(() => {});
  }
  if (side === "A") L.a = Math.max(0, L.a + delta); else L.b = Math.max(0, L.b + delta);
  if (delta > 0) { L.serve = side; L.last = side; }
  if (isUndo) L.serve = side === "A" ? "B" : "A";

  const p = { curA: L.a, curB: L.b, status: "live" };
  const won = side === "A"
    ? ((L.a >= 21 && L.a - L.b >= 2) || L.a === 30)
    : ((L.b >= 21 && L.b - L.a >= 2) || L.b === 30);
  let matchDone = false;
  if (won && delta > 0 && L.a + L.b > 0 && Math.abs(L.a - L.b) >= (Math.max(L.a, L.b) === 30 ? 1 : 2)) {
    L.games = [...L.games, { a: L.a, b: L.b }];
    L.a = 0; L.b = 0;
    const wa = L.games.filter((g) => g.a > g.b).length;
    const wb = L.games.filter((g) => g.b > g.a).length;
    Object.assign(p, { games: L.games, curA: 0, curB: 0 });
    if (wa >= 2 || wb >= 2) {
      matchDone = true;
      L.status = "done"; L.winner = wa >= 2 ? "A" : "B";
      Object.assign(p, { status: "done", winner: L.winner, endTs: Date.now() });
    }
  }
  paint();
  try { await store.updateMatchPublic(mid, p); }
  catch (e) { toast("Gagal menulis ke server: " + (e.code || e.message), "error", 4200); }
  if (matchDone && m.round > 0)
    store.advanceWinner(fresh(), L.winner).catch(() => {});
}

// ---- status tambahan (deuce / game & match point) ----
function flagFor(a, b, games) {
  const wa = games.filter((g) => g.a > g.b).length, wb = games.filter((g) => g.b > g.a).length;
  const mine = a, other = b;
  if (mine >= 20 && mine - other >= 1)
    return (wa === 2 || wb === 2) ? "MATCH POINT" : "GAME POINT";
  if (a >= 20 && a === b) return "DEUCE";
  return "";
}

function paint() {
  const m = fresh() || { teamA: "?", teamB: "?", courtId: "", time: "" };
  const q = (s) => root.querySelector(s);
  q("#refMeta").textContent =
    `${m.round > 0 ? store.matchLabel(m) : "TANDING"} · ${m.teamA || "?"} vs ${m.teamB || "?"} · ${courtName(m.courtId)}${m.time ? " · " + m.time : ""}`;
  const st = q("#refStat");
  st.textContent = L.status === "live" ? "● LIVE" : L.status === "done" ? "SELESAI" : "SIAP — KETUK UNTUK MULAI";
  st.className = "tag st-" + L.status + (L.status === "live" ? " blink" : "");
  q("#nmA").textContent = m.teamA || "Tim A";
  q("#nmB").textContent = m.teamB || "Tim B";
  q("#plaA").textContent = (m.playersA || []).join(" · ");
  q("#plaB").textContent = (m.playersB || []).join(" · ");
  setScore("#scA", L.a); setScore("#scB", L.b);
  q("#srvA").hidden = L.serve !== "A"; q("#srvB").hidden = L.serve !== "B";
  q("#refGame").textContent = L.status === "done"
    ? `SELESAI — ${L.winner === "A" ? m.teamA : m.teamB}` : `GIM ${L.games.length + 1}`;
  q("#refDots").innerHTML = L.games.map((g) => `<b>${g.a}–${g.b}</b>`).join("");
  const wa = L.games.filter((g) => g.a > g.b).length, wb = L.games.filter((g) => g.b > g.a).length;
  q("#flA").textContent = L.status === "live" ? (flagFor(L.a, L.b, L.games) && L.a >= L.b ? flagFor(L.a, L.b, L.games) : "") : "";
  q("#flB").textContent = L.status === "live" ? (flagFor(L.b, L.a, L.games) && L.b > L.a ? flagFor(L.b, L.a, L.games) : "") : "";
  if (L.status === "done") {
    q("#flA").textContent = L.winner === "A" ? "JUARA" : "";
    q("#flB").textContent = L.winner === "B" ? "JUARA" : "";
    q(".ref-body").classList.add("ended");
  }
}

let prev = { A: -1, B: -1 };
function setScore(sel, v) {
  const el = root.querySelector(sel);
  if (!el) return;
  const s = sel === "#scA" ? "A" : "B";
  el.textContent = v;
  if (v !== prev[s]) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); prev[s] = v; }
}

function toggleFs() {
  if (!document.fullscreenElement) root.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.().catch(() => {});
}

export function closeReferee() {
  if (!root) return;
  document.removeEventListener("keydown", onKey);
  root.remove(); root = null; mid = ""; prev = { A: -1, B: -1 };
  document.body.classList.remove("ref-open");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

// ============================================================
// MODE TAYANG — layar besar publik (bisa fullscreen, rotasi
// otomatis antar pertandingan live). Tamu cukup menekan tombol,
// tanpa login apa pun.
// ============================================================
let show = null, showI = 0, showT = null, showU = null;

export function openShow() {
  closeShow();
  show = document.createElement("div");
  show.id = "showOverlay";
  show.className = "ref show-mode";
  show.innerHTML = `
    <header class="ref-head">
      <span class="ref-meta" id="shMeta">SKOR LANGSUNG</span>
      <span class="tag blink">● REALTIME</span>
      <div class="ref-tools">
        <button data-sh="fs">⛶ Layar Penuh</button>
        <button data-sh="exit" class="x">✕</button>
      </div>
    </header>
    <div class="ref-body">
      <div class="ref-side"><h2 id="shA"></h2><div class="ref-players" id="shPA"></div><div class="ref-score" id="shSCA">0</div><div class="ref-flag" id="shGA"></div></div>
      <div class="ref-center"><div id="shGame">—</div><div class="ref-dots" id="shDots"></div><p id="shSub"></p></div>
      <div class="ref-side"><h2 id="shB"></h2><div class="ref-players" id="shPB"></div><div class="ref-score" id="shSCB">0</div><div class="ref-flag" id="shGB"></div></div>
    </div>
    <footer class="ref-hint">Tampilan publik — skor diperbarui otomatis di semua perangkat</footer>`;
  document.body.append(show);
  document.body.classList.add("ref-open");
  show.addEventListener("click", (e) => {
    const t = e.target.closest("[data-sh]");
    if (!t) return;
    if (t.dataset.sh === "exit") closeShow();
    else if (!document.fullscreenElement) show.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  });
  showU = store.onChange(paintShow);
  paintShow();
  showT = setInterval(() => { showI++; paintShow(); }, 9000);
}

function paintShow() {
  if (!show) return;
  const q = (s) => show.querySelector(s);
  const live = store.state.matches.filter((m) => m.status === "live");
  const arr = live.length ? live :
    store.state.matches.filter((m) => m.status === "scheduled").slice(0, 4);
  if (!arr.length) {
    q("#shMeta").textContent = "SKOR LANGSUNG";
    q("#shA").textContent = "—"; q("#shB").textContent = "";
    q("#shSCA").textContent = ""; q("#shSCB").textContent = "";
    q("#shGame").textContent = "BELUM ADA PERTANDINGAN";
    q("#shDots").innerHTML = ""; q("#shSub").textContent = "Pantau halaman ini — skor muncul otomatis saat wasit memulai.";
    return;
  }
  const m = arr[showI % arr.length];
  const label = m.scope === "private" ? "TANDING KOMUNITAS" : store.matchLabel(m);
  q("#shMeta").textContent = `${label} · ${m.teamA || "?"} vs ${m.teamB || "?"}`;
  q("#shA").textContent = m.teamA || "?";
  q("#shB").textContent = m.teamB || "?";
  q("#shPA").textContent = (m.playersA || []).join(" · ");
  q("#shPB").textContent = (m.playersB || []).join(" · ");
  q("#shSCA").textContent = m.curA ?? 0;
  q("#shSCB").textContent = m.curB ?? 0;
  const g = (m.games || []);
  q("#shGame").textContent = m.status === "live" ?
    `GIM ${g.length + 1}` : (m.status === "done" ?
      `SELESAI — ${m.winner === "A" ? m.teamA : m.teamB}` : "TERJADWAL");
  q("#shDots").innerHTML = g.map((x) => `<b>${x.a}–${x.b}</b>`).join("");
  const a = m.curA || 0, b = m.curB || 0;
  q("#shGA").textContent = m.status === "live" && a >= 20 && a - b >= 1 ? "GAME POINT" : a >= 20 && a === b ? "DEUCE" : "";
  q("#shGB").textContent = m.status === "live" && b >= 20 && b - a >= 1 ? "GAME POINT" : "";
  q("#shSub").textContent = `${courtName(m.courtId)}${m.time ? " · " + m.time : ""} · ${m.scope === "private" ? "diselenggarakan " + (m.hostName || "tim") : "SRISP Open 2026"}`;
}

export function closeShow() {
  if (!show) return;
  clearInterval(showT);
  if (showU) showU();
  show.remove(); show = null; showI = 0;
  if (!document.getElementById("refOverlay")) document.body.classList.remove("ref-open");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

// ============================================================
// QR SAMBUNG WASIT — wasit scan dengan kamera HP => perangkatnya
// langsung terbuka konsol partai ini (rute #wasit/<id>/<kode>).
// ============================================================
export function refLink(m) {
  return `${location.origin}/#wasit/${m.id}/${m.refCode}`;
}
let qrOv = null;
export function showRefQR(m) {
  if (qrOv) { qrOv.remove(); qrOv = null; }
  if (!m) return;
  if (!m.refCode) { toast("Buat kode wasit dulu (tombol 🎯).", "error"); return; }
  const qr = qrcode(0, "M");
  qr.addData(refLink(m));
  qr.make();
  const escT = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  qrOv = document.createElement("div");
  qrOv.className = "modal-wrap";
  qrOv.innerHTML = `
    <div class="modal qr-modal">
      <h3>QR Sambung Wasit</h3>
      <p>${escT(m.teamA || "?")} vs ${escT(m.teamB || "?")} — wasit memindai kode ini dengan
      kamera HP, lalu cukup masuk akunnya; konsol partai ini langsung terbuka di perangkatnya.</p>
      <div class="qr-img">${qr.createSvgTag({ cellSize: 5, margin: 2 })}</div>
      <div class="qr-link"><code>${escT(refLink(m))}</code>
        <button class="btn ghost sm" data-qrcopy>Salin tautan</button></div>
      <p class="muted">Kode manual: <b>${escT(m.refCode)}</b> — dapat dipakai lewat tombol 🎮 di kartu pertandingan.</p>
      <button class="btn primary block" data-qrclose>Selesai</button>
    </div>`;
  document.body.append(qrOv);
  qrOv.addEventListener("click", async (e) => {
    if (e.target === qrOv || e.target.closest("[data-qrclose]")) { qrOv.remove(); qrOv = null; return; }
    if (e.target.closest("[data-qrcopy]")) {
      try { await navigator.clipboard.writeText(refLink(m)); toast("Tautan wasit disalin.", "ok"); }
      catch { toast(refLink(m), "ok", 6000); }
    }
  });
}
