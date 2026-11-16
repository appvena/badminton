// Panel: Riwayat — profil singkat, pemesanan saya, pencarian/saring
import * as store from "../store.js";
import { prettyDate, hourLabel, rupiah, toast, confirmDialog, dateKey, esc } from "../ui.js";
import { courtName } from "../ui-helpers.js";

const filter = { q: "", status: "all" };

function listHTML() {
  const st = store.state;
  const all = store.myBookings();
  const list = all.filter((b) => {
    if (filter.status === "up" && b.date < dateKey()) return false;
    if (filter.status === "past" && b.date >= dateKey()) return false;
    const hay = `${b.name} ${courtName(b.courtId)} ${b.date}`.toLowerCase();
    return !filter.q || hay.includes(filter.q.toLowerCase());
  });
  if (!list.length)
    return `<p class="muted">${all.length ? "Tidak ada hasil untuk filter ini." : "Belum ada pemesanan. Mulai pesan lapangan dari tab Pesan."}</p>`;
  return list.map((b) => {
    const up = b.date >= dateKey();
    const c = st.courts.find((x) => x.id === b.courtId);
    return `<div class="book-item ${b.status}">
      <div class="bi-when"><b>${prettyDate(b.date)}</b><span>${hourLabel(b.startHour)}–${hourLabel(b.endHour)}</span></div>
      <div class="bi-main"><b>${esc(courtName(b.courtId))}</b>
        <span>${b.status === "cancelled" ? "Dibatalkan" : up ? "Terkonfirmasi" : "Selesai"} · ${rupiah((b.endHour - b.startHour) * (c?.price || 0))}</span>
        ${b.note ? `<em>"${esc(b.note)}"</em>` : ""}</div>
      ${up && b.status !== "cancelled" ? `<button class="btn danger sm" data-cancel="${b.id}">Batalkan</button>` : "<span></span>"}
    </div>`;
  }).join("");
}

function bindList(root) {
  root.querySelectorAll("[data-cancel]").forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = "1";
    b.addEventListener("click", async () => {
      if (await confirmDialog("Batalkan Pesanan?", "Slot ini akan kembali tersedia untuk umum.")) {
        await store.cancelBooking(b.dataset.cancel);
        toast("Pesanan dibatalkan.", "ok");
      }
    });
  });
}

export function render(root) {
  const st = store.state;
  if (!st.ready) { root.innerHTML = `<div class="skeleton-group"><div class="sk-line" style="width:65%"></div><div class="sk-line"></div></div>`; return; }

  root.innerHTML = `
    <h2 class="sec top">Profil &amp; Riwayat</h2>
    <form id="pform" class="profile-card">
      <div class="avatar">SR</div>
      <div class="pfields">
        <label>Nama<span><input name="name" maxlength="40" value="${esc(st.user.name)}" placeholder="Nama Anda"></span></label>
        <label>No. WhatsApp<span><input name="phone" inputmode="tel" maxlength="16" value="${esc(st.user.phone)}" placeholder="08xxxxxxxxxx"></span></label>
        ${st.mode === "firebase" && st.user.uid ? `<span class="acct">${esc(st.user.email || (st.user.guest ? "Sesi tamu" : st.user.uid))}</span>` : ""}
      </div>
      <div class="pbtns">
        <button class="btn ghost sm">Simpan</button>
        ${st.mode === "firebase" && st.user.uid ? `<button type="button" class="btn danger sm" id="signout">Keluar</button>` : ""}
      </div>
    </form>
    <p class="muted hint-sim">Profil disimpan di perangkat ini dan dipakai untuk menampilkan riwayat pemesanan Anda.</p>

    ${st.user.phone ? `
    <div class="filter-row">
      <input id="fq" class="search" placeholder="Cari pemesanan…" value="${esc(filter.q)}">
      <div class="seg">
        <button data-f="all" class="${filter.status === "all" ? "on" : ""}">Semua</button>
        <button data-f="up" class="${filter.status === "up" ? "on" : ""}">Mendatang</button>
        <button data-f="past" class="${filter.status === "past" ? "on" : ""}">Riwayat</button>
      </div>
    </div>
    <div class="book-list" id="blist">${listHTML()}</div>` : `<div class="empty-sheet"><p>Isi nama dan nomor WhatsApp Anda lalu tekan <b>Simpan</b> untuk melihat riwayat pemesanan di perangkat ini.</p></div>`}`;

  bindList(root);

    root.querySelector("#pform")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get("name")).trim(), phone = String(f.get("phone")).trim();
    if (!name) return toast("Nama tidak boleh kosong.", "error");
    store.setUser({ name, phone });
    toast("Profil disimpan.", "ok");
    render(root);
  });

  root.querySelector("#signout")?.addEventListener("click", async () => {
    const { signOutUser } = await import("../firebase.js");
    await signOutUser();
  });

  const fq = root.querySelector("#fq");
  fq?.addEventListener("input", () => {
    filter.q = fq.value;
    root.querySelector("#blist").innerHTML = listHTML();
    bindList(root);
  });
  root.querySelectorAll("[data-f]").forEach((b) =>
    b.addEventListener("click", () => {
      filter.status = b.dataset.f;
      render(root);
      root.querySelector("#fq")?.focus();
    }));
}

// Update realtime: cukup segarkan daftar, jangan rebut fokus input
export function update(root) {
  if (!store.state.ready) return;
  const list = root.querySelector("#blist");
  if (list) { list.innerHTML = listHTML(); bindList(root); }
  else render(root);
}
