/* =========================================================
   scripts/audit-ui.mjs — 用真实浏览器（Playwright + Chromium）
   对预览页做布局与样式审计 + 截图
   用法：node scripts/audit-ui.mjs [preview.html]
   ========================================================= */
import { chromium } from "playwright-core";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exec = resolve(process.env.LOCALAPPDATA, "ms-playwright/chromium-1223/chrome-win64/chrome.exe");
const preview = process.argv[2] || resolve(root, "tests/.artifacts/preview.html");
const shots = resolve(root, "tests/.artifacts");

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

const browser = await chromium.launch({ executablePath: exec, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("file://" + preview.replace(/\\/g, "/"), { waitUntil: "networkidle" });
await page.waitForTimeout(200);

/* ---- 结构检查 ---- */
ok((await page.locator("#qList .q-item").count()) === 4, "侧栏渲染 4 张报价单（3 套默认 + 1 演示）");
ok((await page.locator(".kpi.hero").count()) === 1, "渲染总价 hero KPI");
ok((await page.locator("#segTrend").count()) === 1, "渲染走势分段控件");
ok((await page.locator(".hw-card").count()) === 14, "默认报价单渲染 14 张硬件卡片（含价格）");
ok(await page.locator(".card-body svg").count().then((n) => n >= 1), "总价走势 SVG 已渲染（默认历史价）");
ok(await page.locator(".hw-spark svg").count().then((n) => n >= 1), "迷你走势 SVG 已渲染");

/* ---- 计算样式检查（守护「冷静精密」设计语言，见 styles/tokens.css） ---- */
const info = await page.evaluate(() => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const appbar = cs(document.querySelector(".appbar"));
  const hero = cs(document.querySelector(".kpi.hero"));
  const board = cs(document.querySelector(".kpis"));
  const kpi2 = cs(document.querySelectorAll(".kpi")[1]);
  const seg = cs(document.querySelector(".seg"));
  const title = cs(document.querySelector(".q-title"));
  const segActive = cs(document.querySelector(".seg button.on"));
  const hwCard = cs(document.querySelector(".hw-card"));
  const card = cs(document.querySelector(".card"));
  const total = cs(document.querySelector(".q-item .q-total"));
  const body = cs(document.body);
  return {
    appbarBackdrop: appbar ? appbar.backdropFilter || appbar.webkitBackdropFilter : "",
    appbarBg: appbar ? appbar.backgroundColor : "",
    heroBg: hero ? hero.backgroundImage : "",
    heroColor: hero ? hero.color : "",
    boardBg: board ? board.backgroundColor : "",
    boardRadius: board ? board.borderRadius : "",
    kpiDivider: kpi2 ? kpi2.borderLeftWidth + " " + kpi2.borderLeftColor : "",
    segBg: seg ? seg.backgroundColor : "",
    segActiveBg: segActive ? segActive.backgroundColor : "",
    titleFont: title ? title.fontSize + " / " + title.fontWeight : "",
    hwRadius: hwCard ? hwCard.borderRadius : "",
    cardShadow: card ? card.boxShadow : "",
    totalColor: total ? total.color : "",
    bodyFont: body.fontFamily,
    noHOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2
  };
});

ok(/blur|saturate/.test(info.appbarBackdrop || ""), "顶栏毛玻璃 backdrop-filter：" + info.appbarBackdrop);
ok(/rgba\(255, 255, 255/.test(info.appbarBg), "顶栏半透明白底（冷白，不再偏暖）：" + info.appbarBg);
ok(/linear-gradient/.test(info.heroBg), "hero KPI 是深色渐变面板");
ok(info.heroColor === "rgb(255, 255, 255)", "hero KPI 白字");
ok(info.boardBg === "rgb(255, 255, 255)", "KPI 合并为一块纯白板：" + info.boardBg);
ok(parseFloat(info.boardRadius) >= 14, "KPI 白板圆角：" + info.boardRadius);
ok(/^1px /.test(info.kpiDivider), "KPI 之间用 1px 极浅竖线分隔：" + info.kpiDivider);
ok(/rgb\(238, 240, 244\)/.test(info.segBg), "分段控件浅灰轨道：" + info.segBg);
ok(info.segActiveBg === "rgb(255, 255, 255)", "分段控件选中段为白色");
ok(parseFloat(info.titleFont) >= 22, "报价单大标题 ≥ 22px：" + info.titleFont);
ok(parseFloat(info.hwRadius) >= 14, "硬件卡片圆角：" + info.hwRadius);
ok(/-apple-system|SF Pro|Segoe|PingFang/.test(info.bodyFont), "正文使用系统无衬线字体栈");
ok(info.totalColor !== "rgb(43, 80, 232)", "侧栏金额不再滥用品牌蓝（蓝只留给主操作）：" + info.totalColor);
ok(/rgba\(16, 24, 40, 0\.0\d/.test(info.cardShadow), "卡片投影极浅，层次靠描边与留白：" + info.cardShadow);
ok(info.noHOverflow, "无横向溢出");

/* ---- 截图 ---- */
await page.screenshot({ path: resolve(shots, "audit-dashboard.png"), fullPage: false });

/* 移动端视口 */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(150);
const mobRes = await page.evaluate(() => ({
  noHOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
  sidebarBottom: getComputedStyle(document.querySelector(".sidebar")).borderBottomWidth !== "0px"
}));
ok(mobRes.noHOverflow, "移动端（390px）无横向溢出");
ok(mobRes.sidebarBottom, "移动端侧栏变为顶部横排");
await page.screenshot({ path: resolve(shots, "audit-mobile.png"), fullPage: false });

if (errors.length) {
  console.log("\n控制台错误 " + errors.length + " 条：");
  errors.slice(0, 10).forEach((e) => console.log("  - " + e));
} else {
  ok(true, "无页面控制台错误");
}

await browser.close();
console.log(`\nUI 审计：通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);