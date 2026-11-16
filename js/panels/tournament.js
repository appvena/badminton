// Panel: Turnamen — bagan pertandingan, live score realtime, hasil
import * as store from "../store.js";
import { prettyDate, esc, courtName } from "../ui-helpers.js";
import { skeleton } from "../ui.js";

function gameStr(m) {
  return (m.games || []).map((g) => `${g.a}:${g.b}`).join("  ");
}

function liveCard(m) {
  const court = courtName(m.courtId);
  return `<div class="score-sheet">
    <div class="ss-top"><span class="ss-badge"><i></i>LIVE</span><span>${esc(court)}${m.time ? " · " + esc(m.time) : ""}</span></div>
    <div class="ss-teams">
      <div class="ss-team"><span>${esc(m.teamA || "Menunggu")}</span><b>${m.curA ?? 0}</b></div>
      <div class="ss-vs">:</div>
      <div class="ss-team right"><span>${esc(m.teamB || "Menunggu")}</span><b>${m.curB ?? 0}</b></div>
    </div>
    <div class="ss-games">${gameStr(m) || "Gim pertama berjalan"}</div>
  </div>`;
}

function matchRow(m) {
  const cls = m.status === "done" ? "done" : m.status === "live" ? "live" : "";
  const score = m.status === "done"
    ? `${m.winner === "A" ? 2 : 1}:${m.winner === "B" ? 2 : 1} (${gameStr(m)})`
    : m.status === "live" ? `${m.curA ?? 0}:${m.curB ?? 0}` : "—";
  return `<div class="mrow ${cls}">
    <span class="mr-slot">${esc(m.time || "")}</span>
    <span class="mr-teams"><b class="${m.winner === "A" ? "win" : ""}">${esc(m.teamA || "?")}</b>
      <i>vs</i>
      <b class="${m.winner === "B" ? "win" : ""}">${esc(m.teamB || "?")}</b></span>
    <span class="mr-score">${score}</span>
  </div>`;
}

function bracket(t) {
  const ms = store.state.matches.filter((m) => m.tournamentId === t.id);
  const rounds = [1, 2, 3].map((r) => ms.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot));
  const names = ["8 Besar", "Semifinal", "Final"];
  return `<div class="bracket">
    ${rounds.map((rm, i) => `<div class="br-col">
      <h4>${names[i]}</h4>
      ${rm.map((m) => `<div class="br-match ${m.status}">
        <div class="br-line ${m.winner === "A" ? "win" : ""}"><span>${esc(m.teamA || "—")}</span><b>${m.status === "done" ? (m.winner === "A" ? 2 : 1) : ""}</b></div>
        <div class="br-line ${m.winner === "B" ? "win" : ""}"><span>${esc(m.teamB || "—")}</span><b>${m.status === "done" ? (m.winner === "B" ? 2 : 1) : ""}</b></div>
        ${m.status === "live" ? `<div class="br-live"><i></i>${m.curA ?? 0}:${m.curB ?? 0}</div>` : ""}
      </div>`).join("")}
    </div>`).join("")}
  </div>`;
}

export function render(root) {
  const st = store.state;
  if (!st.ready) { root.innerHTML = skeleton(4); return; }
  const t = st.tournaments[0];
  if (!t) { root.innerHTML = `<h2 class="sec top">Turnamen</h2><p class="muted">Belum ada turnamen terdaftar.</p>`; return; }
  const ms = st.matches.filter((m) => m.tournamentId === t.id);
  const live = ms.filter((m) => m.status === "live");
  const done = ms.filter((m) => m.status === "done");
  const upcoming = ms.filter((m) => m.status === "scheduled").sort((a, b) => (a.round - b.round) || (a.slot - b.slot));
  const final = ms.find((m) => m.round === 3);
  const champion = final?.status === "done" ? (final.winner === "A" ? final.teamA : final.teamB) : null;

  root.innerHTML = `
    <div class="tour-hero">
      <span class="tag status-${t.status}">${t.status === "live" ? "SEDANG BERLANGSUNG" : t.status === "upcoming" ? "AKAN DATANG" : "SELESAI"}</span>
      <h1>${esc(t.name)}</h1>
      <p>${esc(t.format)} · ${esc(t.venue)}<br>${prettyDate(t.startDate)} – ${prettyDate(t.endDate)} 2026</p>
      ${champion ? `<div class="champion">🏆 Juara: <b>${esc(champion)}</b></div>` : ""}
    </div>

    ${live.length ? `<h2 class="sec">Skor Langsung</h2><div class="live-grid">${live.map(liveCard).join("")}</div>` : ""}

    <h2 class="sec">Jadwal &amp; Hasil</h2>
    <div class="match-list">
      ${upcoming.length ? `<div class="ml-head">Berikutnya</div>${upcoming.map(matchRow).join("")}` : ""}
      ${done.length ? `<div class="ml-head">Selesai</div>${done.map(matchRow).join("")}` : ""}
    </div>

    <h2 class="sec">Bagan Pertandingan</h2>
    ${bracket(t)}`;
}

export const update = render;
