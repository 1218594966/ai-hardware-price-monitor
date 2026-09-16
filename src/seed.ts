/* =========================================================
   seed.ts — 首次运行的默认示例配置（带真实价格与历史走势）
   数据来源：design/设计稿-报价单版.html 的 seed()
   ========================================================= */
import { uid, pad2 } from "./util";
import type { Quotation, QuotationItem } from "./types";

/** 示例历史价按这 4 个日期铺开（每条记录日期、价格一一对应） */
export const SEED_DATES = ["2026-06-16", "2026-07-16", "2026-08-16", "2026-09-16"];

interface SeedItemInput {
  name: string;
  brand?: string;
  model?: string;
  qty?: number;
  unit?: string;
  price: number;
  spec?: string;
  link?: string;
  hist?: number[];
}

interface SeedQuotationInput {
  name: string;
  note: string;
  createdAt: string;
  items: SeedItemInput[];
}

/** 3 套默认配置（与原设计稿一致） */
export const SEED_QUOTATIONS: SeedQuotationInput[] = [
  {
    name: "边缘节点标准配置",
    note: "桌面静音型边缘节点 · 大模型推理 + 数字孪生",
    createdAt: "2026-06-16",
    items: [
      { name: "大模型显卡", brand: "NVIDIA", model: "RTX 5090 32GB", qty: 1, unit: "张", price: 62509, spec: "物理显存不低于32GB，支撑本地大模型推理与长上下文计算。", hist: [64800, 63900, 63100, 62509], link: "https://item.jd.com/100012043978.html" },
      { name: "数字孪生显卡", brand: "七彩虹", model: "RTX5070 Ultra W OC 16G", qty: 1, unit: "张", price: 11299, spec: "承担视觉识别管线（YOLO/OCR）与三维渲染并发负载。", hist: [11800, 11500, 11400, 11299], link: "https://item.jd.com/100019688076.html" },
      { name: "CPU散热", brand: "利民", model: "420mm 一体式水冷", qty: 1, unit: "式", price: 639, hist: [639, 649, 645, 639] },
      { name: "CPU", brand: "Intel", model: "Core Ultra 9 285K", qty: 1, unit: "颗", price: 3699, hist: [3999, 3899, 3799, 3699] },
      { name: "主板", brand: "华硕", model: "ROG STRIX Z890-A", qty: 1, unit: "块", price: 2699, hist: [2699, 2750, 2720, 2699] },
      { name: "内存", brand: "十铨", model: "DDR5 96GB（48GB×2）6400MHz+", qty: 1, unit: "组", price: 11999, hist: [8999, 10500, 11800, 11999] },
      { name: "系统硬盘", brand: "三星", model: "9100 Pro 2TB PCIe 5.0 NVMe ×2", qty: 2, unit: "组", price: 2999, hist: [3199, 3099, 3050, 2999] },
      { name: "存储硬盘", brand: "希捷", model: "4TB 企业级机械硬盘", qty: 2, unit: "块", price: 1600, hist: [1600, 1600, 1600, 1600] },
      { name: "电源", brand: "", model: "1500W ATX 3.1 金牌全模组", qty: 1, unit: "式", price: 800, hist: [899, 850, 820, 800] },
      { name: "显示器", brand: "AOC", model: "27 英寸 120Hz", qty: 1, unit: "台", price: 749, hist: [799, 780, 760, 749] },
      { name: "键鼠套装", brand: "罗技", model: "MK106", qty: 1, unit: "式", price: 69, hist: [69, 69, 69, 69] },
      { name: "机箱", brand: "Fractal Design", model: "Define 7 XL 全塔机箱", qty: 1, unit: "台", price: 1749, hist: [1799, 1799, 1770, 1749] },
      { name: "UPS电源", brand: "山特", model: "C6K 6KVA/5.4KW 内置电池一体机", qty: 1, unit: "式", price: 6588, hist: [5888, 6188, 6400, 6588] },
      { name: "MaxKB授权", brand: "飞致云", model: "企业版", qty: 1, unit: "式", price: 48000, spec: "知识库问答系统授权。", hist: [48000, 48000, 48000, 48000] }
    ]
  },
  {
    name: "轻量推理节点",
    note: "小模型 / RAG 轻量部署，8 项基础配置",
    createdAt: "2026-07-02",
    items: [
      { name: "推理显卡", brand: "七彩虹", model: "RTX 4060 Ti 16G", qty: 1, unit: "张", price: 3499, hist: [3699, 3599, 3550, 3499] },
      { name: "CPU", brand: "Intel", model: "Core Ultra 5 245K", qty: 1, unit: "颗", price: 2199, hist: [2299, 2250, 2220, 2199] },
      { name: "主板", brand: "华硕", model: "TUF B860M-PLUS", qty: 1, unit: "块", price: 1099, hist: [1099, 1120, 1110, 1099] },
      { name: "内存", brand: "金士顿", model: "DDR5 64GB（32GB×2）", qty: 1, unit: "组", price: 1599, hist: [1299, 1420, 1520, 1599] },
      { name: "系统硬盘", brand: "三星", model: "990 Pro 1TB NVMe", qty: 1, unit: "块", price: 899, hist: [949, 929, 910, 899] },
      { name: "电源", brand: "长城", model: "750W 金牌全模组", qty: 1, unit: "式", price: 499, hist: [499, 499, 499, 499] },
      { name: "机箱", brand: "先马", model: "平头哥 M1", qty: 1, unit: "台", price: 259, hist: [259, 259, 249, 259] },
      { name: "键鼠套装", brand: "罗技", model: "MK120", qty: 1, unit: "式", price: 79, hist: [79, 79, 79, 79] }
    ]
  },
  {
    name: "双卡训练工作站",
    note: "双卡训练 + 大容量 ECC 内存，10 项高配",
    createdAt: "2026-08-01",
    items: [
      { name: "训练显卡", brand: "NVIDIA", model: "RTX 6000 Ada 48G", qty: 2, unit: "张", price: 58800, hist: [62000, 60800, 59500, 58800] },
      { name: "CPU", brand: "AMD", model: "Threadripper 7970X", qty: 1, unit: "颗", price: 18999, hist: [19999, 19500, 19200, 18999] },
      { name: "主板", brand: "华硕", model: "Pro WS TRX50-SAGE WIFI", qty: 1, unit: "块", price: 8999, hist: [8999, 8999, 8799, 8999] },
      { name: "内存", brand: "三星", model: "ECC DDR5 256GB（64GB×4）", qty: 1, unit: "组", price: 12999, hist: [8999, 10500, 12000, 12999] },
      { name: "系统硬盘", brand: "三星", model: "9100 Pro 4TB PCIe 5.0", qty: 2, unit: "块", price: 3999, hist: [4299, 4150, 4050, 3999] },
      { name: "存储硬盘", brand: "希捷", model: "16TB 企业级氦气盘", qty: 4, unit: "块", price: 2499, hist: [2599, 2550, 2520, 2499] },
      { name: "CPU散热", brand: "猫头鹰", model: "NH-U14S TR5-SP6", qty: 1, unit: "式", price: 1299, hist: [1299, 1299, 1299, 1299] },
      { name: "电源", brand: "海韵", model: "PRIME TX-1600 钛金", qty: 1, unit: "式", price: 3299, hist: [3199, 3250, 3280, 3299] },
      { name: "机箱", brand: "Fractal Design", model: "Meshify 2 XL", qty: 1, unit: "台", price: 1499, hist: [1499, 1499, 1499, 1499] },
      { name: "UPS电源", brand: "山特", model: "C10K 10KVA 长效机", qty: 1, unit: "式", price: 12800, hist: [11800, 12200, 12500, 12800] }
    ]
  }
];

