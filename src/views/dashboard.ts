/* =========================================================
   views/dashboard.ts — 报价单看板：总价走势 + 硬件走势卡片
   对应旧版 assets/js/dashboard.js
   ========================================================= */
import { util as U } from "../util";
import { charts as C } from "../charts";
import { store as S } from "../store";
import { sidebar } from "./sidebar";
import { modal } from "./modal";
import { terms } from "./terms";
import { quoteDoc } from "./quoteDoc";
import { getApp } from "../appRef";
import type { Quotation, QuotationItem, TrendInfo, Stats, Delta } from "../types";

function badge(t: TrendInfo | null): string {
  if (!t) return '<span class="badge flat">无记录</span>';
  if (t.h.length < 2) return '<span class="badge flat">已记 1 天</span>';
  return (
    '<span class="badge ' + t.cls + '">' +
    (t.diff > 0 ? "↑" : t.diff < 0 ? "↓" : "—") + " " + Math.abs(t.pct).toFixed(1) + "%</span>"
  );
}

function hwCard(it: QuotationItem): string {
  const t = S.trendOf(it);
  const sub = U.num(it.price) * U.num(it.qty);
  const range = t ? U.fmtDate(t.h[0].date) + " → " + U.fmtDate(t.h[t.h.length - 1].date) : "";
  return (
    '<article class="hw-card" data-item="' + it.id + '" title="点击查看价格明细">' +
    '<div class="hw-top">' +
    '<span class="hw-name">' + U.esc(it.name || "未命名") + "</span>" + badge(t) +
    "</div>" +
    '<div class="hw-meta">' + U.esc([it.brand, it.model].filter(Boolean).join(" · ") || "—") + "</div>" +
    '<div class="hw-spark">' +
    (t ? C.spark(t.h, { width: 240, height: 52 }) : '<div class="no-hist">暂无价格记录</div>') +
    "</div>" +
    (t ? '<div class="hw-range"><span>' + range + "</span><span>" + t.h.length + " 个记录日</span></div>" : "") +
    '<div class="hw-foot">' +
    '<div class="price"><span class="k">单价</span><span class="v">' +
    (String(it.price).trim() === "" ? "—" : U.money(U.num(it.price))) + "</span></div>" +
    '<div class="unit">×' + U.esc(it.qty) + " " + U.esc(it.unit) + "</div>" +
    '<div class="sub"><span class="k">小计</span><span class="v">' + U.money(sub) + "</span></div>" +
    "</div>" +
    "</article>"
  );
}

/** 单价之和与「单价×数量」的差值（= 数量大于 1 的项多算的部分） */
function sumQtyExtra(q: Quotation): number {
  let extra = 0;
  for (const it of q.items) {
    extra += U.num(it.price) * (U.num(it.qty) - 1);
  }
  return extra;
}

function kpisHTML(q: Quotation, st: Stats, delta: Delta | null): string {
  const modeUnit = S.state.trendMode === "unit";
  const hero = modeUnit ? st.total - sumQtyExtra(q) : st.total;
  const heroLabel = modeUnit ? "当前清单 · 单价之和" : "当前清单总价";
  const heroFoot = modeUnit ? "只把各项单价加起来，不乘数量" : "按清单里现已填写的单价 × 数量";

  let deltaHTML: string;
  if (delta) {
    const up = delta.diff > 0;
    deltaHTML =
      '<div class="v delta ' + (up ? "up" : "down") + '" style="font-size:19px">' +
      (up ? "+" : "−") + U.moneyShort(Math.abs(delta.diff)) +
      "（" + (up ? "+" : "−") + Math.abs(delta.pct).toFixed(2) + "%）</div>";
  } else {
    deltaHTML = '<div class="v" style="font-size:19px;color:var(--ink-3)">—</div>';
  }

  return (
    '<div class="kpis">' +
    '<div class="kpi hero"><div class="k">' + heroLabel + "</div>" +
    '<div class="v">' + U.money(hero) + "</div>" +
    '<div class="foot" style="color:rgba(255,255,255,.85)">' + heroFoot + "</div></div>" +
    '<div class="kpi"><div class="k">硬件项数</div><div class="v">' + st.items + "<small>项</small></div>" +
    '<div class="foot">共 ' + st.qty + " 件 / 套" + (st.missing ? " · " + st.missing + " 项未填价" : "") + "</div></div>" +
    '<div class="kpi"><div class="k">较首日变动</div>' + deltaHTML +
    '<div class="foot">' + (st.dates > 1 ? "对比 " + st.dates + " 个记录日" : "还需至少 2 个记录日") + "</div></div>" +
    '<div class="kpi"><div class="k">价格记录日</div><div class="v">' + st.dates + "<small>天</small></div>" +
    '<div class="foot">' + (st.lastDate ? "最新 " + U.fmtDateCN(st.lastDate) : "尚未记录") + "</div></div>" +
    "</div>"
  );
}

