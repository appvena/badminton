import { state } from "./store.js";
import { prettyDate } from "./ui.js";

export { prettyDate };

export function courtName(id) {
  const c = state.courts.find((x) => x.id === id);
  return c ? `${c.code} — ${c.name}` : "Lapangan TBD";
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
