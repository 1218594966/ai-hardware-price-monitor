/* =========================================================
   views/editor.ts — 编辑清单（表格视图）
   对应旧版 assets/js/editor.js
   ========================================================= */
import { util as U } from "../util";
import { charts as C } from "../charts";
import { store as S } from "../store";
import { sidebar } from "./sidebar";
import { modal } from "./modal";
import { getApp } from "../appRef";
import type { QuotationItem } from "../types";

const AUTOREC_KEY = "ai-quote-autorec";

function autoRecordOn(): boolean {
  const el = document.getElementById("autoRec") as HTMLInputElement | null;
  return el ? el.checked : true;
}

function rowHTML(it: QuotationItem, idx: number, len: number): string {
  const sub = U.num(it.qty) * U.num(it.price);
  const t = S.trendOf(it);
  const cell = t
    ? C.spark(t.h, { width: 104, height: 26, pad: 3 })
    : '<span class="no-hist">暂无记录</span>';
  const badge = t && t.h.length >= 2
    ? '<span class="badge ' + t.cls + '" style="font-size:10.5px;padding:1px 5px">' +
      (t.diff > 0 ? "↑" : t.diff < 0 ? "↓" : "—") + Math.abs(t.pct).toFixed(1) + "%</span>"
    : "";

  return (
    '<tr data-id="' + it.id + '">' +
    '<td class="c-idx">' + (idx + 1) + "</td>" +
    '<td><input class="cell" data-f="name" value="' + U.esc(it.name) + '" placeholder="产品名称"></td>' +
    '<td><input class="cell" data-f="brand" value="' + U.esc(it.brand) + '" placeholder="品牌"></td>' +
    '<td><input class="cell" data-f="model" value="' + U.esc(it.model) + '" placeholder="型号"></td>' +
    '<td><textarea class="cell" rows="1" data-f="spec" placeholder="基本参数 / 说明">' + U.esc(it.spec) + "</textarea></td>" +
    '<td><div class="qty-box">' +
    '<input class="cell num q" data-f="qty" value="' + U.esc(it.qty) + '" placeholder="1">' +
    '<input class="cell u" data-f="unit" value="' + U.esc(it.unit) + '" placeholder="个">' +
    "</div></td>" +
    '<td><input class="cell money' + (String(it.price).trim() === "" ? " empty" : "") + '" data-f="price" value="' +
    U.esc(it.price) + '" placeholder="0.00" title="手动输入单价" inputmode="decimal"></td>' +
    '<td class="sub-cell' + (sub > 0 ? "" : " zero") + '" data-sub="' + it.id + '">' +
    (sub > 0 ? U.money(sub) : "—") + "</td>" +
    '<td><div class="nd" data-act="trend" data-id="' + it.id + '" title="点击查看价格明细" style="cursor:pointer">' +
    cell + badge + "</div></td>" +
    '<td><div class="nd">' +
    '<input class="cell" data-f="link" value="' + U.esc(it.link) + '" placeholder="粘贴商品链接…">' +
    '<button class="mini-btn" data-act="open" title="打开商品链接">↗</button>' +
    "</div></td>" +
    '<td><div class="act-box">' +
    '<button class="mini-btn" data-act="up"' + (idx === 0 ? " disabled" : "") + ' title="上移">↑</button>' +
    '<button class="mini-btn" data-act="down"' + (idx === len - 1 ? " disabled" : "") + ' title="下移">↓</button>' +
    '<button class="mini-btn del" data-act="del" title="删除该硬件">✕</button>' +
    "</div></td>" +
    "</tr>"
  );
}

function html(): string {
  const q = S.active();
  if (!q) return '<div class="empty"><b>还没有报价单</b></div>';
  return (
    '<div class="q-head">' +
    '<div class="q-head-l">' +
    '<input class="q-title" id="eqTitle" value="' + U.esc(q.name) + '" placeholder="报价单名称" maxlength="60">' +
    '<p class="q-doc-line">编辑清单 · 直接点单元格修改 · 单价留空按 0 计算 · ' +
    "改完单价离开输入框会自动为当天留一条价格记录</p>" +
    "</div>" +
    '<div class="q-actions">' +
    '<button class="btn primary" data-act="add">＋ 添加硬件</button>' +
    '<input type="date" class="sel-date" id="snapDate2" value="' + U.todayISO() + '">' +
    '<button class="btn" data-act="snap">记录该日价格</button>' +
    '<button class="btn" data-act="copy" title="把最近一个有价格记录的日子（如 9.16）的价格，一键复制到左边选中的日期（如 9.17）">复制上一日价格</button>' +
    '<label class="switch" title="改完单价离开输入框时，自动为当天留下一条价格记录">' +
    '<input type="checkbox" id="autoRec" checked> 自动记价</label>' +
    '<button class="btn" data-act="done">完成，返回看板</button>' +
    "</div>" +
    "</div>" +
    '<div class="card"><div class="table-wrap"><table class="sheet"><thead><tr>' +
    '<th class="c-idx" style="text-align:center">序号</th>' +
    '<th class="c-name">产品名称</th><th class="c-brand">品牌</th><th class="c-model">型号</th>' +
    '<th class="c-spec">基本参数 / 说明</th>' +
    '<th class="c-qty" style="text-align:center">数量 / 单位</th>' +
    '<th class="c-price" style="text-align:right">单价 ¥</th>' +
    '<th class="c-sub" style="text-align:right">小计 ¥</th>' +
    '<th class="c-trend">价格走势</th><th class="c-link">商品链接</th><th class="c-act">操作</th>' +
    "</tr></thead><tbody id=\"sheetBody\"></tbody>" +
    '<tfoot class="sum"><tr>' +
    '<td colspan="5" style="text-align:right;color:var(--ink-2);font-weight:500">合计</td>' +
    '<td style="text-align:center" id="fQty">0</td>' +
    '<td style="text-align:right;font-size:12px;color:var(--ink-3);font-weight:500" id="fPriced"></td>' +
    '<td class="t" id="fTotal">¥0.00</td>' +
    '<td colspan="3"></td>' +
    "</tr></tfoot></table></div></div>"
  );
}

