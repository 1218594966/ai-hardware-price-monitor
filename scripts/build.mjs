#!/usr/bin/env node
/* =========================================================
   scripts/build.mjs — 用 esbuild 把 TypeScript 源码打包到 dist/
   - 产物纯静态：dist/index.html 双击即可打开，无需服务器
   - 支持 --watch 边改边编译
   用法：
     node scripts/build.mjs          # 一次性构建
     node scripts/build.mjs --watch  # 监听源码变化
   ========================================================= */
import esbuild from "esbuild";
import { rmSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const watch = process.argv.includes("--watch");

function copyStatic() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(resolve(dist, "assets"), { recursive: true });
  // index.html 直接复用根目录模板（其中引用了 assets/app.js 与 assets/app.css）
  copyFileSync(resolve(root, "index.html"), resolve(dist, "index.html"));
}

const options = {
  entryPoints: [resolve(root, "src/main.ts")],
  bundle: true,
  format: "iife",
  target: ["es2020"],
  outfile: resolve(dist, "assets/app.js"),
  sourcemap: false,
  charset: "utf8", // 中文文案直接保留 UTF-8，不用 \u 转义
  logLevel: "info",
  loader: { ".css": "css" },
};

copyStatic();
if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("[build] 正在监听 src/ 与 styles/ 的变化，按 Ctrl+C 停止");
} else {
  await esbuild.build(options);
  console.log("[build] 完成 → dist/");
}