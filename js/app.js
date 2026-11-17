// ============================================================
// app.js — bootstrap tangguh: splash selalu hilang (watchdog),
// registrasi service worker lebih dulu, auto-reload saat update,
// init Firebase dengan timeout → fallback mode demo.
// ============================================================
import { APP } from "./config.js";
import * as store from "./store.js";
import { $, toast, prettyDate, dateKey, esc } from "./ui.js";
import { initAuthUI, renderAuthZone } from "./auth.js";
import { setGo } from "./router-shim.js";
import { openReferee } from "./referee.js";

import * as home from "./panels/home.js";
import * as booking from "./panels/booking.js";
import * as courts from "./panels/courts.js";
import * as tournament from "./panels/tournament.js";
import * as teams from "./panels/teams.js";
import * as history from "./panels/history.js";
import * as admin from "./panels/admin.js";

const PANELS = { home, booking, courts, tournament, teams, history, admin };
let current = "home";
let unsub = null;
let splashHidden = false;
const T0 = performance.now();

// ---- watchdog: splash tidak boleh lebih dari 3,5 detik ----
function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  const s = $("#splash");
  if (!s) return;
  s.classList.add("hide");
  setTimeout(() => s.remove(), 450);
  const name = location.hash.slice(1) || "home";
  if (!$("#p-home").innerHTML) mountPanel(PANELS[name] ? name : "home", false);
}
setTimeout(hideSplash, 3500);

// ---- service worker: daftar paling awal, bukan setelah init ----
function setupSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    if (reg.waiting) reg.waiting.postMessage("SKIP");
    reg.addEventListener("updatefound", () => {
      reg.installing?.addEventListener("statechange", () => {
        if (reg.installing.state === "installed" && navigator.serviceWorker.controller)
          reg.installing.postMessage?.("SKIP");
      });
    });
  }).catch(() => {});
}
setupSW();

function markActive(name) {
  document.querySelectorAll(".mainnav a, .mm-nav a").forEach((a) =>
    a.classList.toggle("on", a.dataset.nav === name));
  document.querySelectorAll(".tabbar button").forEach((b) =>
    b.classList.toggle("on", b.dataset.go === name));
}

function mountPanel(name, animate = true) {
  if ((name === "teams" || name === "history") &&
      !document.body.classList.contains("is-reg")) name = "home";
  const sec = $(`#p-${name}`);
  if (!sec) return;
  if (unsub) { unsub(); unsub = null; }
  for (const p of document.querySelectorAll(".panel")) p.classList.toggle("active", p === sec);
  current = name;
  markActive(name);
  if (animate) { sec.classList.remove("enter"); void sec.offsetWidth; sec.classList.add("enter"); }
  PANELS[name].render(sec);
  unsub = store.onChange(() => PANELS[name].update?.(sec));
}

function go(name) {
  if (!PANELS[name]) name = "home";
  if (location.hash !== `#${name}`) location.hash = `#${name}`;
  else mountPanel(name);
}
setGo(go);

window.addEventListener("hashchange", () => {
  const name = location.hash.slice(1) || "home";
  if (name.startsWith("wasit/")) { tryWasitRoute(); return; }
  if (name !== current) mountPanel(name);
});

// Rute #wasit/<idMatch>/<kode> — hasil scan QR: klaim + buka konsol otomatis
async function tryWasitRoute() {
  const [, id, code] = location.hash.split("/");
  if (!id || !code) { history.replaceState(null, "", "#home"); return; }
  let m = store.state.matches.find((x) => x.id === id);
  for (let i = 0; !m && i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    m = store.state.matches.find((x) => x.id === id);
  }
  if (!m) { toast("Pertandingan tidak ditemukan — buka aplikasi dari link yang sama setelah data termuat.", "error", 5000); history.replaceState(null, "", "#tournament"); return; }
  const r = await store.claimReferee(m, code);
  if (!r.ok) {
    toast(r.error, "error", 5200);
    const { openAuth } = await import("./auth.js");
    history.replaceState(null, "", "#tournament");
    openAuth("in");
    return;
  }
  history.replaceState(null, "", "#tournament");
  toast("Tersambung sebagai wasit — selamat memimpin!", "ok");
  openReferee(m);
}

