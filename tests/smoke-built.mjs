/* =========================================================
   tests/smoke-built.mjs — 对 dist/ 构建产物的冒烟测试
   （真实加载打包后的 app.js，确认能正常启动）
   运行：npm run build && node tests/smoke-built.mjs
   ========================================================= */
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) {
    pass++;
    console.log("  ✓ " + msg);
  } else {
    fail++;
    console.log("  ✗ " + msg);
  }
}

const html = readFileSync(resolve(dist, "index.html"), "utf8");
const css = readFileSync(resolve(dist, "assets/app.css"), "utf8");
const js = readFileSync(resolve(dist, "assets/app.js"), "utf8");

ok(html.includes('href="assets/app.css"'), "index.html 引用打包后的 CSS");
ok(html.includes('src="assets/app.js"'), "index.html 引用打包后的 JS");
ok(!html.includes("../src/"), "产物不残留源码相对路径");
ok(css.includes("--brand:#007AFF"), "iOS 蓝色强调色已进入产物");
ok(css.includes("backdrop-filter"), "毛玻璃效果样式已进入产物");
ok(js.includes("报价单管理"), "JS 产物包含应用代码");

const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "https://quote.local/",
  pretendToBeVisual: true
});
const w = dom.window;
w.confirm = () => true;
w.alert = () => undefined;
if (!(w.URL).createObjectURL) w.URL.createObjectURL = () => "blob:stub";
if (!(w.URL).revokeObjectURL) w.URL.revokeObjectURL = () => undefined;

try {
  w.eval(js);
} catch (e) {
  console.error("  ✗ 加载打包产物失败：", e);
  process.exit(1);
}

/* 等一轮宏任务，让启动后的异步流程走完 */
await new Promise((r) => setTimeout(r, 30));

const $ = (sel) => w.document.querySelector(sel);
const $$ = (sel) => Array.from(w.document.querySelectorAll(sel));

ok(!!w.HW && !!w.HW.app, "window.HW 已建立（调试入口）");
ok($$("#qList .q-item").length === 3, "默认渲染 3 张报价单");
ok($("#qList .q-item.active") !== null, "有选中态报价单");
ok($(".kpi.hero") !== null, "主区渲染总价 KPI");
ok(/¥/.test($(".kpi.hero .v").textContent), "总价 KPI 显示金额");
ok($$(".hw-card").length >= 10, "默认报价单带示例硬件卡片（含价格）");
ok($$(".hw-spark svg").length >= 1, "示例历史价渲染出迷你走势");
ok($("#segTrend") !== null, "走势口径分段控件存在");
ok($("#bootError") && $("#bootError").hidden, "启动兜底提示未弹出");
ok(w.document.title.includes("AI 一体机价格监控"), "document.title 正确");

console.log(`\n冒烟测试：通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);