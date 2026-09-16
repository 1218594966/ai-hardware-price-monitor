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

/* ---- 计算样式检查 ---- */
const info = await page.evaluate(() => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const appbar = cs(document.querySelector(".appbar"));
  const hero = cs(document.querySelector(".kpi.hero"));
  const card = cs(document.querySelector(".kpi"));
  const seg = cs(document.querySelector(".seg"));
  const title = cs(document.querySelector(".q-title"));
  const segActive = cs(document.querySelector(".seg button.on"));
  const hwCard = cs(document.querySelector(".hw-card"));
  return {
    appbarBackdrop: appbar ? appbar.backdropFilter || appbar.webkitBackdropFilter : "",
    appbarBg: appbar ? appbar.backgroundColor : "",
    heroBg: hero ? hero.backgroundImage : "",
    heroColor: hero ? hero.color : "",
    cardRadius: card ? card.borderRadius : "",
    segBg: seg ? seg.backgroundColor : "",
    segActiveBg: segActive ? segActive.backgroundColor : "",
    titleFont: title ? title.fontSize + " / " + title.fontWeight : "",
    titleFamily: title ? title.fontFamily : "",
    hwRadius: hwCard ? hwCard.borderRadius : "",
    bodyFont: cs(document.body).fontFamily,
    noHOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2
  };
});

ok(/blur|saturate/.test(info.appbarBackdrop || ""), "导航栏有毛玻璃 backdrop-filter：" + info.appbarBackdrop);
ok(/rgba\(250, 250, 252/.test(info.appbarBg), "导航栏半透明白底");
ok(/linear-gradient/.test(info.heroBg), "hero KPI 是渐变卡片（iOS 蓝）");
ok(info.heroColor === "rgb(255, 255, 255)", "hero KPI 白字");
ok(parseFloat(info.cardRadius) >= 16, "KPI 大圆角：" + info.cardRadius);
ok(/#E9E9EB|rgb\(233, 233, 235\)/.test(info.segBg), "分段控件 iOS 灰色底");
ok(info.segActiveBg === "rgb(255, 255, 255)", "分段控件选中段为白色");
ok(parseFloat(info.titleFont) >= 24, "报价单大标题 ≥ 24px：" + info.titleFont);
ok(/-apple-system|SF Pro|PingFang/.test(info.bodyFont), "正文使用 SF/PingFang 字体栈");
ok(parseFloat(info.hwRadius) >= 16, "硬件卡片大圆角：" + info.hwRadius);
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