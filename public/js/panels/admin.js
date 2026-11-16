// Panel: Kelola — konsol skor langsung, pemesanan hari ini, data lapangan
import * as store from "../store.js";
import { APP } from "../config.js";
import { $, toast, prettyDate, dateKey, hourLabel, rupiah, esc, confirmDialog } from "../ui.js";
import { courtName } from "../ui-helpers.js";

function pinGate(root) {
  root.innerHTML = `
    <h2 class="sec top">Mode Pengelola</h2>
    <form id="pinform" class="pin-card">
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      <p>Masukkan kode pengelola untuk mengakses konsol skor, data lapangan dan pemesanan.</p>
      <input id="pin" type="password" inputmode="text" placeholder="Kode pengelola" autocomplete="off">
      <button class="btn primary block">Masuk</button>
    </form>`;
  $("#pinform").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("#pin").value === APP.adminPin) {
      store.setUser({ admin: true });
      toast("Selamat bertugas, Pengelola.", "ok");
      render(root);
    } else toast("Kode salah.", "error");
  });
}

// ---------- Konsol skor ----------
function scoreConsole(sel) {
  const ms = store.state.matches;
  if (!ms.length) return `<p class="muted">Belum ada pertandingan.</p>`;
  const m = ms.find((x) => x.id === (sel || "")) || ms.find((x) => x.status === "live") || ms[0];
  const games = (m.games || []).map((g, i) => `G${i + 1} ${g.a}–${g.b}`).join(" · ");
  return `
    <div class="pick-row">
      ${ms.slice(0, 12).map((x) => `<button class="pk ${x.id === m.id ? "on" : ""} st-${x.status}" data-msel="${x.id}">${esc((x.teamA || "?").split(" ").pop())}v${esc((x.teamB || "?").split(" ").pop())}<em>${store.matchLabel(x)}</em></button>`).join("")}
    </div>
    <div class="console">
      <div class="cs-head">${store.matchLabel(m)} · ${esc(m.time || "—")} · ${esc(courtName(m.courtId))}
        <span class="tag st-${m.status}">${m.status === "live" ? "LIVE" : m.status === "done" ? "SELESAI" : "JADWAL"}</span></div>
      <div class="cs-grid">
        ${["A", "B"].map((side) => `<div class="cs-team">
            <input class="cs-name" data-team="${side}" value="${esc(m[`team${side}`] || "")}" placeholder="Tim ${side}">
            <div class="cs-score"><b>${m[side === "A" ? "curA" : "curB"] ?? 0}</b>
              <div class="cs-btns">
                <button data-pt="-1" data-side="${side}">−</button>
                <button data-pt="1" data-side="${side}">+</button>
                <button class="gim" data-gim="${side}" ${m.status === "done" ? "disabled" : ""}>Menang Gim</button>
              </div></div>
          </div>`).join("")}
      </div>
      <div class="cs-games">${games || "Belum ada gim selesai"}</div>
      ${m.status === "scheduled" ? `<button class="btn primary" data-start="${m.id}">Mulai Pertandingan</button>` : ""}
      ${m.status === "done" ? `<button class="btn danger" data-reset="${m.id}">Reset Skor</button>` : ""}
    </div>`;
}

// ---------- Booking hari ini ----------
function todayBookings() {
  const today = dateKey();
  const bs = store.state.bookings
    .filter((b) => b.date >= today)
    .sort((a, b) => (a.date + hourLabel(a.startHour)).localeCompare(b.date + hourLabel(b.startHour)))
    .slice(0, 20);
  if (!bs.length) return `<p class="muted">Tidak ada pesanan mendatang.</p>`;
  return bs.map((b) => `<div class="tb-item ${b.status}">
      <div><b>${esc(b.name)}</b><span>${esc(courtName(b.courtId))} · ${prettyDate(b.date)} ${hourLabel(b.startHour)}–${hourLabel(b.endHour)} · ${esc(b.phone)}</span></div>
      ${b.status === "active" ? `<button class="btn danger sm" data-bcancel="${b.id}">Batalkan</button>` : `<span class="tag">DIBATALKAN</span>`}
    </div>`).join("");
}

// ---------- Data lapangan ----------
function courtsForm() {
  return `
    ${store.state.courts.map((c) => `<div class="tb-item">
      <div><b>${esc(c.code)} — ${esc(c.name)}</b>
        <span>${rupiah(c.price)}/jam · ${hourLabel(c.openFrom)}–${hourLabel(c.openTo)} · ${(c.facilities || []).join(", ")}</span></div>
      <button class="btn ghost sm" data-maint="${c.id}">${c.statusFlag === "maint" ? "Aktifkan" : "Perawatan"}</button>
    </div>`).join("")}
    <form id="cform" class="form compact">
      <h3>Tambah Lapangan</h3>
      <div class="frow">
        <label>Kode<span><input name="code" required maxlength="4" placeholder="L7"></span></label>
        <label>Nama<span><input name="name" required maxlength="40" placeholder="Lapangan Baru"></span></label>
      </div>
      <div class="frow">
        <label>Tarif/jam<span><input name="price" type="number" min="0" step="5000" value="50000" required></span></label>
        <label>Buka<span><input name="openFrom" type="number" min="5" max="14" value="8" required></span></label>
        <label>Tutup<span><input name="openTo" type="number" min="15" max="23" value="22" required></span></label>
      </div>
      <label>Fasilitas<span><input name="facilities" maxlength="80" placeholder="Matras, Kipas, Parkir"></span></label>
      <button class="btn primary" type="submit">Simpan Lapangan</button>
    </form>`;
}