function renderSheet(): void {
  const q = S.active();
  if (!q) return;
  const body = document.getElementById("sheetBody") as HTMLElement | null;
  if (!body) return;
  if (!q.items.length) {
    body.innerHTML =
      '<tr><td colspan="11"><div class="empty"><b>清单是空的</b>' +
      '<p>点上方「＋ 添加硬件」开始录入</p></div></td></tr>';
  } else {
    body.innerHTML = q.items.map((it, i) => rowHTML(it, i, q.items.length)).join("");
  }
  autoGrowAll();
  renderFoot();
}

function autoGrowAll(): void {
  const list = document.querySelectorAll<HTMLTextAreaElement>("textarea.cell");
  list.forEach((el) => {
    el.style.height = "auto";
    el.style.height = Math.max(31, el.scrollHeight) + "px";
  });
}

function renderFoot(): void {
  const q = S.active();
  if (!q) return;
  const st = S.statsOf(q);
  const a = document.getElementById("fQty");
  const b = document.getElementById("fPriced");
  const c = document.getElementById("fTotal");
  if (a) a.textContent = String(st.qty);
  if (b) b.textContent = st.priced + " 项已报价" + (st.missing ? " · " + st.missing + " 项未填" : "");
  if (c) c.textContent = U.money(st.total);
}

function findItem(itemId: string): QuotationItem | null {
  const q = S.active();
  if (!q) return null;
  return q.items.find((it) => it.id === itemId) || null;
}

function rowOf(el: Element): HTMLElement | null {
  return el.closest ? el.closest<HTMLElement>("tr") : null;
}