function trendCardHTML(q: Quotation): string {
  const series = S.seriesOf(q, S.state.trendMode);
  const unit = S.state.trendMode === "unit";
  let body: string;
  if (!series.length) {
    body = '<div class="chart-empty">还没有价格记录 —— 点右上角「记录该日价格」给今天打个基线</div>';
  } else {
    body = C.line(series, { width: 1000, height: 262 });
    if (series.length === 1) {
      body +=
        '<div class="note">当前只有 <b>1 个记录日</b>（' + U.fmtDateCN(series[0].date) +
        "），显示的是当日基线；换个日期再记一次就会连成曲线。</div>";
    }
    /* 多个记录日但价格全部相同（常见于「复制某日价格」）——解释为何是一条平线 */
    const vals = series.map((p) => p.price);
    const flatMulti = series.length >= 2 && Math.min.apply(null, vals) === Math.max.apply(null, vals);
    if (flatMulti) {
      body +=
        '<div class="note">这几天价格<b>完全相同</b>（可能是刚复制出来的），所以走势是一条平线；' +
        "之后改价并「记录该日价格」，就能看到波动了。</div>";
    }
    /* 走势取「当日最近记录价」，与清单当前的单价可能不同 —— 说清楚，并给出下一步 */
    const last = series[series.length - 1];
    const cur = unit ? S.totalOf(q, "total") - sumQtyExtra(q) : S.totalOf(q, "total");
    if (Math.abs(last.price - cur) > 0.005) {
      body +=
        '<div class="note">走势最后一个点 <b>' + U.money(last.price) + "</b>（" + U.fmtDateCN(last.date) +
        "记录的价）与当前清单 <b>" + U.money(cur) +
        "</b> 不一致：有硬件的单价改过但还没记价，点右上角「记录该日价格」同步一次即可。</div>";
    }
  }
  return (
    '<div class="card">' +
    '<div class="card-head">' +
    '<div><div class="card-title">总价走势</div>' +
    '<div class="card-sub">' +
    (unit
      ? "按日期汇总各硬件<b>当日最近记录的单价</b>，不加数量"
      : "按日期汇总各硬件<b>当日最近记录的单价</b> × 数量") +
    "</div></div>" +
    '<div class="seg" id="segTrend">' +
    '<button data-mode="total" class="' + (unit ? "" : "on") + '">实际总价</button>' +
    '<button data-mode="unit" class="' + (unit ? "on" : "") + '">单价之和</button>' +
    "</div>" +
    "</div>" +
    '<div class="card-body">' + body + "</div>" +
    "</div>"
  );
}

/** 「复制该日价格」的来源日下拉框（列出该报价单所有价格记录日） */
function copySrcHTML(q: Quotation): string {
  const dates = S.allDates(q);
  if (!dates.length) {
    return '<select class="sel-date" id="copySrc" disabled title="还没有价格记录日可复制"><option value="">暂无来源日</option></select>';
  }
  const target = (document.getElementById("snapDate") as HTMLInputElement | null)?.value || U.todayISO();
  const prev = dates.filter((d) => d < target);
  const def = prev.length ? prev[prev.length - 1] : dates[dates.length - 1];
  const opts = dates
    .map((d) => '<option value="' + d + '"' + (d === def ? " selected" : "") + ">" + U.fmtDateCN(d) + "</option>")
    .join("");
  return '<select class="sel-date" id="copySrc" title="选择要复制的来源价格日">' + opts + "</select>";
}

