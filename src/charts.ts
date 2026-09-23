/* =========================================================
   charts.ts — 纯手写 SVG 图表引擎（无第三方库，离线可用）
   对应旧版 assets/js/charts.js
   ========================================================= */
import { num, esc, money, fmtDate } from "./util";

export interface LinePoint {
  date: string;
  price: number | string;
}
export interface SparkPoint {
  date: string;
  price: unknown;
}
export interface LineOptions {
  width?: number;
  height?: number;
  padL?: number;
  padR?: number;
  padT?: number;
  padB?: number;
  color?: string;
}
export interface SparkOptions {
  width?: number;
  height?: number;
  pad?: number;
  color?: string;
}

let seq = 0;

/* ---------- 刻度算法 ---------- */

/** 取「好看」的步长：1 / 2 / 2.5 / 5 / 10 的十倍幂 */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !isFinite(raw)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
  const norm = raw / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return mult * mag;
}

/** 轴刻度文字：精度随步长自适应 */
export function axisLabel(v: number, step: number): string {
  if (Math.round(v) === 0) return "¥0";
  if (step >= 5000) return "¥" + (v / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
  if (step >= 1) return "¥" + Math.round(v).toLocaleString("zh-CN");
  return "¥" + v.toFixed(1);
}

/** 数据点标注：尽量保留精确值，只有长到影响排版才缩写 */
export function pointLabel(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e8) return "¥" + (v / 1e8).toFixed(2).replace(/\.?0+$/, "") + "亿";
  if (a >= 1e6) return "¥" + (v / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
  return "¥" + Math.round(v).toLocaleString("zh-CN");
}

/** 选轴：候选步长里挑「刻度数接近 4.5 条 + 上下边界浪费最少」的那个 */
export function chooseScale(lo: number, hi: number): { step: number; min: number; max: number; ticks: number; score: number } {
  if (!(hi > lo)) hi = lo + (Math.abs(lo) * 0.1 || 100);
  const span = hi - lo;
  let best: { step: number; min: number; max: number; ticks: number; score: number } | null = null;
  for (let n = 3; n <= 8; n++) {
    const s = niceStep(span / n);
    if (!(s > 0)) continue;
    let mn = Math.floor(lo / s) * s;
    let mx = Math.ceil(hi / s) * s;
    if (mx <= mn) mx = mn + s;
    const ticks = Math.round((mx - mn) / s);
    const waste = (lo - mn + (mx - hi)) / span;
    const score = Math.abs(ticks - 4.5) + waste * 2;
    if (!best || score < best.score) best = { step: s, min: mn, max: mx, ticks, score };
  }
  return best || { step: 1, min: lo, max: hi, ticks: 4, score: 0 };
}

/* ---------- 主折线图 ---------- */

/** @param points [{date:"2026-09-16", price:Number}] @param opt {width,height,padL,padR,padT,padB,color} */
export function line(points: LinePoint[], opt: LineOptions = {}): string {
  const W = opt.width || 900;
  const H = opt.height || 250;
  const padL = opt.padL || 78;
  const padR = opt.padR || 26;
  const padT = opt.padT || 24;
  const padB = opt.padB || 34;
  const n = points.length;
  if (!n) return '<div class="chart-empty">暂无数据</div>';

  const vals = points.map((p) => num(p.price));
  let lo = Math.min.apply(null, vals);
  let hi = Math.max.apply(null, vals);
  if (lo === hi) {
    const d0 = Math.abs(lo) * 0.08 || 100;
    lo -= d0;
    hi += d0;
  }
  const sc = chooseScale(lo, hi);
  const min = sc.min;
  const max = sc.max;
  const step = sc.step;
  const ticks = sc.ticks;
  const range = max - min;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const times = points.map((p) => new Date(p.date + "T00:00:00").getTime());
  const t0 = times[0];
  const t1 = times[n - 1];
  const X = (i: number): number =>
    t1 === t0 ? padL + iw * (n === 1 ? 0.5 : i / (n - 1)) : padL + (iw * (times[i] - t0)) / (t1 - t0);
  const Y = (v: number): number => padT + ih * (1 - (v - min) / range);

  const diff = vals[n - 1] - vals[0];
  const color = opt.color || (diff > 0 ? "#D93B3B" : diff < 0 ? "#0F9D63" : "#2B50E8");
  const gid = "cg" + ++seq;

  let s = '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img">';
  s +=
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.15"/>' +
    '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.005"/></linearGradient></defs>';

  let k: number;
  for (k = 0; k <= ticks; k++) {
    const v = min + step * k;
    const y = Y(v);
    s +=
      '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) +
      '" stroke="#ECEEF2" stroke-width="1"/>';
    s +=
      '<text x="' + (padL - 9) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#A5AEBB">' +
      axisLabel(v, step) + "</text>";
  }

  const idxs: number[] = [];
  const seen: Record<number, number> = {};
  if (n <= 6) {
    for (k = 0; k < n; k++) idxs.push(k);
  } else {
    for (k = 0; k < 5; k++) idxs.push(Math.round((k * (n - 1)) / 4));
  }
  for (k = 0; k < idxs.length; k++) {
    const ii = idxs[k];
    if (seen[ii]) continue;
    seen[ii] = 1;
    s +=
      '<text x="' + X(ii).toFixed(1) + '" y="' + (H - padB + 19) + '" text-anchor="middle" font-size="11" fill="#A5AEBB">' +
      fmtDate(points[ii].date) + "</text>";
  }

  const sx: number[] = [];
  const sy: number[] = [];
  for (k = 0; k < n; k++) {
    sx.push(X(k));
    sy.push(Y(vals[k]));
  }

  const single = n === 1;
  if (single) {
    s +=
      '<line x1="' + padL + '" y1="' + sy[0].toFixed(1) + '" x2="' + (W - padR) + '" y2="' + sy[0].toFixed(1) +
      '" stroke="' + color + '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.55"/>';
  } else {
    s +=
      '<path d="M' + sx[0].toFixed(1) + "," + (padT + ih) + " " +
      sx.map((x, i2) => "L" + x.toFixed(1) + "," + sy[i2].toFixed(1)).join(" ") +
      " L" + sx[n - 1].toFixed(1) + "," + (padT + ih) + ' Z" fill="url(#' + gid + ')"/>';
    s +=
      '<polyline points="' + sx.map((x, i3) => x.toFixed(1) + "," + sy[i3].toFixed(1)).join(" ") +
      '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  for (k = 0; k < n; k++) {
    const r = single ? 5.2 : 3.6;
    s +=
      '<circle cx="' + sx[k].toFixed(1) + '" cy="' + sy[k].toFixed(1) + '" r="' + r + '" fill="#fff" stroke="' + color +
      '" stroke-width="2.4"><title>' + esc(points[k].date) + "　" + money(vals[k]) + "</title></circle>";
    if (n <= 8) {
      const an = k === 0 && n > 1 ? "start" : k === n - 1 && n > 1 ? "end" : "middle";
      s +=
        '<text x="' + sx[k].toFixed(1) + '" y="' + (sy[k] - 12).toFixed(1) + '" text-anchor="' + an +
        '" font-size="' + (single ? 13 : 10.5) + '" font-weight="700" fill="' + color + '">' +
        pointLabel(vals[k]) + "</text>";
    }
  }
  return s + "</svg>";
}

/* ---------- 迷你走势 ---------- */

/** @param hist [{date, price}] @param opt {width,height,pad,color} */
export function spark(hist: SparkPoint[], opt: SparkOptions = {}): string {
  const W = opt.width || 220;
  const H = opt.height || 52;
  const p = opt.pad === undefined ? 6 : opt.pad;
  const vals = hist.map((h) => num(h.price));
  const n = vals.length;
  if (!n) return "";

  const lo = Math.min.apply(null, vals);
  const hi = Math.max.apply(null, vals);
  const flat = hi === lo;
  const span = hi - lo || 1;
  const diff = vals[n - 1] - vals[0];
  const color = opt.color || (diff > 0 ? "#D93B3B" : diff < 0 ? "#0F9D63" : "#A5AEBB");
  const gid = "sg" + ++seq;

  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? W / 2 : p + ((W - 2 * p) * i) / (n - 1);
    const y = flat ? H / 2 : p + ((H - 2 * p) * (1 - (vals[i] - lo) / span));
    pts.push([x, y]);
  }

  let s = '<svg class="sparkline" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">';
  if (n >= 2 && !flat) {
    s +=
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.18"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.0"/></linearGradient></defs>';
    s +=
      "<path d=M" + pts[0][0].toFixed(1) + "," + H + " " +
      pts.map((q) => "L" + q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ") +
      " L" + pts[n - 1][0].toFixed(1) + "," + H + ' Z" fill="url(#' + gid + ')"/>';
    s +=
      '<polyline points="' + pts.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ") +
      '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
  } else {
    s +=
      '<line x1="' + p + '" y1="' + H / 2 + '" x2="' + (W - p) + '" y2="' + H / 2 + '" stroke="' + color +
      '" stroke-width="1.6" stroke-dasharray="4 4" stroke-opacity="0.6" vector-effect="non-scaling-stroke"/>';
  }
  s +=
    '<circle cx="' + pts[n - 1][0].toFixed(1) + '" cy="' + pts[n - 1][1].toFixed(1) +
    '" r="3" fill="#fff" stroke="' + color + '" stroke-width="2.2" vector-effect="non-scaling-stroke"/>';
  return s + "</svg>";
}

export const charts = {
  line, spark, niceStep, axisLabel, pointLabel, chooseScale
};

export default charts;