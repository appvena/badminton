// router-shim.js — navigasi antar panel dari modul panel mana pun
let handler = null;
export function setGo(fn) { handler = fn; }
export function go(name, params) {
  if (params) sessionStorage.setItem("srisp_nav", JSON.stringify(params));
  if (handler) handler(name);
}
export function takeParams() {
  const raw = sessionStorage.getItem("srisp_nav");
  if (raw) { sessionStorage.removeItem("srisp_nav"); try { return JSON.parse(raw); } catch { } }
  return null;
}
