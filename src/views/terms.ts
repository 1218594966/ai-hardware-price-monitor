/* =========================================================
   views/terms.ts — 报价条款编辑弹窗（条款不写死，增删改随报价单走）
   对应旧版 assets/js/terms.js
   ========================================================= */
import { util as U } from "../util";
import { store as S } from "../store";
import { sidebar } from "./sidebar";
import { getApp } from "../appRef";

let quoteId: string | null = null;

function current() {
  return quoteId ? S.get(quoteId) : null;
}

function render(): void {
  const q = current();
  if (!q) {
    close();
    return;
  }
  const sub = document.getElementById("termsSub");
  if (sub) {
    sub.textContent = "「" + (q.name || "未命名报价单") + "」的条款会原样出现在生成的报价单上，按需增删改";
  }
  const box = document.getElementById("termsTable");
  if (!box) return;

  if (!q.terms.length) {
    box.innerHTML = '<div class="chart-empty">还没有条款 —— 点下面「添加一条条款」</div>';
    return;
  }
  const rows = q.terms.map((t, i) => {
    return (
      "<tr>" +
      '<td class="term-label"><input data-ti="' + i + '" data-tf="label" value="' + U.esc(t.label) + '" placeholder="条款名"></td>' +
      '<td><input data-ti="' + i + '" data-tf="value" value="' + U.esc(t.value) + '" placeholder="条款内容"></td>' +
      '<td class="rc-act">' +
      '<button class="mini-btn del" data-act="termdel" data-ti="' + i + '" title="删除这条条款">✕</button></td>' +
      "</tr>"
    );
  }).join("");
  box.innerHTML =
    '<table class="rec-table"><thead><tr>' +
    "<th>条款名</th><th>条款内容</th><th></th>" +
    "</tr></thead><tbody>" + rows + "</tbody></table>";
}

function open(qId: string): void {
  quoteId = qId || S.state.activeId;
  render();
  const mask = document.getElementById("termsMask");
  if (mask) mask.hidden = false;
}

function close(): void {
  const mask = document.getElementById("termsMask");
  if (mask) mask.hidden = true;
  quoteId = null;
  sidebar.render();
  getApp().renderMain();
}

function isOpen(): boolean {
  const mask = document.getElementById("termsMask");
  return !!mask && !mask.hidden;
}

function bind(): void {
  const mask = document.getElementById("termsMask");
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
    if (!b) return;
    const act = b.getAttribute("data-act");
    const q = current();
    if (!q) return;

    if (act === "termdel") {
      const i = parseInt(b.getAttribute("data-ti") || "", 10);
      if (isNaN(i)) return;
      const term = q.terms[i];
      if (term && String(term.label).trim() && !confirm("删除条款「" + term.label + "」？")) return;
      S.removeTerm(q.id, i);
      render();
    } else if (act === "termadd") {
      S.addTerm(q.id, "", "");
      render();
      const inputs = document.querySelectorAll<HTMLInputElement>('#termsTable input[data-tf="label"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    } else if (act === "termreset") {
      if (!confirm("恢复为默认条款？当前条款会被覆盖。")) return;
      S.resetTerms(q.id);
      render();
      U.toast("已恢复默认条款");
    }
  });

  const box = document.getElementById("termsTable");
  if (box) {
    box.addEventListener("input", (e) => {
      const el = e.target as HTMLInputElement;
      const ti = el.getAttribute("data-ti");
      const tf = el.getAttribute("data-tf");
      if (ti === null || !tf) return;
      const q = current();
      if (!q) return;
      const t = q.terms[parseInt(ti, 10)];
      if (!t) return;
      (t as unknown as Record<string, string>)[tf] = el.value;
      S.save(true);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });
}

export const terms = { open, close, bind, isOpen };
export default terms;