// ============================================================
// app.js — bootstrap, router panel dengan transisi ringan,
// registrasi service worker.
// ============================================================
import { APP } from "./config.js";
import * as store from "./store.js";
import { $, toast } from "./ui.js";

import * as home from "./panels/home.js";
import * as booking from "./panels/booking.js";
import * as courts from "./panels/courts.js";
import * as tournament from "./panels/tournament.js";
import * as history from "./panels/history.js";
import * as admin from "./panels/admin.js";

const PANELS = {
  home, booking, courts, tournament, history, admin,
};

let current = "home";
let unsub = null;

function mountPanel(name, animate = true) {
  const sec = $(`#p-${name}`);
  if (!sec) return;
  // Bersihkan panel sebelumnya
  if (unsub) { unsub(); unsub = null; }
  for (const p of document.querySelectorAll(".panel")) {
    p.classList.toggle("active", p === sec);
  }
  document.querySelectorAll(".tabbar button").forEach((b) =>
    b.classList.toggle("on", b.dataset.go === name));
  current = name;
  if (animate) { sec.classList.remove("enter"); void sec.offsetWidth; sec.classList.add("enter"); }
  PANELS[name].render(sec);
  unsub = store.onChange(() => PANELS[name].update?.(sec));
}

function go(name) {
  if (!PANELS[name]) name = "home";
  if (location.hash !== `#${name}`) location.hash = `#${name}`;
  else mountPanel(name);
}
import { setGo } from "./router-shim.js";
setGo(go);

window.addEventListener("hashchange", () => {
  const name = location.hash.slice(1) || "home";
  if (name !== current) mountPanel(name);
});

document.querySelector(".tabbar").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-go]");
  if (b) go(b.dataset.go);
});
$("#brandHome").addEventListener("click", () => go("home"));
$("#btnUser").addEventListener("click", () => go("history"));

// ---- chrome atas: mode + koneksi + nama pengguna ----
function paintChrome() {
  const tag = $("#modeTag");
  tag.textContent = store.state.mode === "firebase" ? "FIREBASE" : store.state.mode === "demo" ? "DEMO" : "";
  tag.className = "tag " + (store.state.mode === "firebase" ? "tag-fb" : "tag-demo");
  const dot = $("#netDot");
  dot.className = "netdot " + (store.state.net ? "on" : "off");
  dot.title = store.state.net ? "Terhubung" : "Luring";
  $("#offlineBar").hidden = store.state.net;
  $("#userName").textContent = store.state.user.name || (store.state.user.admin ? "Pengelola" : "Tamu");
}

// ---- boot ----
async function boot() {
  $("#copyright").textContent = `${APP.copyright} · ${APP.tagline}`;
  const t0 = performance.now();
  await store.init();
  store.onChange(paintChrome);
  paintChrome();

  // splash minimal 550ms agar transisi terasa, lalu hilang
  const wait = Math.max(0, 550 - (performance.now() - t0));
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

boot().catch((e) => {
  console.error(e);
  toast("Gagal memuat aplikasi.", "error");
});
