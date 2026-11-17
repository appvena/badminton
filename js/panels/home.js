// Panel: Beranda — hero + status lapangan real-time
import * as store from "../store.js";
import { courtStatusInfo, dateKey, hourLabel, skeleton, esc } from "../ui.js";

// "Kondisi Lapangan *Saat Ini*" → penekanan <em>, sisanya di-escape
function heroTitle(raw) {
  return esc(raw || "Kondisi Lapangan *Saat Ini* dari GOR")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
import { go } from "../router-shim.js";

const HERO = "/img/hero.webp";

function tile(c) {
  const s = store.courtStatus(c);
  const info = courtStatusInfo(s);
  const free = store.nextFreeSlot(c);
  return `<button class="court-tile ${info.cls}" data-book="${c.id}" ${s === "closed" || s === "maint" ? "disabled" : ""}>
    <span class="ct-code">${esc(c.code)}</span>
    <span class="ct-name">${esc(c.name)}</span>
    <span class="ct-status"><i></i>${info.label}</span>
    <span class="ct-next">${s === "free" ? (free !== null ? "Kosong " + hourLabel(free) : "Kosong sekarang")
      : (s === "playing" || s === "booked") ? (free !== null ? "Penuh s/d " + hourLabel(free) : "Penuh hari ini")
      : s === "maint" ? "Nonaktif sementara"
      : s === "closed" ? "Buka " + hourLabel(c.openFrom) + "–" + hourLabel(c.openTo) : "—"}</span>
  </button>`;
}

export function render(root) {
  const st = store.state;
  if (!st.ready) { root.innerHTML = skeleton(6); return; }
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
  const fullDate = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  root.innerHTML = `
    <section class="hero">
      <img class="hero-img" src="${HERO}" alt="Aksi pertandingan badminton" fetchpriority="high" decoding="async">
      <div class="hero-in">
        <span class="kicker">${esc(fullDate)} · ${esc(store.settingsData().venueName || st.tournaments[0]?.venue || "")}</span>
        <h1>${heroTitle(store.settingsData().heroTitle)}</h1>
        <p>${counts.free} lapangan kosong sekarang · keterisian lapangan hari ini ${occ}% · ${live.length} pertandingan live</p>
        <div class="hero-btns">
          <button class="btn primary" data-go="booking">Pesan Sekarang</button>
          <button class="btn light" data-go="tournament">Skor Langsung</button>
        </div>
      </div>
    </section>

    <div class="stat-strip">
      <div class="stat"><b>${counts.playing}</b><span>Sedang Dimainkan</span></div>
      <div class="stat"><b>${counts.booked}</b><span>Belum Dimainkan</span></div>
      <div class="stat"><b>${counts.free}</b><span>Kosong</span></div>
      <div class="stat"><b>${occ}%</b><span>Keterisian</span></div>
    </div>

    ${lm ? `<button class="live-card" data-go="tournament">
      <span class="lc-badge"><i></i>LIVE</span>
      <span class="lc-teams">${esc(lm.teamA || "?")} <b>${lm.curA}</b>:<b>${lm.curB}</b> ${esc(lm.teamB || "?")}</span>
      <span class="lc-meta">${store.matchLabel(lm)} · ${esc(lm.time || "NOW")} — buka untuk bagan lengkap</span>
    </button>` : ""}

    <h2 class="sec">Lapangan Hari Ini</h2>
    <div class="court-grid">${st.courts.map(tile).join("")}</div>
    <div class="occ-line"><i style="width:${occ}%"></i></div>`;

  root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  root.querySelectorAll("[data-book]").forEach((b) =>
    b.addEventListener("click", () => go("booking", { courtId: b.dataset.book })));
}

export const update = render;
