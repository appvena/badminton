// Panel: Turnamen — bagan, jadwal, live score realtime, hasil + laporan PDF
import * as store from "../store.js";
import { prettyDate, esc, courtName } from "../ui-helpers.js";
import { skeleton, toast, dateKey } from "../ui.js";
import { openReferee, openShow } from "../referee.js";

function playersLine(m) {
  const a = (m.playersA || []).join(" / "), b = (m.playersB || []).join(" / ");
  if (!a && !b) return "";
  return `<div class="ss-players"><span>${esc(a || "—")}</span><i>—</i><span>${esc(b || "—")}</span></div>`;
}

function leadBtns(m) {
  const me = store.state.user.uid;
  const mine = (me && m.hostUid === me) || store.isRefOf(m);
  if (mine)
    return `<button class="btn ghost sm lead" data-mcons="${m.id}">⚙ Konsol Wasit</button>
      ${store.isRefOf(m) && m.hostUid !== me ? `<button class="btn ghost sm lead quit" data-mquit="${m.id}">Cabut</button>` : ""}`;
  if (m.refCode && m.status !== "done")
    return `<button class="btn ghost sm lead" data-mlead="${m.id}" title="Masuk sebagai wasit memakai kode">🎮 Pimpin</button>`;
  return "";
}

function gameStr(m) {
  return (m.games || []).map((g) => `${g.a}:${g.b}`).join("  ");
}

function liveCard(m) {
  const court = courtName(m.courtId);
  return `<div class="score-sheet">
    <div class="ss-top"><span class="ss-badge"><i class="led"></i>LIVE</span><span>${esc(court)}${m.time ? " · " + esc(m.time) : ""}</span><span class="ss-lead">${leadBtns(m)}</span></div>
    <div class="ss-teams">
      <div class="ss-team"><span>${esc(m.teamA || "Menunggu")}</span><b>${m.curA ?? 0}</b></div>
      <div class="ss-vs">:</div>
      <div class="ss-team right"><span>${esc(m.teamB || "Menunggu")}</span><b>${m.curB ?? 0}</b></div>
    </div>
    ${playersLine(m)}
    <div class="ss-games">${gameStr(m) || "Gim pertama berjalan"}</div>
  </div>`;
}

function commCard(m) {
  const court = courtName(m.courtId);
  const badge = m.status === "live" ? `<span class="ss-badge"><i class="led"></i>LIVE</span>`
    : m.status === "done" ? `<span class="ss-badge" style="color:var(--green)">SELESAI</span>`
    : `<span class="ss-badge" style="color:var(--ink-2)">TERJADWAL</span>`;
  return `<div class="score-sheet private">
    <div class="ss-top">${badge}<span>TANDING · ${esc(court)} · ${prettyDate(m.date)} ${esc(m.time || "")}</span><span class="ss-lead">${leadBtns(m)}</span></div>
    <div class="ss-teams">
      <div class="ss-team"><span>${esc(m.teamA || "?")}</span><b>${m.curA ?? 0}</b></div>
      <div class="ss-vs">:</div>
      <div class="ss-team right"><span>${esc(m.teamB || "?")}</span><b>${m.curB ?? 0}</b></div>
    </div>
    ${playersLine(m)}
    <div class="ss-games">${gameStr(m) || "Menunggu dimulai"} · oleh ${esc(m.hostName || "tim")}</div>
    ${m.status === "done" ? `<button class="btn ghost sm" data-mrep="${m.id}">🖨 Hasil / PDF</button>` : ""}
  </div>`;
}

function matchRow(m) {
  const cls = m.status === "done" ? "done" : m.status === "live" ? "live" : "";
  const score = m.status === "done"
    ? `${m.winner === "A" ? 2 : 1}:${m.winner === "B" ? 2 : 1} (${gameStr(m)})`
    : m.status === "live" ? `${m.curA ?? 0}:${m.curB ?? 0}` : "—";
  const pa = (m.playersA || []).join(" / "), pb = (m.playersB || []).join(" / ");
  return `<div class="mrow ${cls}">
    <span class="mr-slot">${m.status === "live" ? '<i class="led"></i>' : ""}${esc(m.time || "")}</span>
    <span class="mr-teams"><b class="${m.winner === "A" ? "win" : ""}">${esc(m.teamA || "?")}</b>
      <i>vs</i>
      <b class="${m.winner === "B" ? "win" : ""}">${esc(m.teamB || "?")}</b>
      ${pa || pb ? `<em>${esc(pa || "—")} — ${esc(pb || "—")}</em>` : ""}</span>
    <span class="mr-score">${score}</span>
    ${m.status === "done" ? `<button class="btn ghost sm" data-mrep="${m.id}" title="Pratinjau & cetak PDF">🖨</button>` : ""}
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
        ${m.status === "live" ? `<div class="br-live"><i class="led"></i>${m.curA ?? 0}:${m.curB ?? 0}</div>` : ""}
      </div>`).join("")}
    </div>`).join("")}
  </div>`;
}

