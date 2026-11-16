// ============================================================
// app.js — bootstrap, router panel, chrome header/footer, SW.
// ============================================================
import { APP } from "./config.js";
import * as store from "./store.js";
import { $, toast, prettyDate, dateKey } from "./ui.js";
import { initAuthUI, renderAuthZone } from "./auth.js";
import { setGo } from "./router-shim.js";

import * as home from "./panels/home.js";
import * as booking from "./panels/booking.js";
import * as courts from "./panels/courts.js";
import * as tournament from "./panels/tournament.js";
import * as history from "./panels/history.js";
import * as admin from "./panels/admin.js";

const PANELS = { home, booking, courts, tournament, history, admin };
let current = "home";
let unsub = null;

function markActive(name) {
  document.querySelectorAll(".mainnav a, .mm-nav a").forEach((a) =>
    a.classList.toggle("on", a.dataset.nav === name));
  document.querySelectorAll(".tabbar button").forEach((b) =>
    b.classList.toggle("on", b.dataset.go === name));
}

function mountPanel(name, animate = true) {
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
  if (name !== current) mountPanel(name);
});

// ---- menu mobile ----
function buildMobileMenu() {
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
$("#brandHome").addEventListener("click", (e) => { e.preventDefault(); go("home"); });

// ---- chrome ----
function paintChrome() {
  const st = store.state;
  const tag = $("#modeTag");
  tag.textContent = st.mode === "firebase" ? "SERVER: FIRESTORE" : st.mode === "demo" ? "MODE DEMO" : "";
  $("#offlineBar").hidden = st.net;
  $("#utilDate").textContent = prettyDate(dateKey());
  const live = store.liveMatches();
  $("#utilTicker").textContent = live.length
    ? `● LIVE · ${live[0].teamA} vs ${live[0].teamB} — SRISP Open 2026`
    : `${APP.name} — ${APP.tagline}`;
  renderAuthZone();
  paintLogo();
}

function paintLogo() {
  const lg = store.logoData();
  const top = $("#topLogo");
  $("#brandSvg").hidden = !!lg;
  top.hidden = !lg;
  if (lg && top.getAttribute("src") !== lg) {
    top.src = lg;
    const fav = document.querySelector('link[rel="icon"]');
    if (fav) fav.href = lg;
  }
}

// ---- boot ----
async function boot() {
  initAuthUI();
  buildMobileMenu();
  const t0 = performance.now();
  await store.init();
  store.onChange(paintChrome);
  paintChrome();

  if (store.state.mode === "firebase") {
    store.watchAuth(() => paintChrome());   // sesi tamu anonim dibuat otomatis di store
  }

  const wait = Math.max(0, 500 - (performance.now() - t0));
  setTimeout(() => {
    $("#splash").classList.add("hide");
    setTimeout(() => $("#splash").remove(), 420);
    const name = location.hash.slice(1) || "home";
    mountPanel(PANELS[name] ? name : "home", false);
  }, wait);

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}

boot().catch((e) => { console.error(e); toast("Gagal memuat aplikasi.", "error"); });
