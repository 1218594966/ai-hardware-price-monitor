/* =========================================================
   views/modal.ts — 单品价格走势明细弹窗
   对应旧版 assets/js/modal.js
   ========================================================= */
import { util as U } from "../util";
import { charts as C } from "../charts";
import { store as S } from "../store";
import { sidebar } from "./sidebar";
import { getApp } from "../appRef";
import type { QuotationItem } from "../types";

let itemId: string | null = null;
let quoteId: string | null = null;

function ctx() {
  return { item: findItem(), quote: quoteId ? S.get(quoteId) : S.active() };
}

function findItem(): QuotationItem | null {
  if (!itemId) return null;
  const qs = S.all();
  for (const q of qs) {
    if (quoteId && q.id !== quoteId) continue;
    const found = q.items.find((x) => x.id === itemId);
    if (found) return found;
  }
  for (const q of qs) {
    const found = q.items.find((x) => x.id === itemId);
    if (found) return found;
  }
  return null;
}

function stat(k: string, v: string, cls = ""): string {
  return '<div class="mstat"><div class="k">' + k + '</div><div class="v' + (cls ? " " + cls : "") + '">' + v + "</div></div>";
}

function renderStats(it: QuotationItem): void {
  const t = S.trendOf(it);
  const box = document.getElementById("mStats");
  if (!box) return;
  if (!t) {
    box.innerHTML = stat("记录条数", "0") + stat("当前单价", U.money(U.num(it.price)));
    return;
  }
  const vals = t.vals;
  const mx = Math.max.apply(null, vals);
  const mn = Math.min.apply(null, vals);
  let sum = 0;
  for (const v of vals) sum += v;
  const sign = t.diff > 0 ? "+" : "−";
  box.innerHTML =
    stat("记录条数", t.h.length + " 条") +
    stat("最新单价", U.money(t.last)) +
    stat("首次单价", U.money(t.first)) +
    '<div class="mstat"><div class="k">累计变动</div>' + (t.diff === 0
      ? '<div class="v sm muted">持平</div>'
      : '<div class="v sm ' + t.cls + '">' + sign + U.money(Math.abs(t.diff)) +
        "（" + sign + Math.abs(t.pct).toFixed(2) + "%）</div>") + "</div>" +
    stat("最高", U.money(mx)) +
    stat("最低", U.money(mn)) +
    stat("平均", U.money(sum / vals.length));
}

function renderChart(it: QuotationItem): void {
  const t = S.trendOf(it);
  const box = document.getElementById("mChart");
  if (!box) return;
  box.innerHTML = t
    ? C.line(t.h, { width: 900, height: 250 })
    : '<div class="chart-empty">还没有价格记录 —— 用下面的表单添加第一条</div>';
}

function renderRecords(it: QuotationItem): void {
  const h = S.histOf(it);
  const cnt = document.getElementById("recCount");
  if (cnt) cnt.textContent = h.length ? "共 " + h.length + " 条，按日期升序" : "";
  const box = document.getElementById("recList");
  if (!box) return;
  if (!h.length) {
    box.innerHTML = '<div class="chart-empty">暂无记录</div>';
    return;
  }

  const rows = h.map((r, i) => {
    const prev = i > 0 ? U.num(h[i - 1].price) : null;
    const d = prev === null ? null : U.num(r.price) - prev;
    const cls = d === null || d === 0 ? "flat" : d > 0 ? "up" : "down";
    const txt = d === null ? (h.length > 1 ? "首条" : "—") : d === 0 ? "0" : (d > 0 ? "+" : "−") + U.money(Math.abs(d));
    return (
      "<tr>" +
      '<td class="rc-date"><input type="date" data-ri="' + i + '" data-rf="date" value="' + U.esc(r.date) + '"></td>' +
      '<td class="rc-price"><input class="rec-price" data-ri="' + i + '" data-rf="price" value="' + U.esc(r.price) + '" placeholder="0.00"></td>' +
      '<td class="rec-delta ' + cls + '" data-rdelta="' + i + '">' + txt + "</td>" +
      '<td><input data-ri="' + i + '" data-rf="note" value="' + U.esc(r.note) + '" placeholder="备注…"></td>' +
      '<td class="rc-mark">' + (i === h.length - 1 && h.length > 1 ? '<span class="tag">最新</span>' : "") + "</td>" +
      '<td class="rc-act">' +
      '<button class="mini-btn del" data-act="recdel" data-ri="' + i + '" title="删除这条记录">✕</button></td>' +
      "</tr>"
    );
  }).join("");

  box.innerHTML =
    '<table class="rec-table"><thead><tr>' +
    '<th class="rc-date">日期</th><th class="rc-price">单价 ¥</th><th class="rec-delta">环比</th>' +
    "<th>备注</th><th></th><th></th></tr></thead><tbody>" + rows + "</tbody></table>";
}