// ---------- LAPORAN HASIL (preview + cetak/PDF) ----------
function reportSheet(m, forPrint) {
  const t = store.state.tournaments.find((x) => x.id === m.tournamentId) || store.state.tournaments[0];
  const set = store.settingsData();
  const wa = (m.games || []).filter((g) => g.a > g.b).length;
  const wb = (m.games || []).filter((g) => g.b > g.a).length;
  const rows = (m.games || []).map((g, i) =>
    `<tr><td>Gim ${i + 1}</td><td>${g.a}</td><td>${g.b}</td></tr>`).join("");
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Hasil — ${esc(m.teamA)} vs ${esc(m.teamB)}</title>
  <style>
    body{font-family:Georgia,'Times New Roman',serif;color:#12243a;margin:0;padding:${forPrint ? "0" : "1.2rem"};background:${forPrint ? "#fff" : "#fff"}}
    .sheet{max-width:640px;margin:auto;border:1px solid #d8dde6;padding:2rem}
    header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #D64045;padding-bottom:.6rem}
    header b{font-size:1.05rem;letter-spacing:.06em}header span{font-size:.75rem;color:#7a8698;letter-spacing:.12em}
    h1{font-size:1.35rem;margin:1.1rem 0 .1rem}
    .sub{color:#7a8698;font-size:.85rem;margin:0 0 1.2rem}
    .score{font-size:2.6rem;font-weight:700;margin:.4rem 0;text-align:center}
    table{width:100%;border-collapse:collapse;margin:1rem 0}
    th,td{border-bottom:1px solid #d8dde6;padding:.5rem .6rem;font-size:.92rem;text-align:center}
    td:first-child{text-align:left;color:#7a8698}
    .win{color:#D64045;font-weight:700}
    footer{margin-top:1.4rem;font-size:.72rem;color:#7a8698;display:flex;justify-content:space-between}
    @media print{.sheet{border:0;padding:0;max-width:none}}
  </style></head><body><div class="sheet">
    <header><b>${esc(set.appName || "Badminton World Federation")}</b><span>HASIL PERTANDINGAN</span></header>
    <h1>${esc(m.teamA)} vs ${esc(m.teamB)}</h1>
    <p class="sub">${esc(t?.name || "Tanding Komunitas")} · ${esc(m.scope === "private" ? "diselenggarakan " + (m.hostName || "tim") : store.matchLabel ? store.matchLabel(m) : "")}
      · ${esc(courtName(m.courtId))} · ${prettyDate(m.date)} ${esc(m.time || "")}</p>
    <p class="score">${wa}:${wb}</p>
    <table><tr><th></th><th>${esc(m.teamA)}</th><th>${esc(m.teamB)}</th></tr>
      <tr><td>Pemain</td><td>${esc((m.playersA || []).join(" / ") || "—")}</td><td>${esc((m.playersB || []).join(" / ") || "—")}</td></tr>
      ${rows || "<tr><td colspan=3>Belum ada gim tercatat</td></tr>"}</table>
    <p>Juara: <b class="win">${esc(m.winner === "A" ? m.teamA : m.winner === "B" ? m.teamB : "—")}</b></p>
    <footer><span>© SRISP 2026 — dokumen dihasilkan otomatis aplikasi</span><span>${new Date().toLocaleString("id-ID")}</span></footer>
  </div></body></html>`;
}

function openReport(m) {
  const ov = document.createElement("div");
  ov.className = "modal-wrap";
  ov.innerHTML = `<div class="modal rep-modal">
    <div class="rep-tools">
      <button class="btn primary sm" data-repprint>🖨 Cetak / Simpan PDF</button>
      <button class="btn ghost sm" data-repclose>Tutup</button>
    </div>
    <iframe class="rep-frame" title="Pratinjau hasil"></iframe></div>`;
  document.body.append(ov);
  const fr = ov.querySelector(".rep-frame");
  fr.srcdoc = reportSheet(m, false);
  ov.addEventListener("click", (e) => {
    if (e.target === ov || e.target.closest("[data-repclose]")) { ov.remove(); return; }
    if (e.target.closest("[data-repprint]")) {
      const pr = document.createElement("iframe");
      pr.style.cssText = "position:fixed;left:-9999px;width:0;height:0";
      document.body.append(pr);
      pr.srcdoc = reportSheet(m, true);
      pr.onload = () => {
        try { pr.contentWindow.focus(); pr.contentWindow.print(); }
        catch { toast("Browser memblokir cetak — gunakan menu browser > Cetak.", "error"); }
        setTimeout(() => pr.remove(), 3000);
      };
    }
  });
  document.addEventListener("keydown", function escH(e) {
    if (e.key === "Escape") { ov.remove(); document.removeEventListener("keydown", escH); }
  });
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
  const com = store.communityMatches(false).slice(0, 6);
  const champion = final?.status === "done" ? (final.winner === "A" ? final.teamA : final.teamB) : null;

  root.innerHTML = `
    <div class="tour-hero">
      <span class="tag status-${t.status}">${t.status === "live" ? '<i class="led led-light"></i>SEDANG BERLANGSUNG' : t.status === "upcoming" ? "AKAN DATANG" : "SELESAI"}</span>
      <h1>${esc(t.name)}</h1>
      <p>${esc(t.format)} · ${esc(t.venue)}<br>${prettyDate(t.startDate)} – ${prettyDate(t.endDate)} 2026</p>
      <div class="tour-actions">
        <button class="btn ghost sm" data-show>⛶ Mode Tayang — layar besar</button>
        <span class="tour-note">Wasit: klik 🎮 pada kartu pertandingan &rarr; masukkan kode.</span>
      </div>
      ${champion ? `<div class="champion">🏆 Juara: <b>${esc(champion)}</b></div>` : ""}
    </div>

    ${live.length ? `<h2 class="sec">Skor Langsung</h2><div class="live-grid">${live.map(liveCard).join("")}</div>` : ""}
    ${com.length ? `<h2 class="sec">Tanding Komunitas</h2><div class="live-grid">${com.map(commCard).join("")}</div>` : ""}

    <h2 class="sec">Jadwal &amp; Hasil</h2>
    <div class="match-list">
      ${upcoming.length ? `<div class="ml-head">Berikutnya</div>${upcoming.map(matchRow).join("")}` : ""}
      ${done.length ? `<div class="ml-head">Selesai <span class="muted">— 🖨 = pratinjau/cetak PDF</span></div>${done.map(matchRow).join("")}` : ""}
    </div>

    <h2 class="sec">Bagan Pertandingan</h2>
    ${bracket(t)}`;

  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("click", async (e) => {
      if (e.target.closest("[data-show]")) { openShow(); return; }
      const rp = e.target.closest("[data-mrep]");
      if (rp) { const m = store.state.matches.find((x) => x.id === rp.dataset.mrep); if (m) openReport(m); return; }
      const lead = e.target.closest("[data-mlead]");
      if (lead) {
        const m = store.state.matches.find((x) => x.id === lead.dataset.mlead);
        if (!m) return;
        const code = prompt("Kode wasit untuk " + (m.teamA || "?") + " vs " + (m.teamB || "?") + ":");
        if (!code) return;
        const r = await store.claimReferee(m, code);
        if (!r.ok) return toast(r.error, "error", 5200);
        toast("Tersinkron sebagai wasit — silakan memimpin.", "ok");
        openReferee(m);
        return;
      }
      const cons = e.target.closest("[data-mcons]");
      if (cons) {
        const m = store.state.matches.find((x) => x.id === cons.dataset.mcons);
        if (m) openReferee(m);
        return;
      }
      const quit = e.target.closest("[data-mquit]");
      if (quit) {
        const m = store.state.matches.find((x) => x.id === quit.dataset.mquit);
        if (!m) return;
        const r = await store.withdrawReferee(m);
        toast(r.ok ? "Penugasan wasit dicabut dari akun Anda." : r.error, r.ok ? "ok" : "error");
      }
    });
  }
}

export const update = render;
