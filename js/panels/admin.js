// Panel: Kelola — khusus pengelola. Masuk cukup dengan akun (email &
// sandi) yang punya peran admin/superadmin; tanpa kode-kode lagi.
import * as store from "../store.js";
import { APP } from "../config.js";
import { $, toast, prettyDate, dateKey, hourLabel, rupiah, esc, confirmDialog } from "../ui.js";
import { courtName } from "../ui-helpers.js";
import { openReferee, showRefQR } from "../referee.js";
import { openAuth } from "../auth.js";
import { reauthPassword } from "../firebase.js";

let adminSel = "";
let adTab = "skor";
const TABS = [
  ["skor", "🏸 Skor & Wasit"],
  ["lapangan", "🏟 Lapangan"],
  ["pesanan", "📒 Pesanan"],
  ["setelan", "⚙️ Pengaturan"],
  ["akun", "👥 Akun & Peran"],
  ["logo", "🖼 Logo"],
];

// ---------- Gerbang ----------
function staffGate(root) {
  root.innerHTML = `
    <div class="hero-sheet pin-card">
      <h2>Ruang Pengelola</h2>
      <p>Akses konsol skor, lapangan, pesanan, dan pengaturan khusus untuk
         akun dengan peran <b>admin</b> atau <b>superadmin</b>. Cukup masuk
         dengan email &amp; kata sandi Anda — menu ini otomatis terbuka
         penuh setelah peran dikenali.</p>
      <button class="btn primary" id="gateLogin">Masuk dengan Email</button>
      <p class="muted">Belum punya akun? Daftar lewat tombol Masuk — lalu minta
         peran diberikan oleh superadmin (menu Akun &amp; Peran).</p>
    </div>`;
  $("#gateLogin").onclick = () => openAuth("in");
}

function pinGate(root) { // hanya mode demo lokal
  root.innerHTML = `
    <h2 class="sec top">Mode Pengelola (lokal)</h2>
    <form id="pinform" class="pin-card">
      <p>Masukkan kode pengelola demo untuk membuka konsol di perangkat ini.</p>
      <input id="pin" type="password" placeholder="Kode" autocomplete="off">
      <button class="btn primary block">Masuk</button>
    </form>`;
  $("#pinform").addEventListener("submit", (e) => {
    e.preventDefault();
    if (store.verifyAdminPin($("#pin").value)) { toast("Selamat bertugas.", "ok"); render(root); }
    else toast("Kode salah.", "error");
  });
}

