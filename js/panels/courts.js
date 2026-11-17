// Panel: Lapangan — informasi lengkap tiap lapangan
import * as store from "../store.js";
import { courtStatusInfo, hourLabel, rupiah, esc } from "../ui.js";
import { go } from "../router-shim.js";

const COURTS_IMG = "/img/courts.webp";

export function render(root) {
  const st = store.state;
  if (!st.ready) { root.innerHTML = `<div class="skeleton-group"><div class="sk-line" style="width:75%"></div><div class="sk-line"></div></div>`; return; }
  root.innerHTML = `
    <figure class="court-banner">
      <img src="${COURTS_IMG}" alt="Gor SRISP dari atas" decoding="async">
      <figcaption><b>${esc(store.settingsData().venueName)}</b> — ${st.courts.length} lapangan · buka ${esc(store.settingsData().openHours)}. Rincian tarif & fasilitas di bawah; status diperbarui otomatis sesuai pesanan.</figcaption>
    </figure>
    <h2 class="sec top">Daftar Lapangan</h2>
    <div class="court-cards">
      ${st.courts.map((c) => {
        const s = store.courtStatus(c);
        const info = courtStatusInfo(s);
        return `<article class="court-card ${info.cls}">
          <header>
            <span class="cc-code">${esc(c.code)}</span>
            <span class="cc-status"><i></i>${info.label}</span>
          </header>
          <h3>${esc(c.name)}</h3>
          <div class="cc-lines">
            <div><span>Tarif</span><b>${rupiah(c.price)}<em>/jam</em></b></div>
            <div><span>Operasional</span><b>${hourLabel(c.openFrom)} – ${hourLabel(c.openTo)}</b></div>
          </div>
          <div class="cc-fac">${(c.facilities || []).map((f) => `<chip>${esc(f)}</chip>`).join("")}</div>
          ${s !== "closed" && s !== "maint" ? `<button class="btn ghost sm" data-book="${c.id}">Pesan ${esc(c.code)}</button>` : ""}
        </article>`;
      }).join("")}
    </div>`;
  root.querySelectorAll("[data-book]").forEach((b) =>
    b.addEventListener("click", () => go("booking", { courtId: b.dataset.book })));
}

export const update = render;