function render(): void {
  const it = findItem();
  if (!it) {
    close();
    return;
  }
  const q = quoteId ? S.get(quoteId) : null;

  const title = document.getElementById("mTitle");
  if (title) title.textContent = it.name || "未命名硬件";
  const sub = document.getElementById("mSub");
  if (sub) {
    const parts = [it.brand, it.model].filter(Boolean).join(" · ") || "—";
    const link = it.link
      ? '　<a class="m-link" href="' + U.esc(U.normalizeLink(it.link)) + '" target="_blank" rel="noopener">商品链接 ↗</a>'
      : "";
    sub.innerHTML =
      U.esc(parts) +
      "　当前单价 " + (String(it.price).trim() === "" ? "未填" : U.money(U.num(it.price))) +
      "　×" + U.esc(it.qty) + " " + U.esc(it.unit) +
      (q ? '　<span class="m-quiet">' + U.esc(q.name) + "</span>" : "") +
      link;
  }
  renderStats(it);
  renderChart(it);
  renderRecords(it);
}

function open(iId: string, qId?: string): void {
  itemId = iId;
  quoteId = qId || S.state.activeId;
  const rd = document.getElementById("recDate") as HTMLInputElement | null;
  if (rd) rd.value = U.todayISO();
  const rp = document.getElementById("recPrice") as HTMLInputElement | null;
  if (rp) rp.value = "";
  const rn = document.getElementById("recNote") as HTMLInputElement | null;
  if (rn) rn.value = "";
  render();
  const mask = document.getElementById("itemMask");
  if (mask) mask.hidden = false;
}

function close(): void {
  const mask = document.getElementById("itemMask");
  const wasOpen = mask && !mask.hidden;
  if (mask) mask.hidden = true;
  itemId = null;
  quoteId = null;
  /* 关掉后把改动同步回看板 / 侧栏（迷你走势、合计、涨跌） */
  if (wasOpen) {
    sidebar.render();
    getApp().renderMain();
  }
}

function isOpen(): boolean {
  const mask = document.getElementById("itemMask");
  return !!mask && !mask.hidden;
}

