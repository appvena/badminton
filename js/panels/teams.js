// Panel: Tim & Tanding — tata kelola mandiri untuk pengguna terdaftar:
// buat/gabung tim, chat antar anggota, dan tanding antar tim dengan
// skor langsung yang bisa dilihat publik.
import * as store from "../store.js";
import { $, esc, toast, dateKey, prettyDate, hourLabel, skeleton } from "../ui.js";
import { courtName } from "../ui-helpers.js";
import { openReferee } from "../referee.js";
import { openAuth } from "../auth.js";

let selTeam = "";
let hostSel = "";

const accountOK = () =>
  store.state.mode !== "firebase" ||
  (store.state.user.email && !store.state.user.guest);

function teamCards() {
  const mine = store.myTeams();
  if (!mine.length)
    return `<p class="muted">Anda belum punya tim. Buat tim atau gabung dengan kode undangan.</p>`;
  return mine.map((t) => `
    <button class="team-card ${t.id === selTeam ? "on" : ""}" data-tsel="${t.id}">
      <b>${esc(t.name)}</b>
      <span>${(t.members || []).length} anggota · Kode <em class="code-badge">${esc(t.code)}</em></span>
    </button>`).join("") +
    `<button class="team-card public" data-tsel="__all"><b>Tim publik lain</b>
      <span>${store.state.teams.filter((t) => !(t.memberUids || []).includes(store.state.user.uid)).length} tim terdaftar</span></button>`;
}

function msgsHTML() {
  return store.state.chat.length ? store.state.chat.map((m) => `
    <div class="msg ${m.uid === store.state.user.uid ? "me" : ""}">
      <span class="msg-who">${esc(m.name)} · ${new Date(m.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
      <p>${esc(m.text)}</p>
    </div>`).join("") : `<p class="muted">Belum ada pesan. Sapa anggota timmu!</p>`;
}

function chatBox() {
  const t = store.teamById(selTeam);
  if (!t) return "";
  return `
    <h2 class="sec">Chat Tim — ${esc(t.name)}</h2>
    <div class="chat-box">
      <div class="msgs" id="msgs">${msgsHTML()}</div>
      <div class="chat-send">
        <input id="chatIn" maxlength="500" placeholder="Tulis pesan ke ${esc(t.name)}…" autocomplete="off">
        <button class="btn primary sm" data-csend>Kirim</button>
      </div>
    </div>
    <p class="muted hint-sim">Chat hanya terlihat oleh anggota tim ${esc(t.name)}.</p>`;
}

