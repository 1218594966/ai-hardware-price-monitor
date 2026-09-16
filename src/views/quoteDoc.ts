/* =========================================================
   views/quoteDoc.ts — 生成报价单（打印 / 另存为 PDF）
   对应旧版 assets/js/quote-doc.js
   条款完全取自当前报价单的 terms，不写死
   ========================================================= */
import { util as U } from "../util";
import { store as S } from "../store";
import type { Quotation } from "../types";

/* ---------- 条款区：两条一行，奇数条时最后一条独占一行 ---------- */
function termsHTML(q: Quotation): string {
  const t = q.terms || [];
  if (!t.length) return "";
  const rows: string[] = [];
  for (let i = 0; i < t.length; i += 2) {
    const a = t[i] || {};
    const b = t[i + 1];
    if (b) {
      rows.push(
        "<tr>" +
        "<th>" + U.esc(a.label || "—") + "</th><td>" + U.esc(a.value || "—") + "</td>" +
        "<th>" + U.esc(b.label || "—") + "</th><td>" + U.esc(b.value || "—") + "</td>" +
        "</tr>"
      );
    } else {
      rows.push(
        "<tr>" +
        "<th>" + U.esc(a.label || "—") + '</th><td colspan="3">' + U.esc(a.value || "—") + "</td>" +
        "</tr>"
      );
    }
  }
  return '<table class="qd-notes">' + rows.join("") + "</table>";
}

/** 拼出整张报价单的 HTML */
function build(q: Quotation): string {
  if (!q) return "";
  const rows = q.items.map((it, i) => {
    const hasPrice = String(it.price).trim() !== "";
    const unit = U.num(it.price);
    return (
      "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      "<td>" + U.esc(it.name || "—") + "</td>" +
      "<td>" + U.esc(it.brand || "—") + "</td>" +
      "<td>" + U.esc(it.model || "—") + "</td>" +
      "<td>" + U.esc(it.spec || "") + "</td>" +
      '<td class="n">' + U.esc(it.qty) + "</td>" +
      "<td>" + U.esc(it.unit) + "</td>" +
      '<td class="n">' + (hasPrice ? U.money(unit) : '<span class="qd-blank">未报价</span>') + "</td>" +
      '<td class="n">' + U.money(unit * U.num(it.qty)) + "</td>" +
      "</tr>"
    );
  }).join("");

  const total = S.totalOf(q, "total");
  const st = S.statsOf(q);

  return (
    '<div class="qd-head"><h1>报 价 单</h1><div class="en">QUOTATION</div></div>' +
    '<div class="qd-meta">' +
    "<span>报价单编号：" + U.esc(q.docNo) + "</span>" +
    "<span>项目名称：" + U.esc(q.name || "—") + "</span>" +
    "<span>报价日期：" + U.fmtDateCN(U.todayISO()) + "</span>" +
    "</div>" +
    (q.note
      ? '<div class="qd-meta" style="border:none;padding:0;margin:-4px 0 8px"><span>备注：' + U.esc(q.note) + "</span></div>"
      : "") +
    '<table class="qd-table"><thead><tr>' +
    '<th style="width:52px">序号</th>' +
    "<th>产品名称</th>" +
    '<th style="width:74px">品牌</th>' +
    "<th>型号</th>" +
    "<th>基本参数</th>" +
    '<th style="width:46px">数量</th>' +
    '<th style="width:42px">单位</th>' +
    '<th style="width:96px;text-align:right">单价</th>' +
    '<th style="width:104px;text-align:right">小计</th>' +
    "</tr></thead><tbody>" + rows + "</tbody></table>" +
    '<div class="qd-total">' +
    "合计金额（含税）：" + U.money(total) + "<br>" +
    '<span class="upper">大写：人民币 ' + U.rmbUpper(total) + "</span>" +
    "</div>" +
    (q.terms && q.terms.length ? termsHTML(q) : "") +
    '<div class="qd-foot">' +
    '<div class="qd-sign">报价方（盖章）<br><br>' +
    '<span class="qd-line" style="width:132px"></span><br>' +
    '日期：<span class="qd-line" style="width:96px"></span></div>' +
    '<div class="qd-sign">客户确认（签字）<br><br>' +
    '<span class="qd-line" style="width:132px"></span><br>' +
    '日期：<span class="qd-line" style="width:96px"></span></div>' +
    "</div>" +
    '<div style="text-align:center;font-size:10.5px;color:#999;margin-top:16px">' +
    "共 " + st.items + " 项硬件 / " + st.qty + " 件（套） · 本页由报价单管理系统生成" +
    "</div>"
  );
}

function generateAndPrint(qId?: string): boolean {
  const q = qId ? S.get(qId) : S.active();
  if (!q) {
    U.toast("没有可生成的报价单");
    return false;
  }
  if (!q.items.length) {
    U.toast("这张报价单还没有硬件，先点「编辑清单」录入");
    return false;
  }

  const st = S.statsOf(q);
  if (st.priced === 0) {
    U.toast("清单里都还没有单价，先填价格再生成");
    return false;
  }
  if (st.missing && !confirm("有 " + st.missing + " 项没填单价，报价单上会显示「未报价」且不计入合计。继续生成？")) return false;

  /* 说明：报价单合计固定按「单价 × 数量」计算，与看板的走势口径开关无关 */
  const doc = document.getElementById("quoteDoc");
  if (!doc) {
    U.toast("报价单容器缺失");
    return false;
  }
  doc.innerHTML = build(q);

  U.toast("正在打开打印预览 —— 在弹窗里选「另存为 PDF」即可生成报价单");

  const prevTitle = document.title;
  document.title = (q.name || "报价单") + "-" + U.todayISO();
  const restore = () => {
    document.title = prevTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);

  setTimeout(() => {
    try {
      if (window.print) window.print();
    } catch {
      /* ignore */
    }
    setTimeout(restore, 800);
  }, 420);
  return true;
}

export const quoteDoc = { build, generateAndPrint };
export default quoteDoc;