/** 把「当前价 + 历史价数组」展开成价格记录；只保留最新一条（9 月 16 日） */
export function buildSeedItems(list: SeedItemInput[]): QuotationItem[] {
  return list.map((o) => {
    const latest = o.hist && o.hist.length ? o.hist[o.hist.length - 1] : o.price;
    const history = o.hist
      ? [{
          date: SEED_DATES[SEED_DATES.length - 1],
          price: String(latest),
          note: "最新询价"
        }]
      : [];
    return {
      id: uid("i"),
      name: o.name,
      brand: o.brand || "",
      model: o.model || "",
      spec: o.spec || "",
      qty: String(o.qty ?? 1),
      unit: o.unit || "个",
      price: String(o.price),
      link: o.link || "",
      history
    };
  });
}

/** 生成 3 张带价格的默认报价单 */
export function buildSeedQuotations(): Quotation[] {
  return SEED_QUOTATIONS.map((q, i) => ({
    id: uid("q"),
    name: q.name,
    note: q.note,
    docNo: "Q-" + q.createdAt.replace(/-/g, "") + "-" + pad2(i + 1),
    createdAt: q.createdAt,
    terms: [], // 由 store.makeTerms 统一补默认条款
    items: buildSeedItems(q.items)
  }));
}

export default buildSeedQuotations;