function buildMobileMenu() {
  if ($(".mobile-menu") || !$("#mainnav") || !$("#hamburger")) return;
  const mm = document.createElement("div");
  mm.className = "mobile-menu";
  mm.innerHTML = `<div class="mm-sheet">
      <div class="mm-nav">${$("#mainnav").innerHTML}</div>
      <div class="mm-auth"></div>
    </div>`;
  document.body.append(mm);
  $("#hamburger").onclick = () => { mm.classList.add("open"); markActive(current); renderAuthZone(); };
  mm.addEventListener("click", (e) => {
    if (e.target === mm) mm.classList.remove("open");
    if (e.target.closest(".mm-nav a")) mm.classList.remove("open");
  });
}

document.querySelector(".tabbar")?.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-go]");
  if (b) go(b.dataset.go);
});
$("#brandHome")?.addEventListener("click", (e) => { e.preventDefault(); go("home"); });
$("#modeTag")?.addEventListener("click", () => go("admin"));

function paintChrome() {
  const st = store.state;
  const tag = $("#modeTag");
  if (tag) tag.textContent = `v${APP.version}` + (st.mode === "firebase"
    ? st.localMirror ? " · DATA CADANGAN" : " · LIVE"
    : st.mode === "demo" ? " · MODE LOKAL" : "");
  const ob = $("#offlineBar"); if (ob) ob.hidden = st.net;
  const ud = $("#utilDate"); if (ud) ud.textContent = prettyDate(dateKey());
  const tk = $("#utilTicker");
  if (tk) {
    const live = store.liveMatches();
    const set = store.settingsData();
    tk.textContent = live.length ? `● LIVE · ${live[0].teamA} vs ${live[0].teamB}`
      : set.announcement ? `📣 ${set.announcement}` : `Buka ${set.openHours}`;
  }
  // Mode tamu: Riwayat/Tim hanya untuk akun terdaftar; Kelola hanya pengelola
  const u = st.user, demo = st.mode === "demo";
  document.body.classList.toggle("is-reg", demo || (!!u.email && !u.guest));
  document.body.classList.toggle("is-staff", demo || store.isStaff());
  const set = store.settingsData();
  const nm = set.appName || APP.name;
  const ini = (set.brandShort || nm.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 4));
  document.body.classList.toggle("brand-italic", set.brandItalic !== false);
  document.querySelectorAll(".brand-big").forEach((el) => {
    const em = el.querySelector(".brand-small");
    if (em) { if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = ini; else el.prepend(ini); em.textContent = nm; }
    else el.textContent = ini;
  });
  document.querySelectorAll(".brand-small").forEach((el) => {
    if (!el.closest(".brand-big")) el.textContent = nm;
  });
  const fv = $("#footVenue"); if (fv) fv.textContent = set.venueName;
  const fa = $("#footAddr"); if (fa) fa.textContent = set.address;
  const fk = $("#footKontak");
  if (fk) fk.innerHTML = (set.contactWA ? `Kontak: ${esc(set.contactWA)}` : "") +
    (set.contactEmail ? ` · ${esc(set.contactEmail)}` : "") +
    (set.contactWA || set.contactEmail ? "<br>" : "");
  renderAuthZone();
  paintLogo();
}

function paintLogo() {
  const top = $("#topLogo"), fav = document.querySelector('link[rel="icon"]');
  if (!top) return;
  const lg = store.logoData();
  const mark = $("#brandMark");
  if (mark) mark.hidden = !lg;
  top.hidden = !lg;
  if (lg && top.getAttribute("src") !== lg) {
    top.src = lg;
    if (fav) fav.href = lg;
  }
  const sp = $("#splashLogo");
  if (sp && lg) { sp.src = lg; sp.hidden = false; }
}

async function boot() {
  const sv = $("#splashVer"); if (sv) sv.textContent = "v" + APP.version;
  try {  // tampilkan logo upload di splash SEBELUM server sempat merespons
    const lg0 = localStorage.getItem("srisp_logo");
    if (lg0) { const im = $("#splashLogo"); if (im) { im.src = lg0; im.hidden = false; } }
  } catch {}
  try { initAuthUI(); } catch (e) { console.error("auth UI:", e); }
  buildMobileMenu();
  try {
    await store.init();
    store.onChange(paintChrome);
    paintChrome();
    if (store.state.mode === "firebase") store.watchAuth(() => paintChrome());
  } catch (e) {
    console.error(e);
    toast("Koneksi ke server bermasalah — memakai data lokal.", "error");
  }
  if (location.hash.startsWith("#wasit/")) tryWasitRoute();
  const t0 = performance.now();
  setTimeout(hideSplash, Math.max(150, 500 - (t0 - T0)));
}

boot();
