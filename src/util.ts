/* =========================================================
   util.ts — 通用工具（金额 / 日期 / 字符串 / 提示）
   对应旧版 assets/js/utils.js
   ========================================================= */
import type { PriceRecord } from "./types";

export function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

export function isoOf(d: Date): string {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

export function todayISO(): string {
  return isoOf(new Date());
}

/** "2026-09-16" → "09/16" */
export function fmtDate(iso: string): string {
  return String(iso).slice(5).replace("-", "/");
}

/** "2026-09-16" → "2026年9月16日" */
export function fmtDateCN(iso: string): string {
  const a = String(iso).split("-");
  if (a.length < 3) return String(iso);
  return a[0] + "年" + parseInt(a[1], 10) + "月" + parseInt(a[2], 10) + "日";
}

/** 宽松取数：容忍 ""、"1,600"、"¥1,600.00" 之类 */
export function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** 精确金额，两位小数 */
export function money(n: number): string {
  return "¥" + (n || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/** 概览用短金额：百万以上才缩写 */
export function moneyShort(n: number): string {
  const a = Math.abs(n || 0);
  if (a >= 1e8) return "¥" + (n / 1e8).toFixed(2).replace(/\.?0+$/, "") + "亿";
  if (a >= 1e6) return "¥" + (n / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
  return "¥" + Math.round(n || 0).toLocaleString("zh-CN");
}

export function esc(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let _seq = 0;
export function uid(prefix = "i"): string {
  _seq++;
  return prefix + Date.now().toString(36) + _seq.toString(36);
}

export function byDate(a: PriceRecord, b: PriceRecord): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

export function clampStr(s: unknown): string {
  return String(s === null || s === undefined ? "" : s);
}

/** 宽松判空：null / undefined / "" 都算空，0 和 "0" 不算空 */
export function hasVal(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

/** 把 "item.jd.com/x" 之类补全协议 */
export function normalizeLink(u: string): string {
  let s = String(u || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s) && !/^(mailto:|tel:)/i.test(s)) s = "https://" + s;
  return s;
}

/** 只保留数字（用于数量输入） */
export function digitsOnly(s: string): string {
  return String(s || "").replace(/[^0-9]/g, "");
}

/** 只保留数字和一个小数点（用于单价输入） */
export function moneyInput(s: string): string {
  let v = String(s || "").replace(/[^0-9.]/g, "");
  const parts = v.split(".");
  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
  return v;
}

/** 人民币金额大写（报价单用） */
export function rmbUpper(amount: number): string {
  let n = Math.round(num(amount) * 100);
  if (n === 0) return "零元整";
  const neg = n < 0;
  n = Math.abs(n);
  const D = "零壹贰叁肆伍陆柒捌玖";
  const U1 = ["", "拾", "佰", "仟"];
  const U2 = ["", "万", "亿", "万亿", "亿亿"];
  const yuan = Math.floor(n / 100);
  const jiao = Math.floor(n / 10) % 10;
  const fen = n % 10;
  let str = "";
  if (yuan > 0) {
    const s = String(yuan);
    const parts: string[] = [];
    for (let i = s.length; i > 0; i -= 4) parts.unshift(s.substring(Math.max(0, i - 4), i));
    for (let p = 0; p < parts.length; p++) {
      const sec = parts[p];
      let secStr = "";
      let secZero = false;
      for (let j = 0; j < sec.length; j++) {
        const d = parseInt(sec.charAt(j), 10);
        const u = U1[sec.length - 1 - j];
        if (d === 0) {
          secZero = true;
        } else {
          if (secZero && secStr !== "") secStr += "零";
          secZero = false;
          secStr += D.charAt(d) + u;
        }
      }
      if (secStr === "") continue;
      if (str !== "" && sec.charAt(0) === "0" && str.slice(-1) !== "零") str += "零";
      str += secStr + (U2[parts.length - 1 - p] || "");
    }
    str = str.replace(/零{2,}/g, "零").replace(/零+$/, "");
  }
  let out = yuan > 0 ? str + "元" : "";
  if (jiao === 0 && fen === 0) {
    out += yuan > 0 ? "整" : "零元整";
  } else {
    if (yuan === 0) out = "零元";
    if (fen === 0) out += D.charAt(jiao) + "角整";
    else if (jiao === 0) out += (yuan > 0 ? "零" : "") + D.charAt(fen) + "分";
    else out += D.charAt(jiao) + "角" + D.charAt(fen) + "分";
  }
  return (neg ? "负" : "") + out;
}

let _toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string): void {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  if (_toastTimer !== null) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (t !== null) clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args) as void, ms);
  };
}

export const util = {
  pad2, isoOf, todayISO, fmtDate, fmtDateCN,
  num, money, moneyShort, esc, uid, byDate, clampStr, hasVal,
  normalizeLink, digitsOnly, moneyInput, rmbUpper, toast, debounce
};

export default util;