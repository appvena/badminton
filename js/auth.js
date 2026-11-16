// auth.js — modal Masuk/Daftar & zona login pojok kanan atas
import * as fb from "./firebase.js";
import { state, setUser, isStaff } from "./store.js";
import { $, toast } from "./ui.js";

const ERR = {
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/user-not-found": "Akun tidak ditemukan. Silakan daftar dulu.",
  "auth/wrong-password": "Kata sandi salah.",
  "auth/email-already-in-use": "Email sudah terdaftar — silakan Masuk.",
  "auth/weak-password": "Kata sandi minimal 6 karakter.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/operation-not-allowed": "Aktifkan metode Email/Password di Firebase Console → Authentication.",
  "auth/network-request-failed": "Jaringan tidak mencapai Firebase.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar.",
};

let tab = "in";
const modal = () => $("#authModal");

export function openAuth(t = "in") {
  setTab(t);
  modal().hidden = false;
  modal().querySelector('[name="email"]').focus?.();
}
export function closeAuth() { modal().hidden = true; }

function setTab(t) {
  tab = t;
  modal().querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x.dataset.tab === t));
  modal().querySelector('label[for="aname"]').hidden = t !== "up";
  modal().querySelector('button[type="submit"]').textContent = t === "in" ? "Masuk" : "Daftar & Masuk";
}

function initials() {
  const s = (state.user.name || state.user.email || "?").trim();
  return s.slice(0, 2).toUpperCase();
}

function signedInReal() {
  if (state.mode === "demo") return !!state.user.email;
  return state.mode === "firebase" && state.user.email && !state.user.guest;
}

export function renderAuthZone() {
  const zone = $("#authZone");
  if (!zone) return;
  if (signedInReal()) {
    const label = state.user.name || state.user.email;
    zone.innerHTML = `<div class="user-chip">
        <span class="uav" data-act="menu">${initials()}</span>
        <span data-act="menu">${label}</span><span class="ucaret" data-act="menu">▾</span>
        <div class="uchip-menu">
          <a href="#history">Profil &amp; Riwayat</a>
          ${isStaff() ? '<a href="#admin">Ruang Pengelola</a>' : ""}
          <div class="sep"></div>
          <button data-act="logout">Keluar</button>
        </div>
      </div>`;
  } else {
    zone.innerHTML = `
      <button class="authbtn login" data-act="login">Masuk</button>
      <button class="authbtn register" data-act="register">Daftar</button>`;
  }
  // cermin di menu mobile
  const mm = document.querySelector(".mm-auth");
  if (mm) mm.innerHTML = zone.innerHTML;
}

export function initAuthUI() {
  renderAuthZone();

  // submit masuk/daftar
  modal().querySelector("#authform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = String(f.get("email")).trim().toLowerCase();
    const pass = String(f.get("pass"));
    const btn = e.target.querySelector('button[type="submit"]');
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return toast("Format email belum benar.", "error");
    btn.disabled = true;
    try {
      if (state.mode !== "firebase") {           // Mode demo: akun lokal perangkat
        setUser({ email, name: String(f.get("name") || email.split("@")[0]), local: tab === "up" ? true : state.user.local });
        toast(tab === "up" ? "Akun demo dibuat di perangkat ini." : "Masuk (mode demo).", "ok");
      } else if (tab === "up") {
        await fb.signUpEmail(email, pass);
        await fb.fsSet("users", fb.currentUid(), {
          name: String(f.get("name") || "").trim(), phone: state.user.phone || "", role: "pemain", email,
        });
        toast("Akun terdaftar. Selamat datang!", "ok");
      } else {
        await fb.signInEmail(email, pass);
        toast("Berhasil masuk.", "ok");
      }
      closeAuth();
    } catch (err) {
      toast(ERR[err.code] || `Gagal (${err.code || err.message}).`, "error");
    } finally { btn.disabled = false; }
  });

  modal().querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
  modal().querySelector("#authClose").onclick = closeAuth;
  modal().addEventListener("click", (e) => { if (e.target === modal()) closeAuth(); });

  // delegasi klik zona login (header) & menu mobile
  document.body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (b) {
      const a = b.dataset.act;
      if (a === "login") openAuth("in");
      else if (a === "register") openAuth("up");
      else if (a === "menu") b.closest(".user-chip")?.querySelector(".uchip-menu")?.classList.toggle("open");
      else if (a === "logout") doLogout();
      return;
    }
    if (!e.target.closest(".user-chip"))
      document.querySelectorAll(".uchip-menu.open").forEach((m) => m.classList.remove("open"));
  });
}

async function doLogout() {
  if (state.mode === "firebase") await fb.signOutUser();   // otomatis jadi tamu anonim lagi
  else setUser({ email: "", name: "", local: false });
  toast("Anda keluar.", "ok");
  renderAuthZone();
}
