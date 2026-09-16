/* =========================================================
   main.ts — 应用入口：引入样式、启动应用、兜底错误提示
   （打包产物为 iife，index.html 双击即可运行）
   ========================================================= */
import "../styles/tokens.css";
import "../styles/layout.css";
import "../styles/components.css";
import "../styles/print.css";

import { app, view } from "./app";
import { store } from "./store";
import { util } from "./util";
import { charts } from "./charts";

function showBootError(msg?: string): void {
  const el = document.getElementById("bootError");
  if (!el) return;
  if (msg) {
    const div = el.querySelector("div");
    if (div) div.insertAdjacentHTML("afterbegin", "<p style='color:#ffd7a8'>" + msg + "</p>");
  }
  el.hidden = false;
}

try {
  app.boot();

  // 保留 window.HW 便于在控制台调试
  (window as unknown as Record<string, unknown>).HW = { app, store, util, charts, view };
} catch (e) {
  showBootError(e instanceof Error ? e.message : String(e));
  console.error(e);
}