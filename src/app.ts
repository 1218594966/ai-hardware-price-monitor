/* =========================================================
   app.ts — 应用控制器：模式切换 / 渲染调度 / JSON 导入导出 / 启动
   对应旧版 assets/js/app.js
   ========================================================= */
import { util as U } from "./util";
import { store as S } from "./store";
import { registerApp } from "./appRef";
import type { AppApi } from "./appRef";
import type { Quotation, QuotationItem } from "./types";
import { sidebar } from "./views/sidebar";
import { dashboard } from "./views/dashboard";
import { editor } from "./views/editor";
import { modal } from "./views/modal";
import { terms } from "./views/terms";
import { quoteDoc } from "./views/quoteDoc";

const MODE_KEY = "ai-quote-mode";
const STORE_KEY = "ai-quote-v1";

type Mode = "dashboard" | "editor";
let mode: Mode = "dashboard";

/* ---------------- 模式 ---------------- */

function loadMode(): void {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "editor" || v === "dashboard") mode = v;
  } catch {
    /* ignore */
  }
}
function saveMode(): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function setMode(m: Mode): void {
  mode = m === "editor" ? "editor" : "dashboard";
  saveMode();
  renderMain();
  const main = document.querySelector(".main");
  if (main) main.scrollTop = 0;
}

function currentMode(): Mode {
  return mode;
}

/* ---------------- 渲染 ---------------- */

function renderMain(): void {
  const box = document.getElementById("mainInner");
  if (!box) return;

  if (mode === "editor") {
    box.innerHTML = editor.html();
    editor.renderSheet();
    editor.bind();
  } else {
    box.innerHTML = dashboard.html();
    dashboard.bind();
  }
  syncTitle();
}

function renderAll(): void {
  sidebar.render();
  renderMain();
}

function syncTitle(): void {
  const q = S.active();
  const name = q && q.name ? q.name : "报价单管理";
  document.title = name + " · AI 一体机价格监控";
}

/* ---------------- JSON 导入 ---------------- */

function normalizeItem(d: unknown): QuotationItem {
  const dd = (d || {}) as Partial<QuotationItem>;
  let hist: QuotationItem["history"] = [];
  if (Array.isArray(dd.history)) {
    hist = dd.history
      .filter((h) => h && h.date)
      .map((h) => ({
        date: String(h.date).slice(0, 10),
        price: U.hasVal(h.price) ? String(h.price) : "",
        note: h.note || ""
      }))
      .sort(U.byDate);
  }
  return {
    id: dd.id || U.uid("i"),
    name: dd.name || "",
    brand: dd.brand || "",
    model: dd.model || "",
    spec: dd.spec || "",
    qty: U.hasVal(dd.qty) ? String(dd.qty) : "1",
    unit: dd.unit || "个",
    price: U.hasVal(dd.price) ? String(dd.price) : "",
    link: dd.link || "",
    history: hist
  };
}

function exportJSON(): void {
  const data = {
    app: "AI 一体机 · 报价单管理",
    version: 2,
    exportedAt: new Date().toISOString(),
    quotations: S.all()
  };
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "报价单数据-" + U.todayISO().replace(/-/g, "") + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      /* 用 parentNode 判空，防止页面在 0ms 内被重绘/切换导致误删 */
      if (a.parentNode) a.parentNode.removeChild(a);
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }, 0);
    U.toast("已导出 " + S.all().length + " 张报价单");
  } catch (e) {
    U.toast("导出失败：" + (e && (e as Error).message ? (e as Error).message : "浏览器不支持"));
  }
}

function importFile(file: File): void {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(String(reader.result));
    } catch {
      U.toast("不是有效的 JSON 文件");
      return;
    }
    applyImport(parsed);
  };
  reader.onerror = () => U.toast("读取文件失败");
  try {
    reader.readAsText(file, "utf-8");
  } catch {
    U.toast("无法读取该文件");
  }
}

