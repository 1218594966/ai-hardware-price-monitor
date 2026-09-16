/* =========================================================
   store.ts — 数据模型 / 持久化 / 旧版迁移 / 计算
   对应旧版 assets/js/store.js
   ========================================================= */
import { uid, byDate, num, todayISO, pad2, toast, hasVal } from "./util";
import type { Quotation, QuotationItem, PriceRecord, Term, TrendMode, SeriesPoint, Stats, Delta, TrendInfo } from "./types";

const KEY = "ai-quote-v1";          // 新版数据结构
const LEGACY_KEY = "ai-hardware-price-v1"; // 旧版单文件版的数据，首次运行时自动迁移
const PREF_KEY = "ai-quote-prefs";

/** 新增报价单时套用的默认条款（之后可在界面上随意增删改） */
const DEFAULT_TERMS: Term[] = [
  { label: "报价有效期", value: "自报价之日起 30 天" },
  { label: "交货周期", value: "合同签订后 15 个工作日" },
  { label: "付款方式", value: "预付 30%，到货验收后付 70%" },
  { label: "质保期", value: "整机 3 年 / 硬盘 5 年" },
  { label: "报价说明", value: "本报价含税含运费；硬件价格随市场波动，超出有效期需重新核价。" }
];

interface StoreState {
  quotations: Quotation[];
  activeId: string | null;
  trendMode: TrendMode;
}

const state: StoreState = {
  quotations: [],
  activeId: null,
  trendMode: "total"
};

/* ---------------- 持久化 ---------------- */

function save(silent = false): boolean {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        quotations: state.quotations,
        activeId: state.activeId,
        savedAt: new Date().toISOString()
      })
    );
    return true;
  } catch {
    if (!silent) toast("保存失败：浏览器存储不可用");
    return false;
  }
}

function loadPrefs(): void {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { trendMode?: string } | null;
      if (p && (p.trendMode === "unit" || p.trendMode === "total")) state.trendMode = p.trendMode;
    }
  } catch {
    /* 忽略损坏的偏好 */
  }
}
function savePrefs(): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ trendMode: state.trendMode }));
  } catch {
    /* 存储不可用时忽略 */
  }
}

function trimHistory(arr: unknown): PriceRecord[] {
  const out: PriceRecord[] = [];
  if (!Array.isArray(arr)) return out;
  for (const h of arr) {
    const rec = (h || {}) as Partial<PriceRecord>;
    if (!rec.date) continue;
    out.push({
      date: String(rec.date).slice(0, 10),
      price: hasVal(rec.price) ? String(rec.price) : "",
      note: rec.note || ""
    });
  }
  out.sort(byDate);
  return out;
}

function makeItem(d: Partial<QuotationItem> = {}): QuotationItem {
  return {
    id: d.id || uid("i"),
    name: d.name || "",
    brand: d.brand || "",
    model: d.model || "",
    spec: d.spec || "",
    qty: hasVal(d.qty) ? String(d.qty) : "1",
    unit: d.unit || "个",
    price: hasVal(d.price) ? String(d.price) : "",
    link: d.link || "",
    history: trimHistory(d.history)
  };
}

function makeTerms(arr: unknown): Term[] {
  if (!Array.isArray(arr) || !arr.length) {
    return DEFAULT_TERMS.map((t) => ({ label: t.label, value: t.value }));
  }
  const out: Term[] = [];
  for (const raw of arr) {
    const t = (raw || {}) as Partial<Term>;
    out.push({ label: t.label || "", value: t.value || "" });
  }
  return out;
}

function docNoFor(index: number): string {
  return "Q-" + todayISO().replace(/-/g, "") + "-" + pad2((index || 0) + 1);
}

function makeQuotation(d: Partial<Quotation> = {}, index = 0): Quotation {
  const items: QuotationItem[] = [];
  if (Array.isArray(d.items)) items.push(...d.items.map(makeItem));
  return {
    id: d.id || uid("q"),
    name: d.name || "报价单 " + ((index || 0) + 1),
    note: d.note || "",
    docNo: d.docNo || docNoFor(index || 0),
    createdAt: d.createdAt || todayISO(),
    terms: makeTerms(d.terms),
    items
  };
}

/* ---------------- 初始化 ---------------- */

