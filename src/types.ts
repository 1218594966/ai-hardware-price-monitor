/* =========================================================
   types.ts — 数据模型类型定义
   ========================================================= */

/** 一条价格历史记录；price 保持用户原样输入的字符串 */
export interface PriceRecord {
  date: string;   // "YYYY-MM-DD"
  price: string;  // "" 表示空
  note: string;
}

/** 报价单中的一项硬件 */
export interface QuotationItem {
  id: string;
  name: string;
  brand: string;
  model: string;
  spec: string;
  qty: string;    // 字符串输入，避免浮点精度问题
  unit: string;
  price: string;  // "" 表示未报价
  link: string;
  history: PriceRecord[];
}

/** 报价条款 */
export interface Term {
  label: string;
  value: string;
}

/** 一张报价单 */
export interface Quotation {
  id: string;
  name: string;
  note: string;
  docNo: string;
  createdAt: string;
  terms: Term[];
  items: QuotationItem[];
}

/** 走势口径：total = 单价×数量 | unit = 单价之和 */
export type TrendMode = "total" | "unit";

/** 走势序列上的一个点 */
export interface SeriesPoint {
  date: string;
  price: number;
}

/** 涨跌方向（中国习惯：涨红跌绿） */
export type TrendCls = "up" | "down" | "flat";

/** 单项硬件的走势汇总 */
export interface TrendInfo {
  h: PriceRecord[];
  vals: number[];
  first: number;
  last: number;
  diff: number;
  pct: number;
  cls: TrendCls;
}

/** 报价单统计 */
export interface Stats {
  items: number;
  qty: number;
  priced: number;
  missing: number;
  total: number;
  dates: number;
  lastDate: string | null;
}

/** 首末日变动 */
export interface Delta {
  diff: number;
  pct: number;
}

/** JSON 导出 / 导入的数据结构 */
export interface BackupPayload {
  app?: string;
  version?: number;
  exportedAt?: string;
  quotations: Quotation[];
}