export function render(root) {
  if (!store.state.ready) { root.innerHTML = `<div class="skeleton-group"><div class="sk-line"></div><div class="sk-line" style="width:70%"></div></div>`; return; }
  if (!store.state.user.admin) return pinGate(root);

  root.innerHTML = `
    <div class="admin-head">
      <h2 class="sec top">Konsol Pengelola</h2>
      <button class="btn ghost sm" id="logout">Keluar</button>
    </div>
    <h2 class="sec">Live Score</h2>
    <div id="consoleBox">${scoreConsole(adminSel)}</div>
    <h2 class="sec">Pemesanan Mendatang</h2>
    <div class="tb-list" id="bookBox">${todayBookings()}</div>
    <h2 class="sec">Data Lapangan</h2>
    <div class="tb-list" id="courtsBox">${courtsForm()}</div>`;

  $("#logout").onclick = () => { store.setUser({ admin: false }); render(root); };

  // Satu delegasi klik untuk seluruh panel: tahan terhadap update realtime
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const m = () => store.state.matches.find((x) => x.id === adminSel)
        || store.state.matches.find((x) => x.status === "live") || store.state.matches[0];
      if (b.dataset.msel) { adminSel = b.dataset.msel; $("#consoleBox", root).innerHTML = scoreConsole(adminSel); return; }
      if (b.dataset.pt) { const mm = m(); if (mm) await store.pointMatch(mm, b.dataset.side, Number(b.dataset.pt)); return; }
      if (b.dataset.gim) { const mm = m(); if (mm) await store.winGame(mm, b.dataset.gim); return; }
      if (b.dataset.start) {
        const mm = m(); if (!mm) return;
        await store.startMatch(mm, mm.courtId || store.state.courts[0]?.id, mm.time || "");
        return;
      }
      if (b.dataset.reset) {
        const mm = m(); if (!mm) return;
        if (await confirmDialog("Reset skor?", "Gim dan poin akan dikosongkan, status kembali menjadi jadwal."))
          await store.updateMatchPublic(mm.id, { status: "scheduled", games: [], curA: 0, curB: 0, winner: "" });
        return;
      }
      if (b.dataset.maint) {
        const c = store.state.courts.find((x) => x.id === b.dataset.maint);
        if (c) await store.updateCourt(c.id, { statusFlag: c.statusFlag === "maint" ? "ok" : "maint" });
        return;
      }
      if (b.dataset.bcancel) {
        if (await confirmDialog("Batalkan pesanan ini?", "Status pesanan berubah menjadi dibatalkan.")) {
          await store.cancelBooking(b.dataset.bcancel);
          toast("Pesanan dibatalkan.", "ok");
        }
      }
    });
    root.addEventListener("change", (e) => {
      const t = e.target.closest("[data-team]");
      const mm = store.state.matches.find((x) => x.id === adminSel)
        || store.state.matches.find((x) => x.status === "live") || store.state.matches[0];
      if (t && mm) store.editTeam(mm, t.dataset.team, t.value.trim());
    });
    root.addEventListener("submit", async (e) => {
      if (e.target.id !== "cform") return;
      e.preventDefault();
      const f = new FormData(e.target);
      const openFrom = Number(f.get("openFrom")), openTo = Number(f.get("openTo"));
      if (openTo <= openFrom) return toast("Jam tutup harus setelah jam buka.", "error");
      await store.addCourt({
        code: String(f.get("code")).trim().toUpperCase(), name: String(f.get("name")).trim(),
        price: Number(f.get("price")), openFrom, openTo,
        facilities: String(f.get("facilities") || "").split(",").map((x) => x.trim()).filter(Boolean),
        statusFlag: "ok",
      });
      toast("Lapangan ditambahkan.", "ok");
    });
  }

}

let adminSel = "";

// Realtime: gambar ulang konsol & daftar; form tambah lapangan hanya diganti
// bila pengguna tidak sedang mengetik di dalamnya
export function update(root) {
  if (!store.state.ready || !store.state.user.admin) return;
  const box = root.querySelector("#consoleBox");
  if (box) box.innerHTML = scoreConsole(adminSel);
  const bb = root.querySelector("#bookBox");
  if (bb) bb.innerHTML = todayBookings();
  const cb = root.querySelector("#courtsBox");
  if (cb && !cb.contains(document.activeElement)) cb.innerHTML = courtsForm();
}