function load(): void {
  loadPrefs();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }

  if (raw) {
    try {
      const o = JSON.parse(raw) as { quotations?: unknown[]; activeId?: string } | null;
      if (o && Array.isArray(o.quotations) && o.quotations.length) {
        state.quotations = o.quotations.map((q, i) => {
          const qq = (q || {}) as Partial<Quotation>;
          qq.terms = makeTerms(qq.terms);
          if (!Array.isArray(qq.items)) qq.items = [];
          if (!qq.docNo) qq.docNo = docNoFor(i);
          if (!qq.createdAt) qq.createdAt = todayISO();
          if (!qq.id) qq.id = uid("q");
          return qq as Quotation;
        });
        state.activeId = o.activeId || state.quotations[0].id;
        return;
      }
    } catch {
      /* 数据损坏，走下面的重建分支 */
    }
  }

  // 首次运行：先把旧版数据接过来，再补两张空报价单
  const q1 = makeQuotation({ name: "边缘节点标准配置", note: "", createdAt: todayISO() }, 0);
  let legacy: QuotationItem[] | null = null;
  try {
    const lraw = localStorage.getItem(LEGACY_KEY);
    if (lraw) {
      const lo = JSON.parse(lraw) as unknown;
      const larr = Array.isArray(lo) ? lo : (lo && typeof lo === "object" && "items" in (lo as object) ? (lo as { items: unknown }).items : null);
      if (Array.isArray(larr) && larr.length) {
        legacy = larr.map((d) => {
          const dd = (d || {}) as Partial<QuotationItem>;
          return {
            id: uid("i"),
            name: dd.name || "",
            brand: dd.brand || "",
            model: dd.model || "",
            spec: dd.spec || "",
            qty: hasVal(dd.qty) ? String(dd.qty) : "1",
            unit: dd.unit || "个",
            price: hasVal(dd.price) ? String(dd.price) : "",
            link: dd.link || "",
            history: trimHistory(dd.history)
          };
        });
        q1.note = "由旧版清单自动迁移";
      }
    }
  } catch {
    /* ignore */
  }
  if (legacy) q1.items = legacy;

  state.quotations = [
    q1,
    makeQuotation({ name: "报价单 2", note: "点「编辑清单」录入硬件" }, 1),
    makeQuotation({ name: "报价单 3", note: "点「编辑清单」录入硬件" }, 2)
  ];
  state.activeId = state.quotations[0].id;
  save(true);
}

/* ---------------- 报价单 CRUD ---------------- */

function all(): Quotation[] {
  return state.quotations;
}
function get(id: string): Quotation | null {
  return state.quotations.find((q) => q.id === id) || null;
}
function active(): Quotation | null {
  return get(state.activeId || "") || state.quotations[0] || null;
}
function setActive(id: string): void {
  state.activeId = id;
}
function indexOf(id: string): number {
  return state.quotations.findIndex((q) => q.id === id);
}

function create(name?: string): Quotation {
  const q = makeQuotation({ name: name || "", note: "", createdAt: todayISO() }, state.quotations.length);
  state.quotations.push(q);
  save();
  return q;
}

function duplicate(id: string): Quotation | null {
  const src = get(id);
  if (!src) return null;
  const copy = makeQuotation(
    {
      name: src.name + " 副本",
      note: src.note,
      createdAt: todayISO(),
      terms: src.terms,
      items: src.items.map((it) => ({
        id: uid("i"),
        name: it.name,
        brand: it.brand,
        model: it.model,
        spec: it.spec,
        qty: it.qty,
        unit: it.unit,
        price: it.price,
        link: it.link,
        history: (it.history || []).slice()
      }))
    },
    state.quotations.length
  );
  state.quotations.push(copy);
  save();
  return copy;
}

function remove(id: string): boolean {
  const i = indexOf(id);
  if (i < 0) return false;
  state.quotations.splice(i, 1);
  if (state.activeId === id) state.activeId = state.quotations[0] ? state.quotations[0].id : null;
  save();
  return true;
}

function rename(id: string, name: string): void {
  const q = get(id);
  if (!q) return;
  q.name = name;
  save(true);
}
function setNote(id: string, note: string): void {
  const q = get(id);
  if (!q) return;
  q.note = note;
  save(true);
}

/* ---------------- 条款 ---------------- */

function addTerm(quoteId: string, label: string, value: string): number | undefined {
  const q = get(quoteId);
  if (!q) return;
  q.terms.push({ label: label || "", value: value || "" });
  save(true);
  return q.terms.length - 1;
}
function removeTerm(quoteId: string, index: number): void {
  const q = get(quoteId);
  if (!q) return;
  q.terms.splice(index, 1);
  save(true);
}
function resetTerms(quoteId: string): void {
  const q = get(quoteId);
  if (!q) return;
  q.terms = DEFAULT_TERMS.map((t) => ({ label: t.label, value: t.value }));
  save(true);
}

/* ---------------- 硬件 ---------------- */

function addItem(quoteId: string, data?: Partial<QuotationItem>): QuotationItem | null {
  const q = get(quoteId);
  if (!q) return null;
  const it = makeItem(Object.assign({ name: "新硬件", qty: "1", unit: "个" }, data || {}));
  q.items.push(it);
  save();
  return it;
}
function removeItem(quoteId: string, itemId: string): void {
  const q = get(quoteId);
  if (!q) return;
  q.items = q.items.filter((x) => x.id !== itemId);
  save();
}
function moveItem(quoteId: string, itemId: string, dir: number): void {
  const q = get(quoteId);
  if (!q) return;
  const i = q.items.findIndex((x) => x.id === itemId);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= q.items.length) return;
  const t = q.items[i];
  q.items[i] = q.items[j];
  q.items[j] = t;
  save();
}