function newMatchForm() {
  const st = store.state;
  const t = store.teamById(selTeam) || st.teams[0];
  const others = st.teams.filter((x) => x.id !== (t && t.id)).slice(0, 20);
  return `
    <h2 class="sec">Tanding Baru</h2>
    <form id="mform" class="form">
      <div class="frow">
        <label>Tim saya<span><select name="teamA">${st.teams.map((x) => `<option ${t && x.id === t.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></span></label>
        <label>Lawan<span><input name="teamB" list="tl" placeholder="Nama tim lawan"><datalist id="tl">${others.map((x) => `<option>${esc(x.name)}</option>`).join("")}${st.matches.filter((m) => m.teamB).slice(0, 12).map((m) => `<option>${esc(m.teamB)}</option>`).join("")}</datalist></span></label>
      </div>
      <div class="frow">
        <label>Lapangan<span><select name="courtId">${st.courts.filter((c) => c.statusFlag !== "maint").map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></span></label>
        <label>Tanggal<span><input name="date" type="date" value="${dateKey()}" min="${dateKey()}"></span></label>
        <label>Jam<span><select name="start">${Array.from({ length: 14 }, (_, i) => i + 8).map((h) => `<option value="${h}" ${h === 19 ? "selected" : ""}>${hourLabel(h)}</option>`).join("")}</select></span></label>
      </div>
      <div class="frow">
        <label>Pemain tim saya<span><input name="playersA" placeholder="mis. Kevin / Gideon (pisahkan koma)" maxlength="60"></span></label>
        <label>Pemain lawan<span><input name="playersB" placeholder="mis. Fikri / Bagas" maxlength="60"></span></label>
      </div>
      <button class="btn primary block" type="submit">Buat Tanding</button>
    </form>
    <p class="muted hint-sim">Hasil &amp; skor live tanding ini juga tampil di halaman Turnamen untuk semua orang.</p>`;
}

function hostedBox() {
  const mine = store.myHostedMatches();
  if (!mine.length) return "";
  const sel = mine.find((m) => m.id === hostSel) || mine[0];
  hostSel = sel.id;
  return `
    <h2 class="sec">Tanding Saya</h2>
    <div class="pick-row">${mine.map((m) => `<button class="pk ${m.id === hostSel ? "on" : ""}" data-hsel="${m.id}">
      ${esc(m.teamA)} vs ${esc(m.teamB)}<em>${m.status === "live" ? "LIVE" : m.status === "done" ? "Selesai" : prettyDate(m.date)}</em></button>`).join("")}</div>
    <div class="console" id="hBox">${consoleFor(sel)}</div>`;
}

function consoleFor(m) {
  const g = (m.games || []).map((x) => `${x.a}:${x.b}`).join("  ");
  return `
    <div class="cs-head"><span>${esc(m.teamA)} vs ${esc(m.teamB)} · ${esc(courtName(m.courtId))} ${prettyDate(m.date)} ${esc(m.time || "")}</span>
      <span class="tag">${m.status === "live" ? "LIVE" : m.status === "done" ? "SELESAI" : "JADWAL"}</span></div>
    ${m.refCode ? `<div class="ref-code">Kode wasit: <em class="code-badge">${esc(m.refCode)}</em> <button class="btn ghost sm" data-copyref="${esc(m.refCode)}">Salin</button> <span class="muted">— bagikan ke wasit; ia masuk lewat tombol 🏸 di halaman Turnamen.</span></div>` : ""}
    <div class="cs-ref"><button class="btn ghost sm" data-href="${m.id}">⛶ Mode Wasit — layar skor penuh</button></div>
    <div class="cs-grid">
      <div class="cs-team"><input class="cs-name" data-hn="A" value="${esc(m.teamA)}" maxlength="22">
        <input class="cs-players" data-hpl="A" value="${esc((m.playersA || []).join(", "))}" placeholder="pemain A (koma)" maxlength="60">
        <div class="cs-score"><b>${m.curA ?? 0}</b></div>
        <div class="cs-btns"><button data-hpt="A" data-pt="-1">−1</button><button data-hpt="A" data-pt="1">+1</button><button class="gim" data-hg="A">Menang Gim</button></div></div>
      <div class="cs-team"><input class="cs-name" data-hn="B" value="${esc(m.teamB)}" maxlength="22">
        <input class="cs-players" data-hpl="B" value="${esc((m.playersB || []).join(", "))}" placeholder="pemain B (koma)" maxlength="60">
        <div class="cs-score"><b>${m.curB ?? 0}</b></div>
        <div class="cs-btns"><button data-hpt="B" data-pt="-1">−1</button><button data-hpt="B" data-pt="1">+1</button><button class="gim" data-hg="B">Menang Gim</button></div></div>
    </div>
    <div class="cs-games">${g || "Belum ada gim selesai"}</div>
    ${m.status === "scheduled" ? `<button class="btn primary block" data-hstart>Mulai Tanding (Live)</button>` :
      m.status === "live" ? `<button class="btn danger block" data-hfin>Selesai — Pemenang ${((m.games || []).filter((x) => x.a > x.b).length) >= 2 ? esc(m.teamA) : ((m.games || []).filter((x) => x.b > x.a).length) >= 2 ? esc(m.teamB) : "pilih via Menang Gim"}</button>` :
      `<p class="muted">Tanding selesai. Juara: <b>${esc(m.winner === "A" ? m.teamA : m.winner === "B" ? m.teamB : "—")}</b></p>`}`;
}

function gate() {
  return `<div class="hero-sheet pin-card">
    <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true"><circle cx="24" cy="22" r="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 54c2-9 9-14 16-14s14 5 16 14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="46" cy="26" r="7" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M56 52c-1.4-7-6-11-11-11" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>
    <h2>Tim &amp; Tanding</h2>
    <p>Kelola tim Anda: undang anggota dengan kode, ngobrol di chat tim, dan buat tanding antar tim dengan skor langsung yang bisa dilihat semua orang.</p>
    <div style="display:flex;gap:.6rem">
      <button class="btn primary" data-authin>Masuk</button>
      <button class="btn ghost" data-authup>Daftar</button>
    </div></div>`;
}

export function render(root) {
  if (!store.state.ready) { root.innerHTML = skeleton(4); return; }
  if (!accountOK()) {
    root.innerHTML = gate();
    root.querySelector("[data-authin]").onclick = () => openAuth("in");
    root.querySelector("[data-authup]").onclick = () => openAuth("up");
    return;
  }
  if (selTeam && !store.teamById(selTeam)) selTeam = "";
  if (!selTeam && store.myTeams().length) selTeam = store.myTeams()[0].id;
  store.openChat(selTeam && selTeam !== "__all" ? selTeam : "");

  root.innerHTML = `
    <h2 class="sec top">Tim &amp; Tanding</h2>
    <p class="muted lead">Tata kelola mandiri untuk anggota terdaftar — buat tim, atur tanding, dan pantau skor live.</p>
    <div class="team-grid" id="tmBox">${teamCards()}</div>
    <div class="join-row">
      <form id="ctform"><input name="name" placeholder="Nama tim baru" maxlength="28" required><button class="btn sm">Buat Tim</button></form>
      <form id="jtform"><input name="code" placeholder="Kode tim (mis. SRISP1)" maxlength="5" style="text-transform:uppercase"><button class="btn sm ghost">Gabung</button></form>
    </div>
    <div id="midSec">${selTeam && selTeam !== "__all" ? chatBox() : `<h2 class="sec">Chat Tim</h2><p class="muted">Pilih tim di atas untuk membuka chat.</p>`}
    ${newMatchForm()}
    <div id="hostBox">${hostedBox()}</div></div>`;

  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      const mine = store.myHostedMatches();
      const hm = () => mine.find((m) => m.id === hostSel) || mine[0];
      if (b?.dataset.tsel) { selTeam = b.dataset.tsel; render(root); return; }
      if (!b) return;
      if (b.dataset.hsel) { hostSel = b.dataset.hsel; $("#hBox", root).innerHTML = consoleFor(hm()); return; }
      if (b.dataset.href) { openReferee(store.state.matches.find((x) => x.id === b.dataset.href)); return; }
      if (b.dataset.copyref) {
        try { await navigator.clipboard.writeText(b.dataset.copyref); toast("Kode wasit disalin.", "ok"); }
        catch { toast("Kode wasit: " + b.dataset.copyref, "ok", 5000); }
        return;
      }
      if (b.dataset.hpt) { await store.pointMatch(hm(), b.dataset.hpt, Number(b.dataset.pt)); return; }
      if (b.dataset.hg) { await store.winGame(hm(), b.dataset.hg); return; }
      if (b.hasAttribute("data-hstart")) { await store.startMatch(hm(), hm().courtId, hm().time); toast("Tanding LIVE — skor terlihat publik.", "ok"); return; }
      if (b.hasAttribute("data-hfin")) {
        const m = hm();
        const aw = (m.games || []).filter((x) => x.a > x.b).length;
        const bw = (m.games || []).filter((x) => x.b > x.a).length;
        const winner = aw >= 2 ? "A" : bw >= 2 ? "B" : aw > bw ? "A" : bw > aw ? "B" : null;
        if (!winner) return toast("Selesaikan minimal satu gim dulu (tombol Menang Gim).", "error");
        await store.updateMatchPublic(m.id, { status: "done", winner, endTs: Date.now() });
        toast("Tanding selesai — hasil tersimpan.", "ok");
        return;
      }
      if (b.hasAttribute("data-csend")) { await sendNow(root); return; }
    });
    root.addEventListener("keydown", (e) => {
      if (e.target.id === "chatIn" && e.key === "Enter") { e.preventDefault(); sendNow(root); }
    });
    root.addEventListener("change", async (e) => {
      const m = store.myHostedMatches().find((x) => x.id === hostSel);
      if (e.target.dataset.hpl && m) {
        const side = e.target.dataset.hpl;
        const arr = e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4);
        await store.updateMatchPublic(m.id, { [`players${side}`]: arr });
        return;
      }
      if (e.target.dataset.hn && m) {
        const side = e.target.dataset.hn;
        await store.updateMatchPublic(m.id, { ["team" + side]: e.target.value.trim() || m["team" + side] });
      }
    });
    root.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (e.target.id === "ctform") {
        const r = await store.createTeam(f.get("name"));
        if (r.ok) { toast(`Tim dibuat! Kode undangan: ${r.code} — bagikan ke temanmu.`, "ok", 5000); render(root); }
        else toast(r.error, "error");
      } else if (e.target.id === "jtform") {
        const r = await store.joinTeam(f.get("code"));
        if (r.ok) { toast(`Selamat datang di ${r.name}!`, "ok"); render(root); }
        else toast(r.error, "error");
      } else if (e.target.id === "mform") {
        const pl = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4);
        const r = await store.createPrivateMatch({
          teamA: f.get("teamA"), teamB: f.get("teamB"), courtId: f.get("courtId"),
          date: f.get("date"), start: Number(f.get("start")),
          playersA: pl(f.get("playersA")), playersB: pl(f.get("playersB")),
        });
        if (r.ok) { toast("Tanding dijadwalkan — kode wasit tampil di kartu Tanding Saya untuk dibagikan.", "ok", 4500); render(root); }
        else toast(r.error, "error");
      }
    });
  }
}

async function sendNow(root) {
  const inp = $("#chatIn", root);
  const r = await store.sendChat(selTeam, inp.value);
  if (r.error) return toast(r.error, "error");
  inp.value = "";
  $("#msgs", root).innerHTML = "";
  store.openChat(selTeam);
}

export function update(root) {
  if (!store.state.ready || !accountOK() || !root.querySelector("#tmBox")) return;
  $("#tmBox", root).innerHTML = teamCards();
  const mBox = $("#midSec", root);
  const scroll = document.activeElement === $("#chatIn", root);
  if (!scroll) render(root);
  else {
    const box = $("#msgs", root);
    if (box) { box.innerHTML = msgsHTML(); box.scrollTop = box.scrollHeight; }
    $("#hostBox", root).innerHTML = hostedBox();
  }
}
