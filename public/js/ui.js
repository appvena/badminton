// Helper UI ringan — tanpa dependensi

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function el(tag, attrs = {}, html = "") {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  if (html) n.innerHTML = html;
  return n;
}

export const pad2 = (n) => String(n).padStart(2, "0");

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function prettyDate(key) {
  const d = parseKey(key);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function hourLabel(h) {
  return `${pad2(h)}.00`;
}

export function rupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- Toast ----
let toastTimer;
export function toast(msg, kind = "info", ms = 2600) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = msg;
  box.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.className = "toast"), ms);
}

// ---- Skeleton ----
export function skeleton(rows = 3) {
  let h = `<div class="skeleton-group">`;
  for (let i = 0; i < rows; i++) h += `<div class="sk-line" style="width:${88 - i * 12}%"></div>`;
  return h + `</div>`;
}

// ---- Confirm modal ----
export function confirmDialog(title, body) {
  return new Promise((resolve) => {
    const wrap = el("div", { class: "modal-wrap" });
    const box = el("div", { class: "modal" });
    box.innerHTML = `<h3>${esc(title)}</h3><p>${body}</p>
      <div class="modal-actions">
        <button class="btn ghost" data-x="0">Batal</button>
        <button class="btn danger" data-x="1">Ya, Lanjut</button>
      </div>`;
    wrap.append(box);
    const done = (v) => { wrap.remove(); resolve(v); };
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-x]");
      if (b) done(b.dataset.x === "1");
    });
    wrap.addEventListener("click", (e) => { if (e.target === wrap) done(false); });
    document.body.append(wrap);
  });
}

// ---- Ikon status lapangan ----
export function courtStatusInfo(s) {
  switch (s) {
    case "playing": return { label: "Sedang Dipakai", cls: "st-play", dot: "•" };
    case "booked":  return { label: "Telah Dipesan", cls: "st-book", dot: "•" };
    case "closed":  return { label: "Tutup", cls: "st-closed", dot: "•" };
    case "maint":   return { label: "Perawatan", cls: "st-maint", dot: "•" };
    default:        return { label: "Kosong", cls: "st-free", dot: "•" };
  }
}