function html(): string {
  const q = S.active();
  if (!q) {
    return '<div class="empty"><b>还没有报价单</b><p>点左侧「＋ 新建」创建第一张</p></div>';
  }
  const st = S.statsOf(q);
  const delta = S.deltaOf(q);

  let body: string;
  if (!q.items.length) {
    body =
      '<div class="empty"><b>这张报价单还是空的</b>' +
      '<p>点「编辑清单」开始录入硬件，或用「复制」从别的报价单派生一份</p></div>';
  } else {
    body =
      '<div class="sec-head"><h3>硬件价格走势</h3>' +
      '<span class="n">共 ' + q.items.length + " 项 · 点卡片看价格明细</span></div>" +
      '<div class="hw-grid">' + q.items.map(hwCard).join("") + "</div>";
  }

  return (
    '<div class="q-head">' +
    '<div class="q-head-l">' +
    '<input class="q-title" id="qTitle" value="' + U.esc(q.name) + '" placeholder="给这张报价单起个名字" ' +
    'maxlength="60" title="点击可直接修改报价单名称">' +
    '<input class="q-note" id="qNote" value="' + U.esc(q.note) + '" placeholder="备注（可选），例如：面向 XX 项目的两台节点" ' +
    'maxlength="120" title="点击可直接修改备注">' +
    '<p class="q-doc-line">报价单编号 ' + U.esc(q.docNo) + " · 创建于 " + U.fmtDateCN(q.createdAt) +
    " · " + q.terms.length + " 条报价条款</p>" +
    "</div>" +
    '<div class="q-actions" id="qActions">' +
    '<input type="date" class="sel-date" id="snapDate" value="' + U.todayISO() + '">' +
    '<button class="btn" data-act="snap" title="把所有已填单价的硬件，按左边选中的日期存一条价格记录">记录该日价格</button>' +
    copySrcHTML(q) +
    '<button class="btn" data-act="copy" title="把下拉框选中的价格日（如 9.16）的各项已记录价格，一键复制到左边选中的日期（如 9.17）">复制该日价格</button>' +
    '<button class="btn" data-act="terms" title="编辑这张报价单的条款">报价条款</button>' +
    '<button class="btn" data-act="dup" title="复制一份当前配置">复制</button>' +
    '<button class="btn primary" data-act="edit">编辑清单</button>' +
    '<button class="btn soft" data-act="quote">生成报价单</button>' +
    '<button class="btn danger" data-act="del">删除</button>' +
    "</div>" +
    "</div>" +
    kpisHTML(q, st, delta) +
    trendCardHTML(q) +
    body
  );
}

