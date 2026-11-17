// Panel: Pemesanan lapangan — tanggal → jam → lapangan → data diri
import * as store from "../store.js";
import { $, dateKey, parseKey, prettyDate, hourLabel, rupiah, toast, pad2, esc } from "../ui.js";
import { takeParams } from "../router-shim.js";

const view = { date: dateKey(), courtId: "", start: null, end: null, busy: false };
let lastCourtCount = -1;

// Set jam yang sudah terisi untuk tanggal & lapangan terpilih
function takenHours() {
  const c = store.state.courts.find((x) => x.id === view.courtId);
  const set = new Set();
  if (!c) return set;
  for (const b of store.state.bookings)
    if (b.courtId === c.id && b.date === view.date && b.status !== "cancelled")
      for (let s = b.startHour; s < b.endHour; s++) set.add(s);
  return set;
}

function dateChips() {
  let h = `<div class="date-strip" role="tablist">`;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 864e5);
    const k = dateKey(d);
    h += `<button class="dchip ${k === view.date ? "on" : ""}" data-date="${k}">
      <span>${i === 0 ? "Hari ini" : prettyDate(k).split(" ")[0]}</span><b>${d.getDate()}</b></button>`;
  }
  return h + `</div>`;
}

function courtOptions() {
  const st = store.state;
  if (!st.courts.length) return `<p class="muted">Belum ada data lapangan.</p>`;
  return st.courts.map((c) => {
    const sel = view.courtId === c.id;
    return `<button class="copt ${sel ? "on" : ""}" data-court="${c.id}">
      <b>${esc(c.code)}</b><span>${esc(c.name)}</span>
      <em>${rupiah(c.price)}/jam · ${hourLabel(c.openFrom)}–${hourLabel(c.openTo)}</em>
    </button>`;
  }).join("");
}

function slotGrid() {
  const c = store.state.courts.find((x) => x.id === view.courtId);
  if (!c) return `<p class="muted">Pilih lapangan dulu untuk melihat ketersediaan jam.</p>`;
  const now = new Date();
  const isToday = view.date === dateKey();
  const bs = store.state.bookings.filter((b) => b.courtId === c.id && b.date === view.date && b.status !== "cancelled");
  let h = `<div class="slot-grid">`;
  for (let s = c.openFrom; s < c.openTo; s++) {
    const taken = bs.some((b) => s >= b.startHour && s < b.endHour);
    const past = isToday && (s < now.getHours() + now.getMinutes() / 60);
    const disabled = taken || past || c.statusFlag === "maint";
    const on = view.start === s || (view.start !== null && s > view.start && s < view.end);
    const range = view.start !== null && view.end !== null && s >= view.start && s < view.end;
    h += `<button class="slot ${disabled ? "off" : ""} ${on || range ? "on" : ""}" data-slot="${s}" ${disabled ? "disabled" : ""}>
      ${hourLabel(s)}${taken ? `<i></i>` : ""}</button>`;
  }
  h += `</div>`;
  const total = view.start !== null && view.end !== null ? view.end - view.start : 0;
  const label = total ? `${hourLabel(view.start)}–${hourLabel(view.end)} · ${total} jam`
    : view.start !== null ? "Jam mulai dipilih — sekarang klik JAM SELESAI"
    : "Belum ada jam dipilih";
  h += `<div class="slot-sum"><span>${label}</span>${total ? `<b>${rupiah(c.price * total)}</b>` : ""}</div>`;
  return h;
}

function summary() {
  const c = store.state.courts.find((x) => x.id === view.courtId);
  if (!c || view.start === null) return "";
  if (view.end === null)
    return `<div class="paper-note warn">Mulai pukul <b>${hourLabel(view.start)}</b> — klik satu jam lagi sebagai jam selesai, atau klik jam mulai yang sama untuk 1 jam.</div>`;
  return `<div class="paper-note">Tersedia: <b>${esc(c.name)}</b>, ${prettyDate(view.date)} pukul
    <b>${hourLabel(view.start)}–${hourLabel(view.end)}</b>.</div>`;
}

