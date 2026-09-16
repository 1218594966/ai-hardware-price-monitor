/* =========================================================
   scripts/snapshot.mjs — 生成带演示数据的静态预览页（视觉验证用）
   用法：node scripts/snapshot.mjs [输出路径]
   默认输出 tests/.artifacts/preview.html
   ========================================================= */
import { JSDOM } from "jsdom";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const outPath = process.argv[2] || resolve(root, "tests/.artifacts/preview.html");

const html = readFileSync(resolve(dist, "index.html"), "utf8");
const css = readFileSync(resolve(dist, "assets/app.css"), "utf8");
const js = readFileSync(resolve(dist, "assets/app.js"), "utf8");

const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://quote.local/", pretendToBeVisual: true });
const w = dom.window;
w.confirm = () => true;
w.alert = () => undefined;
w.eval(js);

const HW = w.HW;
if (!HW || !HW.app) throw new Error("打包产物未正常启动");

/* ---- 默认种子数据已自带 3 套带价格的配置；再补一张「无走势」的作对比 ---- */
const store = HW.store;
const extra = store.create("演示扩展方案");
store.addItem(extra.id, { name: "推理一体机", brand: "浪潮", model: "NF5688M6", spec: "8×GPU 2U 机架", qty: "1", unit: "台", price: "188000" });
store.addItem(extra.id, { name: "算力卡", brand: "NVIDIA", model: "L40S 48G", qty: "4", unit: "张", price: "68000" });
store.save(true);
store.setActive(store.all()[0].id);
HW.app.renderAll();

/* ---- 输出独立预览文件（样式内联） ---- */
w.document.title = "预览 · AI 一体机价格监控";
const outHtml = w.document.documentElement.outerHTML
  .replace(/<link rel="stylesheet" href="assets\/app\.css">/, "<style>\n" + css + "\n</style>")
  .replace(/<script src="assets\/app\.js"><\/script>/, "");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, "<!DOCTYPE html>\n" + outHtml, "utf8");
console.log("[snapshot] 已生成 " + outPath);