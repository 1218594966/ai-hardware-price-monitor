/* =========================================================
   tests/app.test.ts — 回归测试（vitest + jsdom，无需浏览器）
   运行：npm run test
   ========================================================= */
import { describe, it, expect, beforeAll } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import * as U from "../src/util";
import { charts } from "../src/charts";
import { store as S } from "../src/store";
import { app } from "../src/app";
import { sidebar } from "../src/views/sidebar";
import { modal } from "../src/views/modal";
import { terms } from "../src/views/terms";
import { quoteDoc } from "../src/views/quoteDoc";
import type { Quotation, TrendMode } from "../src/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(resolve(ROOT, "index.html"), "utf8");

/* ---------------- 断言辅助 ---------------- */
function ok(cond: boolean, msg: string): void {
  expect(cond, msg).toBe(true);
}
function eq(a: unknown, b: unknown, msg?: string): void {
  if (msg !== undefined) expect(a, msg).toBe(b);
  else expect(a).toBe(b);
}
function near(a: number, b: number, msg?: string): void {
  if (msg !== undefined) expect(Math.abs(a - b) < 0.005, msg).toBe(true);
  else expect(Math.abs(a - b) < 0.005).toBe(true);
}
function has(s: unknown, sub: string, msg?: string): void {
  if (msg !== undefined) expect(String(s).includes(sub), msg).toBe(true);
  else expect(String(s).includes(sub)).toBe(true);
}
function notHas(s: unknown, sub: string, msg?: string): void {
  if (msg !== undefined) expect(!String(s).includes(sub), msg).toBe(true);
  else expect(!String(s).includes(sub)).toBe(true);
}

/* ---------------- 启动一个隔离的页面 ---------------- */
interface P {
  dom: JSDOM;
  w: Window;
  $: (sel: string) => Element | null;
  $$: (sel: string) => Element[];
  btn: (scope: string, act: string) => Element | null;
}