export function render(root) {
  const p = takeParams();
  if (p?.courtId) view.courtId = p.courtId;
  if (!store.state.ready) { root.innerHTML = `<div class="skeleton-group"><div class="sk-line" style="width:70%"></div><div class="sk-line"></div><div class="sk-line" style="width:80%"></div></div>`; return; }

  // Auto-pilih lapangan aktif pertama bila belum ada pilihan
  if (!view.courtId && store.state.courts.length)
    view.courtId = (store.state.courts.find((c) => c.statusFlag !== "maint") || store.state.courts[0]).id;
  else if (view.courtId && !store.state.courts.some((c) => c.id === view.courtId)) view.courtId = "";
  lastCourtCount = store.state.courts.length;
  root.innerHTML = `
    <h2 class="sec top">Pesan Lapangan</h2>
    <div class="step"><b>1</b><span>Pilih tanggal</span></div>
    ${dateChips()}
    <div class="step"><b>2</b><span>Pilih lapangan</span></div>
    <div class="court-opts">${courtOptions()}</div>
    <div class="step"><b>3</b><span>Pilih jam mulai &amp; selesai</span><em class="hint">klik jam mulai lalu jam akhir</em></div>
    <div id="slots">${slotGrid()}</div>
    <div id="bsum">${summary()}</div>
    ${store.state.localMirror ? `<div class="paper-note warn">Menampilkan <b>data cadangan lokal</b> — server belum mengirimkan data. Pesanan belum tersimpan ke server sampai aturan/database Firebase selesai diaktifkan.</div>` : ""}
    <div class="step"><b>4</b><span>Data pemesan</span></div>
    <form id="bform" class="form" autocomplete="on">
      <label>Nama<span><input name="name" required maxlength="40" placeholder="Nama / komunitas" value="${esc(store.state.user.name)}"></span></label>
      <label>No. WhatsApp<span><input name="phone" required inputmode="tel" maxlength="16" placeholder="08xxxxxxxxxx" value="${esc(store.state.user.phone)}"></span></label>
      <label>Catatan (opsional)<span><input name="note" maxlength="60" placeholder="Contoh: bawa raket sendiri"></span></label>
      <button class="btn primary block" type="submit">Konfirmasi Pemesanan</button>
    </form>`;

  root.querySelectorAll("[data-date]").forEach((b) => b.addEventListener("click", () => {
    view.date = b.dataset.date; view.start = view.end = null; render(root);
  }));
  root.querySelectorAll("[data-court]").forEach((b) => b.addEventListener("click", () => {
    view.courtId = b.dataset.court; view.start = view.end = null; render(root);
  }));
  bindSlots(root);

  $("#bform").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (view.start === null || view.end === null) return toast("Pilih jam mulai dan selesai terlebih dahulu.", "error");
    const f = new FormData(e.target);
    const phone = String(f.get("phone")).replace(/\D/g, "");
    if (phone.length < 9) return toast("Nomor WhatsApp tidak valid.", "error");
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "Memproses…";
    const res = await store.addBooking({
      courtId: view.courtId, date: view.date, start: view.start, end: view.end,
      name: String(f.get("name")).trim(), phone, note: String(f.get("note") || "").trim(),
    });
    btn.disabled = false; btn.textContent = "Konfirmasi Pemesanan";
    if (res.ok) {
      toast("Lapangan berhasil dipesan! Sampai jumpa.", "ok");
      view.start = view.end = null; render(root);
    } else toast(res.error, "error");
  });
}

function bindSlots(root) {
  root.querySelectorAll("[data-slot]").forEach((b) => {
    const c = b.cloneNode(true);
    b.replaceWith(c);
    c.addEventListener("click", () => {
      const s = Number(c.dataset.slot);
      const taken = takenHours();
      if (view.start === null || view.end !== null) { view.start = s; view.end = null; }
      else if (s === view.start) view.end = s + 1;
      else if (s > view.start) {
        let block = null;
        for (let x = view.start; x <= s; x++) if (taken.has(x)) { block = x; break; }
        view.end = block !== null ? block : s + 1;
        if (view.end <= view.start) view.end = view.start + 1;
      } else { view.start = s; view.end = null; }
      $("#slots", root).innerHTML = slotGrid();
      $("#bsum", root).innerHTML = summary();
      bindSlots(root);
    });
  });
}

export function update(root) {
  if (!store.state.ready) return;
  const n = store.state.courts.length;
  // Render ulang bila panel belum terisi ATAU jumlah lapangan berubah
  // (penyebab "tidak bisa pilih" saat data tiba setelah render kosong).
  if (!root.querySelector("#bform") || lastCourtCount !== n ||
      store.state.localMirror !== root.hasAttribute("data-mirror")) render(root);
  lastCourtCount = n;
  root.setAttribute("data-mirror", String(store.state.localMirror));
}
