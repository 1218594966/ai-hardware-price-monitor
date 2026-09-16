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

/* ---- 塞入演示数据 ---- */
const store = HW.store;
const q = store.active();
q.name = "边缘节点标准配置";
q.note = "面向某智慧园区项目 · 双节点配置（演示数据）";
store.save(true);

const demo = [
  { name: "GPU 显卡", brand: "NVIDIA", model: "RTX 4090 24G", spec: "24GB GDDR6X · 双风扇涡轮", qty: "2", unit: "块", price: "16800" },
  { name: "CPU 处理器", brand: "Intel", model: "Xeon W7-3455", spec: "28 核 56 线程", qty: "1", unit: "颗", price: "32000" },
  { name: "内存条", brand: "Samsung", model: "32GB DDR5 ECC", spec: "32GB × 8", qty: "8", unit: "条", price: "1450" },
  { name: "SSD 固态硬盘", brand: "Samsung", model: "990 PRO 2TB", spec: "M.2 NVMe", qty: "4", unit: "块", price: "1899" }
];
const items = demo.map((d) => store.addItem(q.id, d));

const dates = ["2026-08-01", "2026-08-16", "2026-09-01", "2026-09-10"];
const prices = [
  [18000, 17200, 17000, 16800],
  [33500, 33000, 32500, 32000],
  [1520, 1500, 1480, 1450],
  [1999, 1950, 1920, 1899]
];
items.forEach((it, i) => {
  dates.forEach((d, k) => store.upsertHistory(it, d, String(prices[i][k]), k === prices[i].length - 1 ? "最新行情" : ""));
});
store.snapshotAll(q.id, "2026-09-10");
store.save(true);

/* 再补两张报价单，展示侧栏列表 */
const q2 = store.create("训练集群方案");
store.addItem(q2.id, { name: "整机", brand: "浪潮", model: "NF5468M6", spec: "8×GPU 机箱", qty: "1", unit: "台", price: "188000" });
const q3 = store.create("GPU 算力卡方案");
store.addItem(q3.id, { name: "推理卡", brand: "NVIDIA", model: "L40S 48G", qty: "4", unit: "张", price: "68000" });
store.setActive(q.id);
store.save(true);

HW.app.renderAll();

/* 打开「明细弹窗」需要点击，JSDOM 里直接调 view.modal.open */
// 先保持看板视图即可

/* ---- 输出独立预览文件（样式内联） ---- */
w.document.title = "预览 · AI 一体机价格监控";
const outHtml = w.document.documentElement.outerHTML
  .replace(/<link rel="stylesheet" href="assets\/app\.css">/, "<style>\n" + css + "\n</style>")
  .replace(/<script src="assets\/app\.js"><\/script>/, "");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, "<!DOCTYPE html>\n" + outHtml, "utf8");
console.log("[snapshot] 已生成 " + outPath);