/* ---------------- 价格历史 ---------------- */

function histOf(item: QuotationItem): PriceRecord[] {
  return (item.history || []).slice().sort(byDate);
}

function upsertHistory(item: QuotationItem, date: string, price: number | string, note: string): void {
  if (!item.history) item.history = [];
  let found: PriceRecord | null = null;
  for (const h of item.history) {
    if (h.date === date) {
      found = h;
      break;
    }
  }
  if (found) {
    found.price = String(price);
    if (note) found.note = note;
  } else {
    item.history.push({ date, price: String(price), note: note || "" });
  }
  item.history.sort(byDate);
}

function trendOf(item: QuotationItem): TrendInfo | null {
  const h = histOf(item);
  if (!h.length) return null;
  const vals = h.map((x) => num(x.price));
  const first = vals[0];
  const last = vals[vals.length - 1];
  const diff = last - first;
  const pct = first !== 0 ? (diff / first) * 100 : 0;
  return {
    h, vals, first, last, diff, pct,
    cls: diff > 0 ? "up" : diff < 0 ? "down" : "flat"
  };
}

/* ---------------- 计算 ---------------- */

function totalOf(q: Quotation | null, mode?: TrendMode): number {
  if (!q) return 0;
  const m = mode || state.trendMode;
  let s = 0;
  for (const it of q.items) {
    s += m === "unit" ? num(it.price) : num(it.price) * num(it.qty);
  }
  return s;
}

function allDates(q: Quotation | null): string[] {
  const seen: Record<string, number> = {};
  if (!q) return [];
  for (const it of q.items) {
    for (const h of it.history || []) seen[h.date] = 1;
  }
  return Object.keys(seen).sort();
}

function priceAsOf(item: QuotationItem, date: string): number {
  const h = histOf(item);
  if (!h.length) return num(item.price);
  let v: PriceRecord | null = null;
  for (const r of h) {
    if (r.date <= date) v = r;
  }
  if (!v) v = h[0];
  return num(v.price);
}

function seriesOf(q: Quotation | null, mode?: TrendMode): SeriesPoint[] {
  const m = mode || state.trendMode;
  return allDates(q).map((d) => {
    let s = 0;
    for (const it of q ? q.items : []) {
      const p = priceAsOf(it, d);
      s += m === "unit" ? p : p * num(it.qty);
    }
    return { date: d, price: s };
  });
}

function deltaOf(q: Quotation | null): Delta | null {
  const s = seriesOf(q, "total");
  if (s.length < 2) return null;
  const a = s[0].price;
  const b = s[s.length - 1].price;
  return { diff: b - a, pct: a !== 0 ? ((b - a) / a) * 100 : 0 };
}

function statsOf(q: Quotation | null = null): Stats {
  const q2 = q || active();
  if (!q2) return { items: 0, qty: 0, priced: 0, missing: 0, total: 0, dates: 0, lastDate: null };
  let qty = 0;
  let priced = 0;
  let missing = 0;
  for (const it of q2.items) {
    qty += num(it.qty);
    if (String(it.price).trim() === "") missing++;
    else priced++;
  }
  const ds = allDates(q2);
  return {
    items: q2.items.length,
    qty,
    priced,
    missing,
    total: totalOf(q2, "total"),
    dates: ds.length,
    lastDate: ds.length ? ds[ds.length - 1] : null
  };
}

/* ---------------- 记价 ---------------- */

/** 把当前单价按指定日期写进历史；返回写入条数 */
function snapshotAll(quoteId: string, date: string): number {
  const q = get(quoteId);
  if (!q) return 0;
  let n = 0;
  for (const it of q.items) {
    if (String(it.price).trim() === "") continue;
    upsertHistory(it, date, it.price, "");
    n++;
  }
  if (n) save(true);
  return n;
}

/** 指定日期上已有记录的硬件数（用于覆盖前确认） */
function countOnDate(quoteId: string, date: string): number {
  const q = get(quoteId);
  if (!q) return 0;
  let n = 0;
  for (const it of q.items) {
    for (const h of it.history || []) {
      if (h.date === date && String(it.price).trim() !== "") {
        n++;
        break;
      }
    }
  }
  return n;
}

function setTrendMode(m: string): void {
  state.trendMode = m === "unit" ? "unit" : "total";
  savePrefs();
}

export const store = {
  DEFAULT_TERMS,
  state,
  save,
  load,
  all,
  get,
  active,
  setActive,
  indexOf,
  create,
  duplicate,
  remove,
  rename,
  setNote,
  addTerm,
  removeTerm,
  resetTerms,
  addItem,
  removeItem,
  moveItem,
  histOf,
  upsertHistory,
  trendOf,
  totalOf,
  allDates,
  priceAsOf,
  seriesOf,
  deltaOf,
  statsOf,
  snapshotAll,
  countOnDate,
  setTrendMode
};

export default store;