function bind(): void {
  const q = S.active();
  if (!q) return;

  const chk = document.getElementById("autoRec") as HTMLInputElement | null;
  if (chk) {
    let v = "1";
    try {
      v = localStorage.getItem(AUTOREC_KEY) || "1";
    } catch {
      /* ignore */
    }
    chk.checked = v !== "0";
    chk.addEventListener("change", () => {
      try {
        localStorage.setItem(AUTOREC_KEY, chk.checked ? "1" : "0");
      } catch {
        /* ignore */
      }
      U.toast(chk.checked ? "已开启：改完单价自动记当天" : "已关闭自动记价");
    });
  }

  const titleEl = document.getElementById("eqTitle") as HTMLInputElement | null;
  if (titleEl) {
    titleEl.addEventListener("input", () => {
      S.rename(q.id, titleEl.value);
      sidebar.render();
    });
  }

  /* 操作按钮 */
  const head = document.querySelector(".q-actions");
  if (head) {
    head.addEventListener("click", (e) => {
      const b = (e.target as Element).closest ? (e.target as Element).closest("[data-act]") : null;
      if (!b) return;
      const act = b.getAttribute("data-act");

      if (act === "add") {
        S.addItem(q.id, { name: "新硬件", qty: "1", unit: "个" });
        renderSheet();
        const rows = document.querySelectorAll("#sheetBody tr");
        const last = rows[rows.length - 1];
        if (last) {
          const inp = last.querySelector<HTMLInputElement>('input[data-f="name"]');
          if (inp) {
            inp.focus();
            inp.select();
          }
          if (last.scrollIntoView) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        U.toast("已添加，直接输入名称");
      } else if (act === "done") {
        getApp().setMode("dashboard");
      } else if (act === "copy") {
        const d = (document.getElementById("snapDate2") as HTMLInputElement).value || U.todayISO();
        const src = S.prevPriceDate(q.id, d);
        if (!src) {
          U.toast(U.fmtDateCN(d) + " 之前还没有价格记录日，无法复制 —— 可先用「记录该日价格」建个基线");
          return;
        }
        const existed = S.countOnDate(q.id, d);
        if (existed && !confirm(U.fmtDateCN(d) + " 已有 " + existed + " 项记录，用 " + U.fmtDateCN(src) + " 的价格覆盖？")) return;
        const n = S.copyDate(q.id, d, src);
        renderSheet();
        U.toast("已把 " + U.fmtDateCN(src) + " 的 " + n + " 项价格复制到 " + U.fmtDateCN(d) + "（没记录过的项跳过）");
      } else if (act === "snap") {
        const d = (document.getElementById("snapDate2") as HTMLInputElement).value || U.todayISO();
        const st = S.statsOf(q);
        if (st.priced === 0) {
          U.toast("清单里还没有任何单价");
          return;
        }
        const existed = S.countOnDate(q.id, d);
        if (existed && !confirm(U.fmtDateCN(d) + " 已有 " + existed + " 项记录，用当前清单里的单价覆盖？")) return;
        const n = S.snapshotAll(q.id, d);
        renderSheet();
        U.toast("已按 " + U.fmtDateCN(d) + " 记录 " + n + " 项");
      }
    });
  }

  const body = document.getElementById("sheetBody") as HTMLElement | null;
  if (!body) return;

  /* 单元格输入 */
  body.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    const f = el.getAttribute("data-f");
    if (!f) return;
    const tr = rowOf(el);
    if (!tr) return;
    const it = findItem(tr.getAttribute("data-id") || "");
    if (!it) return;

    if (f === "qty") {
      const dv = U.digitsOnly(el.value);
      if (dv !== el.value) el.value = dv;
      it.qty = dv;
    } else if (f === "price") {
      const mv = U.moneyInput(el.value);
      if (mv !== el.value) el.value = mv;
      it.price = mv;
      el.classList.toggle("empty", mv.trim() === "");
    } else if (f === "spec") {
      it.spec = el.value;
      el.style.height = "auto";
      el.style.height = Math.max(31, el.scrollHeight) + "px";
    } else if (f in it) {
      (it as unknown as Record<string, string>)[f] = el.value;
    }
    updateRow(it);
    S.save(true);
  });

  /* 改完单价离开输入框 → 自动记当天 */
  body.addEventListener("change", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.getAttribute("data-f") !== "price") return;
    if (!autoRecordOn()) return;
    const tr = rowOf(el);
    if (!tr) return;
    const it = findItem(tr.getAttribute("data-id") || "");
    if (!it) return;
    if (String(it.price).trim() === "") return;

    const d = U.todayISO();
    const h = it.history || [];
    const lastDate = h.length ? h[h.length - 1].date : null;
    if (lastDate === d && U.num(h[h.length - 1].price) === U.num(it.price)) return;

    S.upsertHistory(it, d, it.price, "");
    S.save(true);
    renderSheet();
    U.toast("已记录 " + U.fmtDateCN(d) + " 价格：" + U.money(U.num(it.price)));
  });

  /* 行内按钮 */
  body.addEventListener("click", (e) => {
    const b = (e.target as Element).closest ? (e.target as Element).closest("[data-act]") : null;
    if (!b) return;
    const act = b.getAttribute("data-act");
    const tr = b.closest<HTMLElement>("tr");
    const id = tr ? tr.getAttribute("data-id") : b.getAttribute("data-id");
    if (!id) return;
    const it = findItem(id);
    if (!it) return;

    if (act === "del") {
      if (!confirm("从清单中删除「" + (it.name || "该项") + "」？")) return;
      S.removeItem(q.id, id);
      renderSheet();
      U.toast("已删除");
    } else if (act === "up") {
      S.moveItem(q.id, id, -1);
      renderSheet();
    } else if (act === "down") {
      S.moveItem(q.id, id, 1);
      renderSheet();
    } else if (act === "open") {
      const url = U.normalizeLink(it.link);
      if (!url) {
        const inp2 = tr ? tr.querySelector<HTMLInputElement>('input[data-f="link"]') : null;
        if (inp2) inp2.focus();
        U.toast("先填入商品链接再打开");
        return;
      }
      if (url !== it.link) {
        it.link = url;
        S.save(true);
        if (tr) {
          const li = tr.querySelector<HTMLInputElement>('input[data-f="link"]');
          if (li) li.value = url;
        }
      }
      window.open(url, "_blank", "noopener");
    } else if (act === "trend") {
      modal.open(id, q.id);
    }
  });
}

function updateRow(it: QuotationItem): void {
  const cell = document.querySelector<HTMLElement>('[data-sub="' + it.id + '"]');
  if (cell) {
    const s = U.num(it.qty) * U.num(it.price);
    cell.textContent = s > 0 ? U.money(s) : "—";
    cell.className = "sub-cell" + (s > 0 ? "" : " zero");
  }
  renderFoot();
}

export const editor = { html, bind, renderSheet };
export default editor;