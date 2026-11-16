// auth.js — gerbang login Firebase (Email/Password + tamu anonim)
import * as fb from "./firebase.js";
import { APP } from "./config.js";
import { grantAdmin } from "./store.js";
import { $, toast } from "./ui.js";

const ERR = {
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/user-not-found": "Akun tidak ditemukan. Silakan daftar dulu.",
  "auth/wrong-password": "Kata sandi salah.",
  "auth/email-already-in-use": "Email sudah terdaftar — silakan Masuk.",
  "auth/weak-password": "Kata sandi minimal 6 karakter.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/operation-not-allowed": "Metode login belum diaktifkan di Firebase Console (Authentication → Sign-in method → Email/Password & Anonymous).",
  "auth/network-request-failed": "Jaringan tidak mencapai Firebase. Periksa koneksi internet.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
};

export const showGate = () => { $("#authGate").hidden = false; document.body.classList.add("locked"); };
export const hideGate = () => { $("#authGate").hidden = true; document.body.classList.remove("locked"); };

let tab = "in";

export function initAuthUI() {
  const gate = $("#authGate");
  const tabs = gate.querySelectorAll("[data-tab]");
  const nameField = gate.querySelector('label[for="aname"]');
  const submit = gate.querySelector('button[type="submit"]');

  tabs.forEach((b) => (b.onclick = () => {
    tab = b.dataset.tab;
    tabs.forEach((x) => x.classList.toggle("on", x === b));
    nameField.hidden = tab !== "up";
    submit.textContent = tab === "in" ? "Masuk" : "Daftar & Masuk";
  }));

  gate.querySelector("#authform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = String(f.get("email")).trim().toLowerCase();
    const pass = String(f.get("pass"));
    submit.disabled = true;
    try {
      if (tab === "up") {
        await fb.signUpEmail(email, pass);
        await fb.fsSet("users", fb.currentUid(), {
          name: String(f.get("name") || "").trim(), phone: "", role: "pemain", email,
        });
        toast("Akun dibuat. Selamat datang!", "ok");
      } else {
        await fb.signInEmail(email, pass);
      }
    } catch (err) {
      toast(ERR[err.code] || `Login gagal (${err.code || err.message}).`, "error");
    } finally {
      submit.disabled = false;
    }
  });

  gate.querySelector("#btnGuest").addEventListener("click", async () => {
    try { await fb.signInGuest(); }
    catch (err) { toast(ERR[err.code] || "Mode tamu gagal diaktifkan.", "error"); }
  });

  // Kode pengelola opsional di halaman login (tanpa akun terdaftar)
  gate.querySelector("#btnAdmin").addEventListener("click", async () => {
    const pin = prompt("Kode pengelola:");
    if (pin === APP.adminPin) {
      if (!fb.currentUid()) await fb.signInGuest();
      await grantAdmin();
      hideGate();
      toast("Masuk sebagai Pengelola.", "ok");
    } else toast("Kode salah.", "error");
  });
}
