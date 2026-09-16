/* =========================================================
   views/sidebar.ts — 左侧报价单列表
   对应旧版 assets/js/sidebar.js
   ========================================================= */
import { util as U } from "../util";
import { charts as C } from "../charts";
import { store as S } from "../store";
import type { Quotation } from "../types";

interface SparkChange {
  cls: "up" | "down" | "flat";
  txt: string;
}

function sparkChange(q: Quotation): SparkChange | null {
  const s = S.seriesOf(q, "total");
  if (s.length < 2) return null;
  const a = s[0].price;
  const b = s[s.length - 1].price;
  const d = b - a;
  return {
    cls: d > 0 ? "up" : d < 0 ? "down" : "flat",
    txt: (d > 0 ? "↑ " : d < 0 ? "↓ " : "— ") + Math.abs(a !== 0 ? (d / a) * 100 : 0).toFixed(1) + "%"
  };
}

function itemHTML(q: Quotation): string {
  const s = S.seriesOf(q, "total");
  const t = sparkChange(q);
  const total = S.totalOf(q, "total");
  const act = q.id === S.state.activeId;
  return (
    '<div class="q-item' + (act ? " active" : "") + '" data-q="' + q.id + '" title="' + U.esc(q.name) + '">' +
    '<div class="q-top">' +
    '<span class="q-name">' + U.esc(q.name || "未命名报价单") + "</span>" +
    '<span class="q-total">' + U.moneyShort(total) + "</span>" +
    "</div>" +
    '<div class="q-sub">' +
    '<span class="q-meta">' + q.items.length + " 项 · " + s.length + " 个记录日</span>" +
    '<span class="q-spark">' +
    (s.length >= 2 ? C.spark(s, { width: 56, height: 20, pad: 2 }) : '<span class="q-nohist">暂无走势</span>') +
    (t ? '<span class="badge ' + t.cls + '" style="font-size:10px;padding:1px 5px">' + t.txt + "</span>" : "") +
    "</span>" +
    "</div>" +
    "</div>"
  );
}

function render(): void {
  const box = document.getElementById("qList");
  if (!box) return;
  const list = S.all();
  if (!list.length) {
    box.innerHTML = '<div class="empty" style="padding:30px 10px"><b>还没有报价单</b><p>点上方「＋ 新建」开始</p></div>';
  } else {
    box.innerHTML = list.map(itemHTML).join("");
  }
  const c = document.getElementById("qCount");
  if (c) c.textContent = String(list.length);
}

export const sidebar = { render };
export default sidebar;