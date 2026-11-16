// Panel: Beranda — dasbor status lapangan real-time
import * as store from "../store.js";
import { $, el, courtStatusInfo, prettyDate, dateKey, hourLabel, skeleton, esc } from "../ui.js";
import { go } from "../router-shim.js";

function tile(c) {
  const s = store.courtStatus(c);
  const info = courtStatusInfo(s);
  const free = store.nextFreeSlot(c);
  return `<button class="court-tile ${info.cls}" data-book="${c.id}" ${s === "closed" || s === "maint" ? "disabled" : ""}>
    <span class="ct-code">${esc(c.code)}</span>
    <span class="ct-name">${esc(c.name)}</span>
    <span class="ct-status"><i></i>${info.label}</span>
    <span class="ct-next">${free !== null && (s === "free" || s === "playing") ? "Slot kosong " + hourLabel(free) : s === "booked" ? "Bebas sebelum jam sibuk" : s === "maint" ? "Sedang perawatan" : s === "closed" ? "Di luar jam buka" : "—"}</span>
  </button>`;
}

export function render(root) {
  const st = store.state;
  if (!st.ready) { root.innerHTML = skeleton(5); return; }
  const counts = { playing: 0, booked: 0, free: 0 };
  for (const c of st.courts) {
    const s = store.courtStatus(c);
    if (s === "playing") counts.playing++;
    else if (s === "booked") counts.booked++;
    else if (s === "free") counts.free++;
  }
  const live = store.liveMatches();
  const occ = store.occupancyToday();
  const lm = live[0];

  root.innerHTML = `
    <div class="hero-sheet">
      <div class="hero-date">${prettyDate(dateKey())} · ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <h1>Status <em>Lapangan</em></h1>
      <div class="stat-row">
        <div class="stat"><b>${counts.playing}</b><span>Aktif</span></div>
        <div class="stat"><b>${counts.booked}</b><span>Dipesan</span></div>
        <div class="stat"><b>${counts.free}</b><span>Kosong</span></div>
        <div class="stat"><b>${occ}%</b><span>Okupansi</span></div>
      </div>
      <div class="occ-line"><i style="width:${occ}%"></i></div>
    </div>

    ${lm ? `<button class="live-card" data-go="tournament">
      <span class="lc-badge"><i></i>LIVE</span>
      <span class="lc-teams">${esc(lm.teamA || "?")} <b>${lm.curA}</b>:<b>${lm.curB}</b> ${esc(lm.teamB || "?")}</span>
      <span class="lc-meta">${store.matchLabel(lm)} · ${esc(lm.time || "NOW")}</span>
    </button>` : ""}

    <h2 class="sec">Lapangan hari ini</h2>
    <div class="court-grid">${st.courts.map(tile).join("")}</div>

    <div class="quick-row">
      <button class="btn primary" data-go="booking">Pesan Lapangan</button>
      <button class="btn ghost" data-go="tournament">Skor Turnamen</button>
    </div>`;

  root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  root.querySelectorAll("[data-book]").forEach((b) =>
    b.addEventListener("click", () => go("booking", { courtId: b.dataset.book })));
}

export const update = render;
