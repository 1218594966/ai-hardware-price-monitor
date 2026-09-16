#!/usr/bin/env node
/* =========================================================
   scripts/preview.mjs — 本地静态预览服务器（零依赖）
   用法：node scripts/preview.mjs [端口]  默认 4173
   访问：http://127.0.0.1:4173
   ========================================================= */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.argv[2] || process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (pathname === "/") pathname = "/index.html";
    const file = resolve(join(root, pathname));
    if (!file.startsWith(root)) { res.writeHead(403); res.end("forbidden"); return; }
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[preview] http://127.0.0.1:${port}  （dist/ 目录）`);
});