function bind(): void {
  const q = S.active();
  if (!q) return;

  /* 名称 / 备注：就地编辑，只同步侧栏，不重绘主区（避免光标丢失） */
  const nameEl = document.getElementById("qTitle") as HTMLInputElement | null;
  if (nameEl) {
    nameEl.addEventListener("input", () => {
      S.rename(q.id, nameEl.value);
      sidebar.render();
      document.title = (nameEl.value || "报价单管理") + " · AI 一体机价格监控";
    });
    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nameEl.blur();
      }
    });
  }
  const noteEl = document.getElementById("qNote") as HTMLInputElement | null;
  if (noteEl) {
    noteEl.addEventListener("input", () => S.setNote(q.id, noteEl.value));
  }

  /* 目标日期变化时，自动把来源日切到「当日前最近的价格日」 */
  const snapDate = document.getElementById("snapDate") as HTMLInputElement | null;
  if (snapDate) {
    snapDate.addEventListener("change", () => {
      const sel = document.getElementById("copySrc") as HTMLSelectElement | null;
      if (!sel || sel.disabled) return;
      const prev = S.prevPriceDate(q.id, snapDate.value);
      if (prev) sel.value = prev;
    });
  }

  /* 走势口径切换 */
  const seg = document.getElementById("segTrend");
  if (seg) {
    seg.addEventListener("click", (e) => {
      const b = (e.target as Element).closest ? (e.target as Element).closest("[data-mode]") : null;
      if (!b) return;
      S.setTrendMode(b.getAttribute("data-mode") || "total");
      getApp().renderMain();
      U.toast(
        S.state.trendMode === "unit"
          ? "已切换为「单价之和」—— 不乘数量"
          : "已切换为「实际总价」—— 单价 × 数量"
      );
    });
  }

  /* 操作区 */
  const acts = document.getElementById("qActions");
  if (acts) {
    acts.addEventListener("click", (e) => {
      const b = (e.target as Element).closest ? (e.target as Element).closest("[data-act]") : null;
      if (!b) return;
      const act = b.getAttribute("data-act");
      const app = getApp();

      if (act === "edit") {
        app.setMode("editor");
      } else if (act === "terms") {
        terms.open(q.id);
      } else if (act === "quote") {
        quoteDoc.generateAndPrint(q.id);
      } else if (act === "dup") {
        const copy = S.duplicate(q.id);
        if (copy) {
          S.setActive(copy.id);
          app.renderAll();
          U.toast("已复制为「" + copy.name + "」");
        }
      } else if (act === "del") {
        if (S.all().length <= 1) {
          U.toast("至少保留一张报价单");
          return;
        }
        if (!confirm("删除报价单「" + (q.name || "未命名") + "」？里面的硬件和价格记录都会一起删除，不可撤销。")) return;
        S.remove(q.id);
        app.renderAll();
        U.toast("已删除报价单");
      } else if (act === "copy") {
        const d = (document.getElementById("snapDate") as HTMLInputElement).value || U.todayISO();
        const sel = document.getElementById("copySrc") as HTMLSelectElement | null;
        const src = (sel && !sel.disabled && sel.value) || S.prevPriceDate(q.id, d) || "";
        if (!src) {
          U.toast("还没有可复制的价格日 —— 先用「记录该日价格」建一个基线再复制");
          return;
        }
        if (src === d) {
          U.toast("来源与目标日期是同一天，无需复制");
          return;
        }
        const existed = S.countOnDate(q.id, d);
        if (existed && !confirm(U.fmtDateCN(d) + " 已有 " + existed + " 项记录，用 " + U.fmtDateCN(src) + " 的价格覆盖？")) return;
        const n = S.copyDate(q.id, d, src);
        app.renderAll();
        U.toast("已把 " + U.fmtDateCN(src) + " 的 " + n + " 项价格复制到 " + U.fmtDateCN(d) + "（没记录过的项跳过）");
      } else if (act === "snap") {
        const d = (document.getElementById("snapDate") as HTMLInputElement).value || U.todayISO();
        const st = S.statsOf(q);
        if (st.priced === 0) {
          U.toast("清单里还没有单价，先点「编辑清单」填价格");
          return;
        }
        const existed = S.countOnDate(q.id, d);
        if (existed && !confirm(U.fmtDateCN(d) + " 已有 " + existed + " 项记录，用当前清单里的单价覆盖？")) return;
        const n = S.snapshotAll(q.id, d);
        app.renderAll();
        U.toast("已按 " + U.fmtDateCN(d) + " 记录 " + n + " 项价格");
      }
    });
  }

  /* 硬件卡片 → 明细 */
  const grid = document.querySelector(".hw-grid");
  if (grid) {
    grid.addEventListener("click", (e) => {
      const card = (e.target as Element).closest ? (e.target as Element).closest("[data-item]") : null;
      if (!card) return;
      modal.open(card.getAttribute("data-item") || "", q.id);
    });
  }
}

export const dashboard = { html, bind };
export default dashboard;