// ---------- Tab: Skor & Wasit ----------
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
      <div class="cs-ref">
        <button class="btn ghost sm" data-ref="${m.id}">⛶ Mode Wasit — layar penuh</button>
        <button class="btn ghost sm" data-refcode="${m.id}">${m.refCode ? "🎯 Kode " + esc(m.refCode) : "🎯 Buat Kode Wasit"}</button>
        ${m.refCode ? `<button class="btn ghost sm" data-qr="${m.id}">▦ QR Wasit</button>` : ""}
        ${(m.refUids || []).length ? `<button class="btn danger sm" data-revoke="${m.id}">Cabut Wasit (password)</button><span class="muted">wasit aktif: ${(m.refUids || []).length}</span>` : ""}
      </div>
      <p class="muted hint-sim">Bagikan QR/kode ke wasit — ia scan dengan kamera HP, perangkatnya langsung tersambung memimpin partai ini (tombol 🎮 publik ikut muncul di kartu pertandingan).</p>
      <div class="cs-grid">
        ${["A", "B"].map((side) => `<div class="cs-team">
            <input class="cs-name" data-team="${side}" value="${esc(m[`team${side}`] || "")}" placeholder="Tim ${side}">
            <input class="cs-players" data-pl="${side}" value="${esc((m[`players${side}`] || []).join(", "))}" placeholder="pemain — pisahkan koma (single/ganda)" maxlength="60">
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

// ---------- Tab: Pesanan ----------
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

// ---------- Tab: Lapangan ----------
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

// ---------- Tab: Pengaturan ----------
function settingsForm() {
  const s = store.settingsData();
  if (store.state.mode === "firebase" && !store.isSuperAdmin())
    return `<p class="muted">Pengaturan aplikasi (nama, venue, pengumuman, gaya brand) hanya dapat diubah <b>superadmin</b>. Konsol skor &amp; pesanan tetap dapat Anda kelola.</p>`;
  return `
    <form id="setform" class="form wide-form">
      <h3>Identitas</h3>
      <div class="frow"><label>Nama Aplikasi<span><input name="appName" value="${esc(s.appName)}" maxlength="40"></span></label>
        <label>Nama Singkat / Inisial<small>(tampil miring di header)</small><span><input name="brandShort" value="${esc(s.brandShort || "")}" maxlength="10" placeholder="kosong = otomatis dari nama"></span></label></div>
      <label>Tagline<span><input name="tagline" value="${esc(s.tagline)}" maxlength="60"></span></label>
      <div class="frow"><label>Nama Venue<span><input name="venueName" value="${esc(s.venueName)}" maxlength="40"></span></label>
        <label>Jam Operasional<span><input name="openHours" value="${esc(s.openHours)}" maxlength="40"></span></label></div>
      <label>Alamat<span><input name="address" value="${esc(s.address)}" maxlength="80"></span></label>
      <div class="frow"><label>Kontak WA/Telepon<span><input name="contactWA" value="${esc(s.contactWA)}" maxlength="24"></span></label>
        <label>Email<span><input name="contactEmail" value="${esc(s.contactEmail)}" maxlength="40"></span></label></div>
      <h3>Tampilan &amp; Pengumuman</h3>
      <label class="chk"><input type="checkbox" name="brandItalic" ${s.brandItalic !== false ? "checked" : ""}> Judul brand dimiringkan (italic)</label>
      <label>Pengumuman bar atas<small>(kosongkan untuk menyembunyikan; contoh: «Promo sore: diskon 20% sebelum jam 17.00»)</small>
        <input name="announcement" value="${esc(s.announcement)}" maxlength="90"></label>
      <button class="btn primary" type="submit">Simpan Pengaturan</button>
      <p class="muted hint-sim">Berlaku realtime untuk semua pengunjung di header, bar info, footer, dan splash.</p>
    </form>`;
}

// ---------- Tab: Akun & Peran ----------
function usersTable() {
  if (!store.isSuperAdmin())
    return `<p class="muted">Pengelolaan peran akun khusus superadmin.</p>`;
  const us = store.state.users;
  if (!us.length) return `<p class="muted">Memuat daftar akun…</p>`;
  return `
    <p class="muted">Tetapkan peran: <b>pemain</b> (pengguna biasa), <b>admin</b> (konsol skor/pesanan/lapangan), <b>superadmin</b> (semua + pengaturan, logo, peran).</p>
    <div class="u-table">
      <div class="u-head"><span>Akun</span><span>Terdaftar</span><span>Peran</span></div>
      ${us.map((u) => `<div class="u-row">
        <b>${esc(u.name || "(tanpa nama)")}<em>${esc(u.email || "tamu/anon")}</em></b>
        <span>${u.createdAt ? prettyDate(dateKey(new Date(u.createdAt))) : "—"}</span>
        <select data-urole="${esc(u.id)}">
          ${["pemain", "admin", "superadmin"].map((r) =>
            `<option value="${r}" ${(u.role || "pemain") === r ? "selected" : ""}>${r}</option>`).join("")}
        </select>
      </div>`).join("")}
    </div>`;
}

// ---------- Tab: Logo ----------
function logoBox() {
  if (store.state.mode === "firebase" && !store.isSuperAdmin())
    return `<p class="muted">Logo hanya dapat diganti superadmin.</p>`;
  return `
    <div class="logo-box">
      <div class="lb-prev">${store.logoData() ? `<img src="${store.logoData()}" alt="Logo">` : `<span class="muted">Belum ada logo diunggah — wordmark teks dipakai.</span>`}</div>
      <input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp,image/svg+xml">
      <div class="lb-actions">
        <button id="logoSave" class="btn primary sm">Unggah &amp; Simpan</button>
        ${store.logoData() ? `<button id="logoClear" class="btn danger sm">Hapus Logo</button>` : ""}
      </div>
      <p class="muted hint-sim">PNG/JPG/WebP ≤ 4 MB — otomatis dikecilkan (maks 512px) lalu tersimpan realtime untuk semua perangkat. Disarankan PNG transparat ±512×512.</p>
    </div>`;
}

function tabBody() {
  switch (adTab) {
    case "lapangan": return courtsForm();
    case "pesanan": return `<div class="tb-list">${todayBookings()}</div>`;
    case "setelan": return settingsForm();
    case "akun": return usersTable();
    case "logo": return logoBox();
    default: return scoreConsole(adminSel);
  }
}

export function render(root) {
  if (!store.state.ready) { root.innerHTML = `<div class="skeleton-group"><div class="sk-line"></div><div class="sk-line" style="width:70%"></div></div>`; return; }
  if (!store.isAdmin()) {
    if (store.state.mode === "demo") pinGate(root); else staffGate(root);
    return;
  }
  root.innerHTML = `
    <div class="admin-head">
      <h2 class="sec top">Konsol ${store.isSuperAdmin() ? "Superadmin" : "Pengelola"}</h2>
      <button class="btn ghost sm" id="logout">Keluar Akun</button>
    </div>
    <div class="ad-tabs">${TABS.map(([k, l]) =>
      `<button class="ad-tab ${adTab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
    <div id="adBody">${tabBody()}</div>`;

  if (adTab === "akun" && store.isSuperAdmin()) store.fetchUsers();
  bindLogo(root);
  ensureBound(root);
}

function bindLogo(root) {
  const lf = root.querySelector("#logoFile");
  const prevBox = root.querySelector(".lb-prev");
  lf?.addEventListener("change", () => {
    if (!lf.files?.[0]) return;
    prevBox.innerHTML = `<img src="${URL.createObjectURL(lf.files[0])}" alt="Pratinjau">`;
  });
  root.querySelector("#logoSave")?.addEventListener("click", async () => {
    const file = lf?.files?.[0];
    if (!file) return toast("Pilih berkas gambar dulu.", "error");
    try {
      await store.setLogo(await resizeDataURL(file, 512));
      toast("Logo tersimpan & langsung tampil di semua perangkat.", "ok");
      render(root);
    } catch (e) {
      toast(e.code === "permission-denied"
        ? "Hanya superadmin yang dapat menyimpan logo." : e.message || "Gagal memproses gambar.", "error");
    }
  });
  root.querySelector("#logoClear")?.addEventListener("click", async () => {
    await store.setLogo(""); toast("Logo dihapus.", "ok"); render(root);
  });
}

// ---- Delegasi peristiwa (diikat sekali) ----
function ensureBound(root) {
  if (root.dataset.bound) return;
  root.dataset.bound = "1";

  const mm = () => store.state.matches.find((x) => x.id === adminSel)
    || store.state.matches.find((x) => x.status === "live") || store.state.matches[0];

  root.addEventListener("click", async (e) => {
    if (e.target.closest("#logout")) { await store.signOut(); toast("Anda keluar.", "ok"); return; }
    const t = e.target.closest("[data-tab]");
    if (t) { adTab = t.dataset.tab; render(root); return; }
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.msel) { adminSel = b.dataset.msel; $("#adBody", root).innerHTML = tabBody(); return; }
    if (b.dataset.ref) { openReferee(store.state.matches.find((x) => x.id === b.dataset.ref)); return; }
    if (b.dataset.qr) { showRefQR(store.state.matches.find((x) => x.id === b.dataset.qr)); return; }
    if (b.dataset.refcode) {
      const m0 = mm(); if (!m0) return;
      const code = await store.ensureRefCode(m0);
      try { await navigator.clipboard.writeText(code); } catch {}
      toast("Kode wasit " + code + " siap — buat QR lalu bagikan.", "ok", 4500);
      $("#adBody", root).innerHTML = tabBody();
      return;
    }
    if (b.dataset.revoke) {
      const m0 = store.state.matches.find((x) => x.id === b.dataset.revoke); if (!m0) return;
      const pass = prompt("Konfirmasi cabut wasit — masukkan kata sandi akun Anda:");
      if (!pass) return;
      try {
        await reauthPassword(pass);
        await store.revokeReferees(m0);
        toast("Semua wasit pertandingan dicabut. Tombol 🎮 kembali terbuka.", "ok");
        $("#adBody", root).innerHTML = tabBody();
      } catch (err) {
        toast(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
          ? "Kata sandi salah." : err.message || "Gagal mencabut wasit.", "error");
      }
      return;
    }
    if (b.dataset.pt) { const m0 = mm(); if (m0) await store.pointMatch(m0, b.dataset.side, Number(b.dataset.pt)); return; }
    if (b.dataset.gim) { const m0 = mm(); if (m0) await store.winGame(m0, b.dataset.gim); return; }
    if (b.dataset.start) {
      const m0 = mm(); if (!m0) return;
      await store.startMatch(m0, m0.courtId || store.state.courts[0]?.id, m0.time || "");
      return;
    }
    if (b.dataset.reset) {
      const m0 = mm(); if (!m0) return;
      if (await confirmDialog("Reset skor?", "Gim dan poin akan dikosongkan, status kembali menjadi jadwal."))
        await store.updateMatchPublic(m0.id, { status: "scheduled", games: [], curA: 0, curB: 0, winner: "" });
      return;
    }
    if (b.dataset.maint) {
      const c = store.state.courts.find((x) => x.id === b.dataset.maint);
      if (c) await store.updateCourt(c.id, { statusFlag: c.statusFlag === "maint" ? "ok" : "maint" });
      return;
    }
    if (b.dataset.bcancel) {
      if (await confirmDialog("Batalkan pesanan ini?", "Status pesanan berubah menjadi dibatalkan.")) {
        await store.cancelBooking(b.dataset.bcancel); toast("Pesanan dibatalkan.", "ok");
      }
    }
  });

  root.addEventListener("change", async (e) => {
    const ur = e.target.closest("[data-urole]");
    if (ur) {
      try {
        await store.setUserRole(ur.dataset.urole, ur.value);
        toast("Peran diperbarui — akun tersebut mendapat haknya setelah muat ulang berikutnya.", "ok", 4600);
      } catch (err) { toast("Gagal: " + (err.code || err.message), "error"); }
      return;
    }
    const pl = e.target.closest("[data-pl]");
    if (pl) {
      const m0 = mm();
      if (m0) {
        const arr = pl.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4);
        await store.updateMatchPublic(m0.id, { [`players${pl.dataset.pl}`]: arr });
      }
      return;
    }
    const t = e.target.closest("[data-team]");
    const m0 = mm();
    if (t && m0) store.editTeam(m0, t.dataset.team, t.value.trim());
  });

  root.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (e.target.id === "setform") {
      const f = new FormData(e.target);
      const data = Object.fromEntries(f.entries());
      data.brandItalic = e.target.querySelector("[name=brandItalic]")?.checked ?? true;
      try {
        await store.saveAppSettings(data);
        toast("Pengaturan tersimpan & langsung tampil di seluruh aplikasi.", "ok");
      } catch (err) {
        toast(err.code === "permission-denied"
          ? "Hanya superadmin yang dapat mengubah pengaturan." : "Gagal menyimpan: " + (err.code || err.message), "error");
      }
      return;
    }
    if (e.target.id === "cform") {
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
    }
  });
}

// Realtime: ganti isi tab bila pengguna tidak sedang mengetik di dalamnya
export function update(root) {
  if (!store.state.ready || !store.isAdmin()) {
    if (root.querySelector(".admin-head")) render(root); // peran dicabut saat sesi
    return;
  }
  ensureBound(root);
  const body = root.querySelector("#adBody");
  if (!body) return;
  if (body.contains(document.activeElement)) return;
  body.innerHTML = tabBody();
}

export { ensureBound };

// Kompres gambar logo sebelum tulis ke Firestore (limit dokumen 1 MiB)
function resizeDataURL(file, max = 512) {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) return reject(new Error("Maksimal 4 MB."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * sc));
      c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const isJpg = file.type === "image/jpeg";
      const out = isJpg ? c.toDataURL("image/jpeg", 0.92) : c.toDataURL("image/png");
      if (out.length > 900000) return reject(new Error("Hasil terlalu besar; coba gambar lebih sederhana atau format JPG."));
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Berkas bukan gambar yang valid.")); };
    img.src = url;
  });
}
