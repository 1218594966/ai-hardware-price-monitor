/* =========================================================
   appRef.ts — 视图模块访问应用控制器的唯一入口
   （避免视图 ⇄ app 的循环依赖：类型只做接口，运行时经此处取实例）
   ========================================================= */

export interface AppApi {
  boot(): void;
  renderMain(): void;
  renderAll(): void;
  setMode(m: "dashboard" | "editor"): void;
  mode(): "dashboard" | "editor";
  exportJSON(): void;
  importFile(file: File): void;
  applyImport(parsed: unknown): void;
}

let instance: AppApi | null = null;

/** 由 app.ts 在初始化时注册 */
export function registerApp(a: AppApi): void {
  instance = a;
}

/** 视图在运行时（事件回调里）通过它拿到应用控制器 */
export function getApp(): AppApi {
  if (!instance) throw new Error("应用控制器尚未初始化");
  return instance;
}