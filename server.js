// server.js — statis ringan tanpa dependensi untuk development/preview
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const ROOT = join(process.cwd(), "public");
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    if (p === "/favicon.ico") p = "/icons/icon-192.png";
    const file = normalize(join(ROOT, p));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) throw Object.assign(new Error("403"), { code: 403 });
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch (e) {
    if (e.code === 404 || e.code === 403) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(404); res.end("Not found");
  }
}).listen(PORT, "0.0.0.0", () => console.log(`SRISP Badminton: http://0.0.0.0:${PORT}`));