function applyImport(parsed: unknown): void {
  let qs: unknown[] | null = null;
  if (parsed && Array.isArray((parsed as { quotations?: unknown[] }).quotations)) {
    qs = (parsed as { quotations: unknown[] }).quotations;
  } else if (Array.isArray(parsed)) {
    qs = [{ name: "导入的报价单", note: "由旧版 JSON 导入", items: parsed }];
  } else if (parsed && Array.isArray((parsed as { items?: unknown[] }).items)) {
    qs = [{
      name: (parsed as { name?: string }).name || "导入的报价单",
      note: "由 JSON 导入",
      items: (parsed as { items: unknown[] }).items
    }];
  }

  if (!qs || !qs.length) {
    U.toast("文件里没有可导入的报价单");
    return;
  }

  if (!confirm("导入会覆盖本机当前的 " + S.all().length + " 张报价单，换成文件里的 " +
    qs.length + " 张。确定继续？（建议先「导出 JSON」备份一次）")) return;

  const norm: Quotation[] = qs.map((q, i) => {
    const qq = (q || {}) as Partial<Quotation>;
    return {
      id: qq.id || U.uid("q"),
      name: qq.name || "报价单 " + (i + 1),
      note: qq.note || "",
      docNo: qq.docNo || "Q-" + U.todayISO().replace(/-/g, "") + "-" + U.pad2(i + 1),
      createdAt: qq.createdAt || U.todayISO(),
      terms: Array.isArray(qq.terms) ? qq.terms : [],
      items: Array.isArray(qq.items) ? qq.items.map(normalizeItem) : []
    };
  });

  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        quotations: norm,
        activeId: norm[0].id,
        savedAt: new Date().toISOString()
      })
    );
  } catch {
    U.toast("写入本机存储失败，导入中止");
    return;
  }

  S.load();
  renderAll();
  U.toast("已导入 " + norm.length + " 张报价单");
}

/* ---------------- 绑定（只在启动时执行一次） ---------------- */

function bindAppbar(): void {
  const nb = document.getElementById("btnNewQuote");
  if (nb) {
    nb.addEventListener("click", () => {
      if (S.all().length >= 40 && !confirm("已经有 " + S.all().length + " 张报价单了，确定还要新建？")) return;
      const q = S.create();
      S.setActive(q.id);
      S.save(true);
      if (mode !== "editor") {
        setMode("editor");
      } else {
        renderAll();
      }
      U.toast("已新建「" + q.name + "」—— 名称可以直接在标题处改");
    });
  }

  const ex = document.getElementById("btnExport");
  if (ex) ex.addEventListener("click", exportJSON);

  const im = document.getElementById("btnImport");
  const fi = document.getElementById("fileImport") as HTMLInputElement | null;
  if (im && fi) {
    im.addEventListener("click", () => {
      fi.value = "";
      fi.click();
    });
    fi.addEventListener("change", () => {
      if (fi.files && fi.files[0]) importFile(fi.files[0]);
    });
  }
}

function bindSidebarList(): void {
  const box = document.getElementById("qList");
  if (!box) return;
  box.addEventListener("click", (e) => {
    const item = (e.target as Element).closest ? (e.target as Element).closest("[data-q]") : null;
    if (!item) return;
    const id = item.getAttribute("data-q");
    if (!id || id === S.state.activeId) return;
    S.setActive(id);
    S.save(true);
    renderAll();
  });
}

/* ---------------- 启动 ---------------- */

function boot(): void {
  loadMode();
  S.load();

  if (!S.all().length) {
    S.create();
    S.setActive(S.all()[0].id);
  }

  sidebar.render();
  renderMain();

  bindAppbar();
  bindSidebarList();
  modal.bind();
  terms.bind();
}

export const view = { dashboard, editor, sidebar, modal, terms, quoteDoc };

export const app: AppApi = {
  boot,
  renderMain,
  renderAll,
  setMode,
  mode: currentMode,
  exportJSON,
  importFile,
  applyImport
};

registerApp(app);

export default app;