function bind(): void {
  const mask = document.getElementById("itemMask");
  if (!mask) return;

  mask.addEventListener("click", (e) => {
    const t = e.target as Element;
    if (t.hasAttribute && t.hasAttribute("data-close")) {
      close();
      return;
    }
    if (t === mask) {
      close();
      return;
    }

    const b = t.closest ? t.closest("[data-act]") : null;
    if (!b || b.getAttribute("data-act") !== "recdel") return;
    const it = findItem();
    if (!it) return;
    const h = S.histOf(it);
    const rec = h[parseInt(b.getAttribute("data-ri") || "", 10)];
    if (!rec) return;
    if (!confirm("删除 " + U.fmtDateCN(rec.date) + " 的记录（" + U.money(U.num(rec.price)) + "）？")) return;
    it.history = (it.history || []).filter((x) => x !== rec);
    S.save(true);
    render();
    U.toast("已删除该条记录");
  });

  const list = document.getElementById("recList");
  if (list) {
    list.addEventListener("input", (e) => {
      const el = e.target as HTMLInputElement;
      const ri = el.getAttribute("data-ri");
      const rf = el.getAttribute("data-rf");
      if (ri === null || !rf) return;
      const it = findItem();
      if (!it) return;
      const rec = S.histOf(it)[parseInt(ri, 10)];
      if (!rec) return;

      if (rf === "price") {
        const v = U.moneyInput(el.value);
        if (v !== el.value) el.value = v;
        rec.price = v;
        refreshDerived(it);
        S.save(true);
      } else if (rf === "note") {
        rec.note = el.value;
        S.save(true);
      }
    });

    list.addEventListener("change", (e) => {
      const el = e.target as HTMLInputElement;
      if (el.getAttribute("data-rf") !== "date") return;
      const it = findItem();
      if (!it) return;
      const rec = S.histOf(it)[parseInt(el.getAttribute("data-ri") || "", 10)];
      if (!rec) return;
      const nd = el.value;
      if (!nd || nd === rec.date) return;

      let dup: typeof rec | null = null;
      for (const h of it.history || []) {
        if (h !== rec && h.date === nd) {
          dup = h;
          break;
        }
      }
      if (dup) {
        if (!confirm(U.fmtDateCN(nd) + " 已有一条记录（" + U.money(U.num(dup.price)) + "），用这条覆盖它？")) {
          render();
          return;
        }
        it.history = it.history.filter((x) => x !== dup);
      }
      rec.date = nd;
      it.history.sort(U.byDate);
      S.save(true);
      render();
      U.toast("日期已改为 " + U.fmtDateCN(nd));
    });
  }

  const add = document.getElementById("recAdd");
  if (add) {
    add.addEventListener("click", () => {
      const it = findItem();
      if (!it) return;
      const d = (document.getElementById("recDate") as HTMLInputElement).value || U.todayISO();
      const priceIn = document.getElementById("recPrice") as HTMLInputElement;
      const noteIn = document.getElementById("recNote") as HTMLInputElement;
      const p = U.moneyInput(priceIn.value);
      const note = noteIn.value.trim();
      if (p === "") {
        U.toast("先填一个单价再添加");
        priceIn.focus();
        return;
      }

      let existed: { date: string; price: string; note: string } | null = null;
      for (const h of it.history || []) {
        if (h.date === d) {
          existed = h;
          break;
        }
      }
      if (existed && !confirm(U.fmtDateCN(d) + " 已有记录（" + U.money(U.num(existed.price)) +
        "），覆盖为 " + U.money(U.num(p)) + "？")) return;

      S.upsertHistory(it, d, p, note);
      S.save(true);
      priceIn.value = "";
      noteIn.value = "";
      render();
      U.toast("已记录 " + U.fmtDateCN(d) + "：" + U.money(U.num(p)));
    });
  }

  const clr = document.getElementById("recClear");
  if (clr) {
    clr.addEventListener("click", () => {
      const it = findItem();
      if (!it) return;
      const len = (it.history || []).length;
      if (!len) {
        U.toast("本来就没有记录");
        return;
      }
      if (!confirm("清空「" + (it.name || "该硬件") + "」的全部 " + len + " 条价格记录？不可撤销。")) return;
      it.history = [];
      S.save(true);
      render();
      U.toast("已清空该产品的价格记录");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });
}

/** 改价后只刷新图表 / 统计 / 环比列，不重绘输入框（避免打断输入） */
function refreshDerived(it: QuotationItem): void {
  renderStats(it);
  renderChart(it);
  const h = S.histOf(it);
  for (let i = 1; i < h.length; i++) {
    const cell = document.querySelector<HTMLElement>('[data-rdelta="' + i + '"]');
    if (!cell) continue;
    const d = U.num(h[i].price) - U.num(h[i - 1].price);
    cell.className = "rec-delta " + (d === 0 ? "flat" : d > 0 ? "up" : "down");
    cell.textContent = d === 0 ? "0" : (d > 0 ? "+" : "−") + U.money(Math.abs(d));
  }
}

export const modal = { open, close, bind, isOpen, currentItem: findItem };
export default modal;