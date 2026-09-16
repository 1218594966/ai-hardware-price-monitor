/* =========================================================
   seed.ts — 首次运行的默认示例配置（带真实价格与历史走势、完整基本参数）
   硬件与基本参数来源：旧版单文件版 DEFAULT_ITEMS（14 项全量参数）
   价格历史：只保留最新一条（2026-09-16）
   ========================================================= */
import { uid, pad2 } from "./util";
import type { Quotation, QuotationItem } from "./types";

/** 历史价使用的日期（当前只保留最后一天，即 9 月 16 日） */
export const SEED_DATES = ["2026-06-16", "2026-07-16", "2026-08-16", "2026-09-16"];

/** 上一版默认清单里仅有说明的 3 项（用于识别「未改动的旧默认数据」并自动升级） */
export const PREV_SEED_SPECS: Record<string, string> = {
  大模型显卡: "物理显存不低于32GB，支撑本地大模型推理与长上下文计算。",
  数字孪生显卡: "承担视觉识别管线（YOLO/OCR）与三维渲染并发负载。",
  MaxKB授权: "知识库问答系统授权。"
};

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

/** 3 套默认配置（基本参数与原设计一致，全面补齐） */
export const SEED_QUOTATIONS: SeedQuotationInput[] = [
  {
    name: "边缘节点标准配置",
    note: "桌面静音型边缘节点 · 大模型推理 + 数字孪生",
    createdAt: "2026-06-16",
    items: [
      { name: "大模型显卡", brand: "NVIDIA", model: "RTX 5090 32GB", qty: 1, unit: "张", price: 62509, spec: "物理显存不低于32GB，支撑本地大模型推理与长上下文计算。", hist: [64800, 63900, 63100, 62509], link: "https://item.jd.com/100012043978.html" },
      { name: "数字孪生显卡", brand: "七彩虹", model: "RTX5070 Ultra W OC 16G", qty: 1, unit: "张", price: 11299, spec: "物理显存不低于16GB，承担视觉识别管线（YOLO/OCR）与三维渲染并发负载。视觉管线按需加载预估显存≤12GB，UE孪生渲染预估≤4GB，合计≤16GB。", hist: [11800, 11500, 11400, 11299], link: "https://item.jd.com/100019688076.html" },
      { name: "CPU散热", brand: "利民", model: "420mm 一体式水冷", qty: 1, unit: "式", price: 639, spec: "满足桌面静音型边缘节点连续运行散热要求。", hist: [639, 649, 645, 639] },
      { name: "CPU", brand: "Intel", model: "Core Ultra 9 285K", qty: 1, unit: "颗", price: 3699, spec: "支撑容器编排、业务服务调度与多进程并发。", hist: [3999, 3899, 3799, 3699] },
      { name: "主板", brand: "华硕", model: "ROG STRIX Z890-A", qty: 1, unit: "块", price: 2699, spec: "Z890 平台，满足高带宽存储、显卡与外设扩展需求。", hist: [2699, 2750, 2720, 2699] },
      { name: "内存", brand: "十铨", model: "DDR5 96GB（48GB×2）6400MHz+", qty: 1, unit: "组", price: 11999, spec: "满足本地模型、RAG、数据库与数字孪生并发运行。", hist: [8999, 10500, 11800, 11999] },
      { name: "系统硬盘", brand: "三星", model: "9100 Pro 2TB PCIe 5.0 NVMe ×2", qty: 2, unit: "组", price: 2999, spec: "作为系统盘、模型盘与高速权重加载介质。", hist: [3199, 3099, 3050, 2999] },
      { name: "存储硬盘", brand: "希捷", model: "4TB 企业级机械硬盘", qty: 2, unit: "块", price: 1600, spec: "用于日志、时序数据与本地备份数据持久化。", hist: [1600, 1600, 1600, 1600] },
      { name: "电源", brand: "", model: "1500W ATX 3.1 金牌全模组", qty: 1, unit: "式", price: 800, spec: "满足高功耗显卡与满载运行供电冗余。", hist: [899, 850, 820, 800] },
      { name: "显示器", brand: "AOC", model: "27 英寸 120Hz", qty: 1, unit: "台", price: 749, spec: "用于本地数字孪生大屏、运维工作台与调试显示。", hist: [799, 780, 760, 749] },
      { name: "键鼠套装", brand: "罗技", model: "MK106", qty: 1, unit: "式", price: 69, spec: "用于现场基础运维与调试输入。", hist: [69, 69, 69, 69] },
      { name: "机箱", brand: "Fractal Design", model: "Define 7 XL 全塔机箱", qty: 1, unit: "台", price: 1749, spec: "全塔静音机箱，满足桌面部署、风道与扩展空间要求。", hist: [1799, 1799, 1770, 1749] },
      { name: "UPS电源", brand: "山特", model: "C6K 6KVA/5.4KW 内置电池一体机", qty: 1, unit: "式", price: 6588, spec: "提供市电异常缓冲、数据落盘与安全关机保障。", hist: [5888, 6188, 6400, 6588] },
      { name: "MaxKB授权", brand: "飞致云", model: "企业版", qty: 1, unit: "式", price: 48000, spec: "知识库问答系统授权。", hist: [48000, 48000, 48000, 48000] }
    ]
  },
  {
    name: "轻量推理节点",
    note: "小模型 / RAG 轻量部署，8 项基础配置",
    createdAt: "2026-07-02",
    items: [
      { name: "推理显卡", brand: "七彩虹", model: "RTX 4060 Ti 16G", qty: 1, unit: "张", price: 3499, spec: "16GB 显存，满足中小模型推理与 RAG 向量检索并发算力。", hist: [3699, 3599, 3550, 3499] },
      { name: "CPU", brand: "Intel", model: "Core Ultra 5 245K", qty: 1, unit: "颗", price: 2199, spec: "满足轻量容器编排、业务调度与并发处理需求。", hist: [2299, 2250, 2220, 2199] },
      { name: "主板", brand: "华硕", model: "TUF B860M-PLUS", qty: 1, unit: "块", price: 1099, spec: "B860 平台，满足主流扩展与供电需求。", hist: [1099, 1120, 1110, 1099] },
      { name: "内存", brand: "金士顿", model: "DDR5 64GB（32GB×2）", qty: 1, unit: "组", price: 1599, spec: "满足小模型加载、RAG 语料与缓存运行。", hist: [1299, 1420, 1520, 1599] },
      { name: "系统硬盘", brand: "三星", model: "990 Pro 1TB NVMe", qty: 1, unit: "块", price: 899, spec: "作为系统盘与模型快速加载介质。", hist: [949, 929, 910, 899] },
      { name: "电源", brand: "长城", model: "750W 金牌全模组", qty: 1, unit: "式", price: 499, spec: "满足整机满载供电需求。", hist: [499, 499, 499, 499] },
      { name: "机箱", brand: "先马", model: "平头哥 M1", qty: 1, unit: "台", price: 259, spec: "紧凑型机箱，适合桌面部署。", hist: [259, 259, 249, 259] },
      { name: "键鼠套装", brand: "罗技", model: "MK120", qty: 1, unit: "式", price: 79, spec: "用于现场基础运维与调试输入。", hist: [79, 79, 79, 79] }
    ]
  },
  {
    name: "双卡训练工作站",
    note: "双卡训练 + 大容量 ECC 内存，10 项高配",
    createdAt: "2026-08-01",
    items: [
      { name: "训练显卡", brand: "NVIDIA", model: "RTX 6000 Ada 48G", qty: 2, unit: "张", price: 58800, spec: "48GB×2 双卡并行，满足模型训练与微调负载。", hist: [62000, 60800, 59500, 58800] },
      { name: "CPU", brand: "AMD", model: "Threadripper 7970X", qty: 1, unit: "颗", price: 18999, spec: "32 核 64 线程，满足训练数据预处理与多任务并行。", hist: [19999, 19500, 19200, 18999] },
      { name: "主板", brand: "华硕", model: "Pro WS TRX50-SAGE WIFI", qty: 1, unit: "块", price: 8999, spec: "TRX50 平台，支持双卡与高带宽存储扩展。", hist: [8999, 8999, 8799, 8999] },
      { name: "内存", brand: "三星", model: "ECC DDR5 256GB（64GB×4）", qty: 1, unit: "组", price: 12999, spec: "ECC 大容量内存，满足训练集缓存与工作负载。", hist: [8999, 10500, 12000, 12999] },
      { name: "系统硬盘", brand: "三星", model: "9100 Pro 4TB PCIe 5.0", qty: 2, unit: "块", price: 3999, spec: "作为系统盘与高速数据集加载介质。", hist: [4299, 4150, 4050, 3999] },
      { name: "存储硬盘", brand: "希捷", model: "16TB 企业级氦气盘", qty: 4, unit: "块", price: 2499, spec: "用于数据集、日志与备份数据持久化。", hist: [2599, 2550, 2520, 2499] },
      { name: "CPU散热", brand: "猫头鹰", model: "NH-U14S TR5-SP6", qty: 1, unit: "式", price: 1299, spec: "满足高功耗处理器满载散热要求。", hist: [1299, 1299, 1299, 1299] },
      { name: "电源", brand: "海韵", model: "PRIME TX-1600 钛金", qty: 1, unit: "式", price: 3299, spec: "高转换效率，满足双卡训练满载供电冗余。", hist: [3199, 3250, 3280, 3299] },
      { name: "机箱", brand: "Fractal Design", model: "Meshify 2 XL", qty: 1, unit: "台", price: 1499, spec: "全塔机箱，满足双卡、水冷与扩展空间要求。", hist: [1499, 1499, 1499, 1499] },
      { name: "UPS电源", brand: "山特", model: "C10K 10KVA 长效机", qty: 1, unit: "式", price: 12800, spec: "提供市电异常缓冲、数据落盘与安全关机保障。", hist: [11800, 12200, 12500, 12800] }
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