function boot(opts: { legacy?: unknown; store?: unknown } = {}): P {
  const dom = new JSDOM(HTML, {
    runScripts: "outside-only",
    url: "https://quote.local/",
    pretendToBeVisual: true
  });
  const w: Window = dom.window as unknown as Window;

  /* jsdom 里缺的原生能力 */
  let printed = 0;
  let anchorClicks = 0;
  (w as unknown as Record<string, unknown>).print = () => {
    printed++;
  };
  (w as unknown as Record<string, unknown>).confirm = () => true;
  (w as unknown as Record<string, unknown>).alert = () => undefined;
  (w as unknown as Record<string, unknown>).__printed = () => printed;
  const WURL = (w as unknown as { URL?: { createObjectURL?: unknown; revokeObjectURL?: unknown } }).URL as { createObjectURL?: unknown; revokeObjectURL?: unknown };
  if (!WURL.createObjectURL) WURL.createObjectURL = () => "blob:stub";
  if (!WURL.revokeObjectURL) WURL.revokeObjectURL = () => undefined;
  if (!(URL as unknown as { createObjectURL?: unknown }).createObjectURL) {
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:stub";
  }
  if (!(URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL) {
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
  }
  (w as unknown as { HTMLAnchorElement: { prototype: { click: () => void } } }).HTMLAnchorElement.prototype.click = function () {
    anchorClicks++;
  };
  (w as unknown as Record<string, unknown>).__anchorClicks = () => anchorClicks;

  /* 全局环境指向这个页面对象 */
  (globalThis as unknown as Record<string, unknown>).window = w;
  (globalThis as unknown as Record<string, unknown>).document = w.document;
  (globalThis as unknown as Record<string, unknown>).localStorage = w.localStorage;
  /* 模块代码里的 confirm/alert 走 Node 全局，Node 本身没有 —— 打桩 */
  (globalThis as unknown as Record<string, unknown>).confirm = () => true;
  (globalThis as unknown as Record<string, unknown>).alert = () => undefined;

  /* 默认进入看板、总价口径（隔离测试间状态） */
  w.localStorage.setItem("ai-quote-mode", "dashboard");
  w.localStorage.setItem("ai-quote-prefs", JSON.stringify({ trendMode: "total" }));
  S.state.trendMode = "total" as TrendMode;

  if (opts.legacy) w.localStorage.setItem("ai-hardware-price-v1", JSON.stringify(opts.legacy));
  if (opts.store) w.localStorage.setItem("ai-quote-v1", JSON.stringify(opts.store));

  app.boot();

  const p: P = {
    dom,
    w,
    $: (sel: string) => w.document.querySelector(sel),
    $$: (sel: string) => Array.from(w.document.querySelectorAll(sel)),
    btn: (scope: string, act: string) => {
      const list = p.$$(scope + " [data-act]");
      for (const el of list) {
        if (el.getAttribute("data-act") === act) return el;
      }
      return null;
    }
  };
  return p;
}

function fire(w: Window, el: Element, type: string): void {
  const Evt = (w as unknown as { Event: typeof Event }).Event;
  const ev = new Evt(type, { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
}
function click(w: Window, el: Element | null): void {
  if (!el) {
    ok(false, "要点击的元素不存在");
    return;
  }
  fire(w, el, "click");
}
function setInput(w: Window, el: Element | null, v: string, type = "input"): void {
  if (!el) return;
  (el as HTMLInputElement).value = v;
  fire(w, el, type);
}

beforeAll(() => {
  /* 确保 Node 全局 URL 有 Blob 支持（Node18 起自带 createObjectURL） */
  void 0;
});

/* =========================================================
   1. 模块加载与启动
   ========================================================= */
describe("1. 模块加载与启动", () => {
  it("命名空间与视图就绪，默认生成 3 张报价单", () => {
    const p = boot();
    const w = p.w;

    expect(U.util).toBeTruthy();
    expect(charts).toBeTruthy();
    expect(S).toBeTruthy();
    expect(app).toBeTruthy();

    ok(S.all().length === 3, "默认生成 3 张报价单");
    ok(S.all()[0].items.length > 0, "默认第一张报价单带示例硬件清单");
    ok(S.all()[0].items[0].price !== "", "示例硬件带价格");
    eq(p.$$("#qList .q-item").length, 3, "左侧栏渲染出 3 个报价单卡片");
    ok(p.$("#qList .q-item.active") !== null, "第一张报价单处于选中态");
    ok(p.$(".q-title") !== null, "主区渲染出可编辑的报价单名称输入框");
    ok(p.$(".kpi.hero") !== null, "主区渲染出总价 KPI");
    ok(p.$(".seg#segTrend") !== null, "总价走势里渲染出口径切换控件");
    eq(S.get(S.state.activeId || "")!.terms.length, 5, "默认条款 5 条");
    has(w.document.title, "边缘节点标准配置", "document.title 跟着当前报价单名走");
    has(w.document.title, "AI 一体机价格监控", "document.title 保留站点名");
    ok((p.$("#bootError") as HTMLElement).hidden, "启动兜底提示保持隐藏");
  });
});

/* =========================================================
   2. 报价单名称可就地编辑
   ========================================================= */
describe("2. 报价单名称可就地编辑", () => {
  it("名称 / 备注就地编辑并同步", () => {
    const p = boot();
    const w = p.w;

    const t = p.$("#qTitle");
    ok(t !== null, "找到名称输入框 #qTitle");
    eq(t!.tagName, "INPUT", "名称是输入框（点击即可改）");
    setInput(w, t, "边缘节点 A 方案");

    eq(S.active()!.name, "边缘节点 A 方案", "输入即时写入数据层");
    eq(p.$("#qList .q-item.active .q-name")?.textContent, "边缘节点 A 方案", "左侧栏同步刷新");
    has(w.document.title, "边缘节点 A 方案", "窗口标题同步");

    setInput(w, p.$("#qNote"), "面向 XX 项目");
    eq(S.active()!.note, "面向 XX 项目", "备注可就地编辑");

    app.renderMain();
    eq((p.$("#qTitle") as HTMLInputElement).value, "边缘节点 A 方案", "重绘后名称保持用户输入（不回落）");

    /* 编辑模式里的标题也能改 */
    app.setMode("editor");
    setInput(w, p.$("#eqTitle"), "边缘节点 B 方案");
    eq(S.active()!.name, "边缘节点 B 方案", "编辑清单里的标题同样可改");
    eq(p.$("#qList .q-item.active .q-name")?.textContent, "边缘节点 B 方案", "编辑时侧栏也跟着变");
  });
});

/* =========================================================
   3. 编辑清单：增删改硬件 + 自动记价
   ========================================================= */
describe("3. 编辑清单 / 增删改 / 自动记价", () => {
  it("新增、编辑、移动、删除硬件，改单价自动记录当天", () => {
    const p = boot();
    const w = p.w;

    const q = S.create("测试清单");
    S.setActive(q.id);
    eq(q.items.length, 0, "新建报价单初始没有硬件");

    app.setMode("editor");
    ok(p.$("table.sheet") !== null, "进入编辑模式后渲染出表格");
    has(p.$("#sheetBody")?.textContent, "清单是空的", "空清单有占位提示");

    click(w, p.btn(".q-actions", "add"));
    eq(S.active()!.items.length, 1, "点击「＋ 添加硬件」新增 1 项");
    eq(p.$$("#sheetBody tr").length, 1, "表格里出现 1 行");

    let row = p.$("#sheetBody tr")!;
    setInput(w, row.querySelector('input[data-f="name"]'), "GPU 显卡");
    setInput(w, row.querySelector('input[data-f="brand"]'), "NVIDIA");
    setInput(w, row.querySelector('input[data-f="model"]'), "RTX 4090 24G");
    setInput(w, row.querySelector('textarea[data-f="spec"]'), "24GB GDDR6X");
    setInput(w, row.querySelector('input[data-f="qty"]'), "2");

    eq(S.active()!.items[0].name, "GPU 显卡", "产品名称写入");
    eq(S.active()!.items[0].brand, "NVIDIA", "品牌写入");
    eq(S.active()!.items[0].spec, "24GB GDDR6X", "基本参数写入");
    eq(S.active()!.items[0].qty, "2", "数量写入");

    let priceIn = row.querySelector<HTMLInputElement>('input[data-f="price"]')!;
    setInput(w, priceIn, "16800");
    eq(S.active()!.items[0].price, "16800", "手动输入单价");
    near(S.totalOf(q, "total"), 33600, "合计 = 单价 × 数量");
    has(p.$("#fTotal")?.textContent, "33,600", "表尾合计按数量相乘显示");

    /* 单价 -> 离开输入框 -> 自动留一条当天记录 */
    fire(w, priceIn, "change");
    eq(S.histOf(S.active()!.items[0]).length, 1, "改完单价自动记下当天一条价格");
    eq(S.histOf(S.active()!.items[0])[0].date, U.todayISO(), "记录日期为今天");
    has(p.$("#sheetBody")?.innerHTML, "sparkline", "表格走势列渲染出迷你图");

    /* 重绘后元素会换，必须重新取 */
    row = p.$("#sheetBody tr")!;
    priceIn = row.querySelector<HTMLInputElement>('input[data-f="price"]')!;
    setInput(w, priceIn, "17a,000.5");
    eq(S.active()!.items[0].price, "17000.5", "单价输入过滤掉非数字字符");
    setInput(w, priceIn, "16800");

    setInput(w, row.querySelector('input[data-f="link"]'), "item.jd.com/100");
    eq(S.active()!.items[0].link, "item.jd.com/100", "商品链接可自定义");
    eq(U.normalizeLink("item.jd.com/100"), "https://item.jd.com/100", "缺协议的链接自动补全");
    eq(U.normalizeLink("https://x.com/a"), "https://x.com/a", "已带协议的不重复加");

    setInput(w, row.querySelector('input[data-f="qty"]'), "3");
    eq(S.active()!.items[0].qty, "3", "数量可改");
    setInput(w, row.querySelector('input[data-f="qty"]'), "2");

    /* 第二项 */
    click(w, p.btn(".q-actions", "add"));
    eq(S.active()!.items.length, 2, "再加一项");
    const row2 = p.$$("#sheetBody tr")[1];
    setInput(w, row2.querySelector('input[data-f="name"]'), "内存条");
    setInput(w, row2.querySelector('input[data-f="price"]'), "1200");
    eq(S.active()!.items[1].name, "内存条", "第二项名称写入");

    click(w, p.$$("#sheetBody tr")[1].querySelector('[data-act="up"]'));
    eq(S.active()!.items[0].name, "内存条", "上移按钮生效");
    eq(S.active()!.items[1].name, "GPU 显卡", "上移后原第一项退到第二位");

    click(w, p.$$("#sheetBody tr")[0].querySelector('[data-act="del"]'));
    eq(S.active()!.items.length, 1, "删除按钮生效");
    eq(S.active()!.items[0].name, "GPU 显卡", "删掉的是被上移到首位的那一项");

    const rows = p.$$("#sheetBody tr");
    ok((rows[0].querySelector('[data-act="up"]') as HTMLButtonElement).disabled, "首行「上移」置灰");
    ok((rows[0].querySelector('[data-act="down"]') as HTMLButtonElement).disabled, "末行「下移」置灰");

    /* 返回看板 */
    click(w, p.btn(".q-actions", "done"));
    ok(p.$(".hw-grid") !== null, "「完成，返回看板」切回看板视图");
    eq(p.$$(".hw-card").length, 1, "看板渲染出 1 张硬件卡片");
    has(p.$(".hw-card")?.textContent, "GPU 显卡", "硬件卡片显示名称");
    has(p.$(".hw-card")?.textContent, "33,600", "硬件卡片显示小计");
  });
});

/* =========================================================
   4. 总价走势：一天也要显示 / 口径切换 / 涨跌配色
   ========================================================= */
describe("4. 总价走势（含单日显示与口径切换）", () => {
  it("单日基线、两点折线、口径切换、涨红跌绿", () => {
    const p = boot();
    const w = p.w;

    const q = S.create("走势测试");
    S.setActive(q.id);
    S.addItem(q.id, { name: "整机", qty: "1", unit: "台", price: "100000" });
    S.addItem(q.id, { name: "硬盘", qty: "2", unit: "块", price: "30000" });
    app.renderAll();

    /* 一个记录日 —— 必须显示 */
    S.snapshotAll(q.id, "2026-09-01");
    app.renderMain();
    ok(!!p.$(".card-body svg"), "只有 1 个记录日时总价走势照样渲染");
    has(p.$(".card-body")?.innerHTML, "stroke-dasharray", "单日走势画成虚线基线");
    has(p.$(".card-body")?.innerHTML, "1 个记录日", "单日时有文字说明");
    near(S.seriesOf(q, "total")[0].price, 160000, "首日实际总价 = 100000 + 30000×2");

    /* 第二个记录日 */
    S.upsertHistory(q.items[0], "2026-09-10", "120000", "涨价");
    app.renderMain();
    eq(S.seriesOf(q, "total").length, 2, "两个记录日连成两点");
    has(p.$(".card-body")?.innerHTML, "polyline", "两点以上画折线");
    notHas(p.$(".card-body")?.innerHTML, "stroke-dasharray", "多点时不再画虚线基线");
    near(S.seriesOf(q, "total")[1].price, 180000, "第二日总价 = 120000 + 60000");
    near(S.deltaOf(q)!.diff, 20000, "较首日变动 = +20000");
    ok(p.$(".kpi .delta.up") !== null, "涨价用涨色");
    has(p.$(".kpi .delta")?.textContent, "+", "变动值带正号");

    /* 口径切换 */
    click(w, p.$('#segTrend [data-mode="unit"]'));
    eq(S.state.trendMode, "unit", "点击后切换为「单价之和」");
    near(S.seriesOf(q, "unit")[0].price, 130000, "单价之和 = 100000 + 30000，不加数量");
    near(S.seriesOf(q, "unit")[1].price, 150000, "第二日单价之和 = 120000 + 30000");
    has(p.$(".kpi.hero .k")?.textContent, "单价之和", "KPI 标题随口径变化");
    has(p.$("#segTrend .on")?.textContent, "单价之和", "分段控件高亮跟随");
    notHas(p.$(".card-body")?.innerHTML, "1.4万 ¥1.4万", "轴标签不重复");

    click(w, p.$('#segTrend [data-mode="total"]'));
    eq(S.state.trendMode, "total", "切回「实际总价」");

    /* 涨跌配色（中国习惯：涨红跌绿，iOS 红 #FF3B30 / 绿 #34C759） */
    has(
      charts.line([{ date: "2026-09-01", price: 100 }, { date: "2026-09-10", price: 200 }]),
      "#FF3B30",
      "上涨用红色 #FF3B30"
    );
    has(
      charts.line([{ date: "2026-09-01", price: 200 }, { date: "2026-09-10", price: 100 }]),
      "#34C759",
      "下跌用绿色 #34C759"
    );
    has(
      charts.spark([{ date: "2026-09-01", price: 200 }, { date: "2026-09-10", price: 100 }]),
      "#34C759",
      "迷你走势同样涨红跌绿"
    );
  });
});

/* =========================================================
   5. 单品明细弹窗
   ========================================================= */
describe("5. 单品价格明细弹窗", () => {
  it("打开、数据、补录、改价、合并、删除、清空、关闭回写", () => {
    const p = boot();
    const w = p.w;

    const q = S.create("明细测试");
    S.setActive(q.id);
    const it = S.addItem(q.id, { name: "GPU", qty: "2", unit: "块", price: "16000", brand: "NVIDIA", model: "RTX 4090" })!;
    S.upsertHistory(it, "2026-08-01", "18000", "");
    S.upsertHistory(it, "2026-09-01", "16000", "降价");
    app.renderAll();

    click(w, p.$(".hw-card"));
    ok(!(p.$("#itemMask") as HTMLElement).hidden, "点击卡片打开明细弹窗");
    eq(p.$("#mTitle")?.textContent, "GPU", "弹窗标题是硬件名");
    has(p.$("#mSub")?.innerHTML, "NVIDIA", "副标题含品牌型号");
    has(p.$("#mSub")?.innerHTML, "16,000.00", "副标题含当前单价");
    has(p.$("#mSub")?.innerHTML, "块", "副标题含数量单位");
    eq(p.$$("#mStats .mstat").length, 7, "统计卡渲染 7 项");
    ok(!!p.$("#mChart svg"), "弹窗内渲染出走势图");
    eq(p.$$("#recList tbody tr").length, 2, "记录表列出 2 条");
    has(p.$("#recCount")?.textContent, "共 2 条", "记录数提示");
    has(p.$("#recList")?.innerHTML, "rec-delta down", "环比降价用跌色");
    has(p.$("#recList")?.innerHTML, "最新", "最新一条有标记");
    has(p.$("#recList")?.innerHTML, "首条", "第一条标注为首条");

    /* 补录 */
    (p.$("#recDate") as HTMLInputElement).value = "2026-09-15";
    (p.$("#recPrice") as HTMLInputElement).value = "15500";
    (p.$("#recNote") as HTMLInputElement).value = "供应商 A";
    click(w, p.$("#recAdd"));
    eq(S.histOf(it).length, 3, "添加记录后变 3 条");
    eq(S.histOf(it)[2].note, "供应商 A", "备注一并写入");
    eq((p.$("#recPrice") as HTMLInputElement).value, "", "添加后价格输入框清空");
    eq((p.$("#recNote") as HTMLInputElement).value, "", "添加后备注输入框清空");

    /* 就地改价格 */
    setInput(w, p.$('#recList input[data-rf="price"]'), "19000");
    eq(S.histOf(it)[0].price, "19000", "弹窗里能直接改历史单价");
    has(p.$("#mStats")?.textContent, "19,000.00", "统计随改价刷新");

    /* 改日期到已存在的日期 -> 合并 */
    const dateIn = p.$('#recList input[data-rf="date"]') as HTMLInputElement;
    dateIn.value = "2026-09-01";
    fire(w, dateIn, "change");
    eq(S.histOf(it).filter((h) => h.date === "2026-09-01").length, 1, "改到已有日期时合并为一条，不重复");

    /* 删除一条 */
    const before = S.histOf(it).length;
    click(w, p.$('#recList [data-act="recdel"]'));
    eq(S.histOf(it).length, before - 1, "删除单条记录生效");

    /* 关闭后回写看板 */
    click(w, p.$(".panel-head [data-close]"));
    ok((p.$("#itemMask") as HTMLElement).hidden, "关闭弹窗");
    has(p.$(".hw-card")?.innerHTML, "sparkline", "关闭后看板卡片走势已刷新");

    /* 点遮罩空白处也能关 */
    click(w, p.$(".hw-card"));
    ok(!(p.$("#itemMask") as HTMLElement).hidden, "再次打开");
    fire(w, p.$("#itemMask")!, "click");
    ok((p.$("#itemMask") as HTMLElement).hidden, "点击遮罩空白处关闭");

    /* 清空 */
    click(w, p.$(".hw-card"));
    click(w, p.$("#recClear"));
    eq(S.histOf(it).length, 0, "清空后没有记录");
    has(p.$("#mChart")?.textContent, "还没有价格记录", "图表空态提示");
    eq(p.$$("#recList tbody tr").length, 0, "记录表清空");
    click(w, p.$(".panel-head [data-close]"));
  });
});

/* =========================================================
   6. 报价条款：不写死、可增删改、随报价单走
   ========================================================= */
describe("6. 报价条款（可编辑，不写死）", () => {
  it("条款增删改与按报价单隔离", () => {
    const p = boot();
    const w = p.w;

    S.addItem(S.active()!.id, { name: "主机", qty: "1", unit: "台", price: "120000" });
    app.renderAll();

    const firstId = S.active()!.id;
    click(w, p.btn("#qActions", "terms"));
    ok(!(p.$("#termsMask") as HTMLElement).hidden, "打开条款弹窗");
    has(p.$("#termsSub")?.textContent, S.active()!.name, "弹窗说明带上当前报价单名");
    eq(p.$$("#termsTable tbody tr").length, 5, "默认 5 条条款列在表里");

    const l0 = p.$('#termsTable input[data-tf="label"]');
    const v0 = p.$$('#termsTable input[data-tf="value"]')[0];
    eq((l0 as HTMLInputElement).value, "报价有效期", "第一条默认条款名");
    setInput(w, l0, "有效期");
    setInput(w, v0, "自报价之日起 60 天");
    eq(S.get(firstId)!.terms[0].label, "有效期", "条款名可改");
    eq(S.get(firstId)!.terms[0].value, "自报价之日起 60 天", "条款内容可改");

    click(w, p.btn("#termsMask", "termadd"));
    eq(S.get(firstId)!.terms.length, 6, "新增一条条款");
    const labels = p.$$('#termsTable input[data-tf="label"]');
    const vals = p.$$('#termsTable input[data-tf="value"]');
    setInput(w, labels[5], "安装调试");
    setInput(w, vals[5], "含上门安装调试");
    eq(S.get(firstId)!.terms[5].value, "含上门安装调试", "新条款内容写入");
    eq(S.get(firstId)!.terms[5].label, "安装调试", "新条款名写入");

    click(w, p.$$('#termsTable [data-act="termdel"]')[1]);
    eq(S.get(firstId)!.terms.length, 5, "删除条款生效");
    eq(S.get(firstId)!.terms[0].label, "有效期", "删掉的是第 2 条（原「交货周期」）");
    eq(S.get(firstId)!.terms[1].label, "付款方式", "后续条款前移");

    /* 条款随报价单走，不互相干扰 */
    const other = S.create();
    eq(other.terms.length, 5, "新建报价单有自己的 5 条默认条款");
    eq(other.terms[0].label, "报价有效期", "新建报价单不受上一张的改动影响");
    eq(S.get(firstId)!.terms[0].label, "有效期", "原报价单的改动仍保留");

    click(w, p.btn("#termsMask", "termreset"));
    eq(S.get(firstId)!.terms[0].label, "报价有效期", "「恢复默认条款」可还原");

    click(w, p.$("#termsMask [data-close]"));
    ok((p.$("#termsMask") as HTMLElement).hidden, "关闭条款弹窗");
  });
});

/* =========================================================
   7. 生成报价单（打印 / PDF）
   ========================================================= */
describe("7. 生成报价单", () => {
  it("报价单 HTML、大写金额、打印触发与空态拒绝", () => {
    const p = boot();
    const w = p.w;

    const q = S.create("打印测试");
    S.setActive(q.id);
    q.name = "边缘节点标准配置";
    S.addItem(q.id, { name: "GPU 显卡", brand: "NVIDIA", model: "RTX 4090 24G", spec: "24GB GDDR6X", qty: "2", unit: "块", price: "16800" });
    S.addItem(q.id, { name: "CPU", brand: "Intel", model: "Xeon W7", spec: "", qty: "1", unit: "颗", price: "32000" });
    app.renderAll();

    near(S.totalOf(q, "total"), 65600, "合计 = 16800×2 + 32000");

    const html = quoteDoc.build(q);
    has(html, "报 价 单", "含标题");
    has(html, "QUOTATION", "含英文副标题");
    has(html, q.docNo, "含报价单编号");
    has(html, "边缘节点标准配置", "含项目名称");
    has(html, "33,600.00", "含第一项小计");
    has(html, "65,600.00", "含合计金额");
    has(html, "大写：人民币", "含大写金额行");
    has(html, "报价方（盖章）", "含签署栏");
    has(html, "共 2 项硬件", "含件数统计");

    /* 条款来自数据，不是写死的 */
    q.terms = [{ label: "有效期", value: "20 天" }, { label: "运费", value: "包邮" }];
    const html2 = quoteDoc.build(q);
    has(html2, "有效期", "自定义条款名出现在报价单上");
    has(html2, "20 天", "自定义条款内容出现在报价单上");
    has(html2, "包邮", "第二条自定义条款也出现");
    notHas(html2, "自报价之日起 30 天", "写死的旧条款不再出现");
    notHas(html2, "预付 30%", "写死的付款方式不再出现");

    /* 奇数条条款也能排 */
    q.terms = [{ label: "A", value: "1" }, { label: "B", value: "2" }, { label: "C", value: "3" }];
    const html3 = quoteDoc.build(q);
    has(html3, "colspan", "奇数条条款时最后一条独占一行");

    /* 大写金额 */
    eq(U.rmbUpper(65600), "陆万伍仟陆佰元整", "大写金额（65600）");
    eq(U.rmbUpper(0), "零元整", "大写金额：0");
    eq(U.rmbUpper(1000000), "壹佰万元整", "大写金额：100 万");
    eq(U.rmbUpper(1234.56), "壹仟贰佰叁拾肆元伍角陆分", "大写金额含角分");
    eq(U.rmbUpper(1005), "壹仟零伍元整", "大写金额含零位");
    eq(U.rmbUpper(100.5), "壹佰元伍角整", "大写金额：仅有角");

    /* 点按钮 -> 写入 #quoteDoc 并触发打印 */
    q.terms = [{ label: "特别条款", value: "含五年上门质保" }];
    const realSetTimeout = globalThis.setTimeout;
    (globalThis as unknown as { setTimeout: typeof setTimeout }).setTimeout = ((fn: () => void) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
      return 0;
    }) as typeof setTimeout;
    try {
      click(w, p.btn("#qActions", "quote"));
      ok(p.$("#quoteDoc")!.innerHTML.length > 200, "报价单文档已写入 #quoteDoc");
      eq((w as unknown as { __printed(): number }).__printed(), 1, "触发了打印（可在打印预览里另存为 PDF）");
      has(p.$("#quoteDoc")?.innerHTML, "含五年上门质保", "生成的文档用的是当前这份条款");
      notHas(p.$("#quoteDoc")?.innerHTML, "自报价之日起 30 天", "生成的文档里没有写死的旧条款");
      has(w.document.querySelector(".quote-doc")!.className, "quote-doc", "打印文档容器类名正确（屏幕上隐藏）");
    } finally {
      (globalThis as unknown as { setTimeout: typeof setTimeout }).setTimeout = realSetTimeout;
    }

    /* 没有单价时不生成 */
    const q3 = S.create();
    S.setActive(q3.id);
    S.addItem(q3.id, { name: "待定", qty: "1", unit: "台", price: "" });
    app.renderAll();
    const beforeHtml = p.$("#quoteDoc")!.innerHTML;
    eq(quoteDoc.generateAndPrint(q3.id), false, "没有单价的报价单拒绝生成");
    eq(p.$("#quoteDoc")!.innerHTML, beforeHtml, "拒绝生成时不会污染已有的报价单文档");

    /* 空清单也不生成 */
    const q5 = S.create();
    eq(quoteDoc.generateAndPrint(q5.id), false, "空清单拒绝生成");

    /* 未报价的项显示占位 */
    const q4 = S.create();
    q4.name = "半成品";
    S.addItem(q4.id, { name: "已报价", qty: "1", unit: "台", price: "100" });
    S.addItem(q4.id, { name: "没报价", qty: "1", unit: "台", price: "" });
    const h4 = quoteDoc.build(q4);
    has(h4, "未报价", "没填单价的项显示「未报价」占位");
    near(S.totalOf(q4, "total"), 100, "未报价的项按 0 计入合计");
  });
});

/* =========================================================
   8. JSON 导入导出
   ========================================================= */
describe("8. JSON 导入导出", () => {
  it("导出下载、新老格式导入、脏数据兜底", () => {
    const p = boot();
    const w = p.w;

    const q = S.active()!;
    q.name = "导出用报价单";
    S.addItem(q.id, { name: "主板", qty: "2", unit: "块", price: "8000" });
    S.snapshotAll(q.id, "2026-09-01");

    click(w, p.$("#btnExport"));
    eq((w as unknown as { __anchorClicks(): number }).__anchorClicks(), 1, "导出时触发了下载");

    const payload = {
      app: "AI 一体机 · 报价单管理",
      version: 2,
      quotations: [
        {
          id: "qA",
          name: "导入方案甲",
          note: "来自文件",
          docNo: "Q-20260916-01",
          createdAt: "2026-09-10",
          terms: [{ label: "质保", value: "5 年" }],
          items: [
            {
              id: "iA",
              name: "交换机",
              brand: "H3C",
              model: "S5130",
              spec: "24 口",
              qty: "3",
              unit: "台",
              price: "3600",
              link: "h3c.com/x",
              history: [
                { date: "2026-09-01", price: "3500", note: "" },
                { date: "2026-09-10", price: "3600", note: "调价" }
              ]
            }
          ]
        },
        { id: "qB", name: "导入方案乙", items: [] }
      ]
    };
    app.applyImport(payload);

    eq(S.all().length, 2, "导入后报价单数量 = 2");
    eq(S.active()!.name, "导入方案甲", "导入后自动选中第一张");
    eq(S.all()[0].items[0].name, "交换机", "硬件保留");
    eq(S.histOf(S.all()[0].items[0]).length, 2, "价格历史保留");
    eq(S.all()[0].terms[0].value, "5 年", "条款保留");
    eq(S.all()[0].docNo, "Q-20260916-01", "单据编号保留");
    near(S.totalOf(S.all()[0], "total"), 10800, "导入后合计可算：3600×3");
    eq(S.all()[1].terms.length, 5, "空条款的报价单自动补默认条款");
    eq(S.all()[1].items.length, 0, "空清单也接住");
    eq(p.$$("#qList .q-item").length, 2, "侧栏随之刷新");

    /* 旧版（纯数组）JSON */
    app.applyImport([
      { name: "旧版硬件", brand: "A", model: "M1", qty: 1, unit: "个", price: "500", history: [{ date: "2026-08-01", price: "500" }] }
    ]);
    eq(S.all().length, 1, "旧版数组导入为 1 张报价单");
    eq(S.all()[0].items.length, 1, "旧版数组里的硬件被接住");
    ok(!!S.all()[0].items[0].id, "旧版导入的硬件补上了 id");
    eq(S.all()[0].items[0].history[0].price, "500", "旧版历史价格保留");
    eq(S.all()[0].items[0].name, "旧版硬件", "旧版名称保留");

    /* 缺 id / 缺 qty 的脏数据也能扛 */
    app.applyImport([{ name: "脏数据", price: "9.9" }]);
    eq(S.all()[0].items[0].qty, "1", "缺失数量时补默认 1");
    ok(!!S.all()[0].items[0].id, "缺失 id 时自动补");

    /* 没有有效内容不崩 */
    app.applyImport({ hello: "world" });
    eq(S.all().length, 1, "无有效内容时保持原样不报错");
    app.applyImport([]);
    eq(S.all().length, 1, "空数组不破坏现有数据");
  });
});

/* =========================================================
   9. 旧版单文件数据自动迁移
   ========================================================= */
describe("9. 旧版数据自动迁移", () => {
  it("旧版 localStorage 数据自动接住", () => {
    const legacy = [
      { name: "GPU", brand: "NVIDIA", model: "RTX 4090", spec: "24G", qty: 2, unit: "块", price: "16000", link: "item.jd.com/1", history: [{ date: "2026-08-01", price: "18000" }, { date: "2026-09-01", price: "16000" }] },
      { name: "电源", brand: "长城", model: "1250W", spec: "", qty: 1, unit: "个", price: "800", link: "", history: [] }
    ];
    const p = boot({ legacy });

    eq(S.all().length, 3, "旧版数据落进第一张，并补足 3 张报价单");
    const q1 = S.all()[0];
    eq(q1.items.length, 2, "旧版 2 项硬件全部接住");
    eq(q1.items[0].name, "GPU", "硬件名称保留");
    eq(q1.items[0].qty, "2", "数量保留");
    eq(q1.items[0].link, "item.jd.com/1", "商品链接保留");
    near(S.totalOf(q1, "total"), 16000 * 2 + 800, "旧版数据合计正确");
    eq(S.histOf(q1.items[0]).length, 2, "旧版价格历史保留");
    has(q1.note, "旧版", "迁移来源有标注");
    ok(S.all()[1].items.length > 0, "其它默认报价单保留示例配置");
    ok(!!p.w.localStorage.getItem("ai-quote-v1"), "迁移结果已写入新版存储键");
  });
});

/* =========================================================
   10. 侧栏切换 / 新建 / 复制 / 删除
   ========================================================= */
describe("10. 侧栏切换与报价单增删", () => {
  it("切换、复制、新建、删除与最后一张保护", () => {
    const p = boot();
    const w = p.w;

    const items = p.$$("#qList .q-item");
    eq(items.length, 3, "3 张报价单");
    click(w, items[2]);
    eq(S.state.activeId, S.all()[2].id, "点侧栏第 3 张 → 切为当前");
    ok(p.$$("#qList .q-item")[2].classList.contains("active"), "选中态跟随移动");
    eq((p.$("#qTitle") as HTMLInputElement).value, S.all()[2].name, "主区跟着换成第 3 张");

    /* 新建一张空清单，验证各报价单配置互相独立 */
    const fresh = S.create("隔离测试");
    S.setActive(fresh.id);
    S.addItem(fresh.id, { name: "只在隔离清单里", qty: "1", unit: "个", price: "100" });
    app.renderAll();
    eq(fresh.items.length, 1, "新清单有 1 项");
    ok(S.all()[0].items.length > 0, "默认第一张仍保留示例清单（互不干扰）");
    has(p.$(".hw-card")?.textContent, "只在隔离清单里", "看板显示的是当前那张");

    /* 复制 */
    click(w, p.btn("#qActions", "dup"));
    eq(S.all().length, 5, "复制后变 5 张");
    eq(S.all()[4].name, "隔离测试 副本", "副本名字带「副本」");
    eq(S.all()[4].items.length, 1, "副本把硬件也复制了");
    eq(S.state.activeId, S.all()[4].id, "复制后自动切到副本");

    /* 副本是深拷贝，改它不影响原张 */
    S.all()[4].items[0].price = "999";
    eq(S.all()[3].items[0].price, "100", "副本与原张的硬件互不影响");

    /* 新建 */
    click(w, p.$("#btnNewQuote"));
    eq(S.all().length, 6, "「＋ 新建」新增一张");
    eq(app.mode(), "editor", "新建后直接进入编辑清单，方便录入");

    /* 删除 */
    app.setMode("dashboard");
    S.setActive(S.all()[0].id);
    app.renderAll();
    click(w, p.btn("#qActions", "del"));
    eq(S.all().length, 5, "删除后剩 5 张");

    /* 只剩一张时不允许删 */
    while (S.all().length > 1) S.remove(S.all()[1].id);
    app.renderAll();
    click(w, p.btn("#qActions", "del"));
    eq(S.all().length, 1, "最后一张报价单被保护，删不掉");
  });
});

/* =========================================================
   11. 「记录该日价格」与覆盖
   ========================================================= */
describe("11. 「记录该日价格」与覆盖", () => {
  it("记录、覆盖、补录、无价提示", () => {
    const p = boot();
    const w = p.w;

    const q = S.create("记价测试");
    S.setActive(q.id);
    S.addItem(q.id, { name: "A", qty: "1", unit: "个", price: "100" });
    S.addItem(q.id, { name: "B", qty: "1", unit: "个", price: "200" });
    S.addItem(q.id, { name: "C", qty: "1", unit: "个", price: "" });
    app.renderAll();

    function snap(dateISO: string): void {
      (p.$("#snapDate") as HTMLInputElement).value = dateISO;
      click(w, p.btn("#qActions", "snap"));
    }

    snap("2026-09-05");
    eq(S.allDates(q).length, 1, "记下一个记录日");
    eq(S.countOnDate(q.id, "2026-09-05"), 2, "只记录了有单价的 2 项（第 3 项没单价被跳过）");
    near(S.seriesOf(q, "total")[0].price, 300, "当日总价 = 100 + 200");

    /* 改价后重记同一天 → 覆盖，不堆叠 */
    S.active()!.items[0].price = "150";
    snap("2026-09-05");
    eq(S.countOnDate(q.id, "2026-09-05"), 2, "同一天覆盖后仍是 2 条（不重复堆积）");
    near(S.seriesOf(q, "total")[0].price, 350, "覆盖后总价 = 150 + 200");
    eq(S.allDates(q).length, 1, "仍然只有 1 个记录日");

    /* 补录过去的日期 */
    snap("2026-08-01");
    eq(S.allDates(q).length, 2, "可以补录更早的日期");
    eq(S.allDates(q)[0], "2026-08-01", "记录日按日期升序");
    eq(S.seriesOf(q, "total")[0].date, "2026-08-01", "走势序列按日期升序");

    /* 没有单价时提示而不是静默失败 */
    const q2 = S.create();
    S.setActive(q2.id);
    S.addItem(q2.id, { name: "没价", qty: "1", unit: "个", price: "" });
    app.renderAll();
    snap("2026-09-05");
    eq(S.countOnDate(q2.id, "2026-09-05"), 0, "完全没有单价时不写入记录");
  });
});

/* =========================================================
   12. 持久化 / 刷新
   ========================================================= */
describe("12. 持久化 / 刷新后数据仍在", () => {
  it("localStorage 持久化与偏好保持", () => {
    const p = boot();
    const w = p.w;

    const q = S.create("持久化");
    S.setActive(q.id);
    S.rename(q.id, "会持久化的名字");
    S.addItem(q.id, { name: "持久化硬件", qty: "1", unit: "个", price: "123" });
    S.upsertHistory(S.active()!.items[0], "2026-09-01", "123", "");
    S.save(true);

    const dumped = w.localStorage.getItem("ai-quote-v1");
    ok(!!dumped, "数据已写入 localStorage");

    /* 用同一份数据重开一个页面 */
    const p2 = boot({ store: JSON.parse(dumped!) });
    const w2 = p2.w;

    eq(
      S.all().length,
      (JSON.parse(dumped!) as { quotations: unknown[] }).quotations.length,
      "报价单数量在刷新后保持"
    );
    eq(S.active()!.name, "会持久化的名字", "改过的名字在刷新后保持");
    eq(S.active()!.items[0].name, "持久化硬件", "新增的硬件在刷新后保持");
    eq(S.active()!.items[0].price, "123", "单价在刷新后保持");
    eq(S.histOf(S.active()!.items[0]).length, 1, "价格记录在刷新后保持");
    eq((p2.$("#qTitle") as HTMLInputElement).value, "会持久化的名字", "刷新后主区直接显示正确名字");
    has(p2.$(".hw-card")?.innerHTML, "sparkline", "刷新后走势图照常渲染");

    /* 走势口径偏好 */
    const p3 = boot();
    S.setTrendMode("unit");

    const p4 = boot();
    p4.w.localStorage.setItem("ai-quote-prefs", p3.w.localStorage.getItem("ai-quote-prefs") || "");
    app.boot();
    eq(S.state.trendMode, "unit", "走势口径偏好在刷新后保持");
    has(p4.w.document.querySelector("#segTrend .on")?.textContent, "单价之和", "刷新后分段控件高亮一致");
  });
});

/* =========================================================
   13. 首次运行默认报价单
   ========================================================= */
describe("13. 首次运行默认报价单", () => {
  it("默认 3 张、编号与顶栏按钮", () => {
    const p = boot();
    const w = p.w;

    const names = S.all().map((q) => q.name);
    eq(names.length, 3, "默认 3 张");
    eq(names[0], "边缘节点标准配置", "第一张名为「边缘节点标准配置」");
    eq(names[1], "轻量推理节点", "第二张为「轻量推理节点」");
    eq(names[2], "双卡训练工作站", "第三张为「双卡训练工作站」");
    eq(S.all()[0].docNo.indexOf("Q-"), 0, "自动生成报价单编号");
    ok(S.all()[0].items.length > 0, "默认报价单带示例硬件清单");
    ok(S.histOf(S.all()[0].items[0]).length > 0, "默认报价单带历史价格走势");
    ok(S.all()[0].items.filter((it) => it.link).length >= 10, "默认清单 10 条以上带商品链接");
    eq(S.all()[0].items.find((it) => it.name === "大模型显卡")?.link, "https://item.jd.com/100251181311.html", "大模型显卡链接正确");
    ok(p.$("#btnExport") !== null && p.$("#btnImport") !== null, "顶栏保留 JSON 导入导出");
    ok(p.$("#btnNewQuote") !== null, "侧栏顶部有「＋ 新建」");
  });
});

/* =========================================================
   14. 一键复制某日价格
   ========================================================= */
describe("14. 一键复制某日价格", () => {
  it("把上一价格日的价格复制到目标日", () => {
    const p = boot();
    const w = p.w;

    const q = S.create("复制测试");
    S.setActive(q.id);
    S.addItem(q.id, { name: "A", qty: "1", unit: "个", price: "100" });
    S.addItem(q.id, { name: "B", qty: "1", unit: "个", price: "200" });
    S.addItem(q.id, { name: "C", qty: "1", unit: "个", price: "" }); // 没单价，不该被复制
    S.addItem(q.id, { name: "D", qty: "1", unit: "个", price: "300" });
    app.renderAll();

    /* 先建 9.16 基线（只有有单价的 3 项） */
    S.snapshotAll(q.id, "2026-09-16");
    eq(S.countOnDate(q.id, "2026-09-16"), 3, "9.16 基线记录 3 项（C 无单价被跳过）");
    app.renderAll();
    eq((p.$("#copySrc") as HTMLSelectElement).disabled, false, "有价格记录日后来源下拉可用");
    eq((p.$("#copySrc") as HTMLSelectElement).value, "2026-09-16", "默认来源日 = 最近一个价格日");

    /* 目标日 9.17：选好来源日（默认 9.16），一键复制 */
    (p.$("#snapDate") as HTMLInputElement).value = "2026-09-17";
    (p.$("#copySrc") as HTMLSelectElement).value = "2026-09-16";
    click(w, p.btn("#qActions", "copy"));
    eq(S.countOnDate(q.id, "2026-09-17"), 3, "9.17 复制到 3 项");
    eq(S.histOf(q.items[0]).filter((h) => h.date === "2026-09-17")[0].price, "100", "A 的 9.17 = 9.16 价格 100");
    eq(S.histOf(q.items[1]).filter((h) => h.date === "2026-09-17")[0].price, "200", "B 的 9.17 = 9.16 价格 200");
    eq(S.allDates(q).length, 2, "报价单有两个记录日（9.16 + 9.17）");
    near(S.seriesOf(q, "total")[1].price, 600, "9.17 总价 = 100 + 200 + 300");

    /* 目标日已有记录：复制会覆盖（confirm 桩返回 true） */
    S.upsertHistory(q.items[0], "2026-09-18", "111", "");
    (p.$("#snapDate") as HTMLInputElement).value = "2026-09-18";
    click(w, p.btn("#qActions", "copy"));
    eq(S.histOf(q.items[0]).filter((h) => h.date === "2026-09-18")[0].price, "100", "9.18 被 9.17 的价格覆盖为 100");

    /* 目标日之前没有记录日：不写入 */
    const q2 = S.create("无源日期");
    S.setActive(q2.id);
    S.addItem(q2.id, { name: "X", qty: "1", unit: "个", price: "50" });
    app.renderAll();
    (p.$("#snapDate") as HTMLInputElement).value = "2026-09-10";
    click(w, p.btn("#qActions", "copy"));
    eq(S.countOnDate(q2.id, "2026-09-10"), 0, "历史最早的记录日之前无法复制（不会写入）");
    eq(S.prevPriceDate(q2.id, "2026-09-10"), null, "没有更早的价格日时 prevPriceDate 返回 null");
  });
});