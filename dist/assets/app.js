"use strict";
(() => {
  // src/util.ts
  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function isoOf(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function todayISO() {
    return isoOf(/* @__PURE__ */ new Date());
  }
  function fmtDate(iso) {
    return String(iso).slice(5).replace("-", "/");
  }
  function fmtDateCN(iso) {
    const a = String(iso).split("-");
    if (a.length < 3) return String(iso);
    return a[0] + "年" + parseInt(a[1], 10) + "月" + parseInt(a[2], 10) + "日";
  }
  function num(v) {
    if (v === null || v === void 0 || v === "") return 0;
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  function money(n) {
    return "¥" + (n || 0).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  function moneyShort(n) {
    const a = Math.abs(n || 0);
    if (a >= 1e8) return "¥" + (n / 1e8).toFixed(2).replace(/\.?0+$/, "") + "亿";
    if (a >= 1e6) return "¥" + (n / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
    return "¥" + Math.round(n || 0).toLocaleString("zh-CN");
  }
  function esc(s) {
    if (s === null || s === void 0) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var _seq = 0;
  function uid(prefix = "i") {
    _seq++;
    return prefix + Date.now().toString(36) + _seq.toString(36);
  }
  function byDate(a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  }
  function clampStr(s) {
    return String(s === null || s === void 0 ? "" : s);
  }
  function hasVal(v) {
    return v !== null && v !== void 0 && v !== "";
  }
  function normalizeLink(u) {
    let s = String(u || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s) && !/^(mailto:|tel:)/i.test(s)) s = "https://" + s;
    return s;
  }
  function digitsOnly(s) {
    return String(s || "").replace(/[^0-9]/g, "");
  }
  function moneyInput(s) {
    let v = String(s || "").replace(/[^0-9.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    return v;
  }
  function rmbUpper(amount) {
    let n = Math.round(num(amount) * 100);
    if (n === 0) return "零元整";
    const neg = n < 0;
    n = Math.abs(n);
    const D = "零壹贰叁肆伍陆柒捌玖";
    const U1 = ["", "拾", "佰", "仟"];
    const U2 = ["", "万", "亿", "万亿", "亿亿"];
    const yuan = Math.floor(n / 100);
    const jiao = Math.floor(n / 10) % 10;
    const fen = n % 10;
    let str = "";
    if (yuan > 0) {
      const s = String(yuan);
      const parts = [];
      for (let i = s.length; i > 0; i -= 4) parts.unshift(s.substring(Math.max(0, i - 4), i));
      for (let p = 0; p < parts.length; p++) {
        const sec = parts[p];
        let secStr = "";
        let secZero = false;
        for (let j = 0; j < sec.length; j++) {
          const d = parseInt(sec.charAt(j), 10);
          const u = U1[sec.length - 1 - j];
          if (d === 0) {
            secZero = true;
          } else {
            if (secZero && secStr !== "") secStr += "零";
            secZero = false;
            secStr += D.charAt(d) + u;
          }
        }
        if (secStr === "") continue;
        if (str !== "" && sec.charAt(0) === "0" && str.slice(-1) !== "零") str += "零";
        str += secStr + (U2[parts.length - 1 - p] || "");
      }
      str = str.replace(/零{2,}/g, "零").replace(/零+$/, "");
    }
    let out = yuan > 0 ? str + "元" : "";
    if (jiao === 0 && fen === 0) {
      out += yuan > 0 ? "整" : "零元整";
    } else {
      if (yuan === 0) out = "零元";
      if (fen === 0) out += D.charAt(jiao) + "角整";
      else if (jiao === 0) out += (yuan > 0 ? "零" : "") + D.charAt(fen) + "分";
      else out += D.charAt(jiao) + "角" + D.charAt(fen) + "分";
    }
    return (neg ? "负" : "") + out;
  }
  var _toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    if (_toastTimer !== null) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }
  function debounce(fn, ms) {
    let t = null;
    return function(...args) {
      if (t !== null) clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
  var util = {
    pad2,
    isoOf,
    todayISO,
    fmtDate,
    fmtDateCN,
    num,
    money,
    moneyShort,
    esc,
    uid,
    byDate,
    clampStr,
    hasVal,
    normalizeLink,
    digitsOnly,
    moneyInput,
    rmbUpper,
    toast,
    debounce
  };

  // src/seed.ts
  var SEED_DATES = ["2026-06-16", "2026-07-16", "2026-08-16", "2026-09-16"];
  var PREV_SEED_SPECS = {
    大模型显卡: "物理显存不低于32GB，支撑本地大模型推理与长上下文计算。",
    数字孪生显卡: "承担视觉识别管线（YOLO/OCR）与三维渲染并发负载。",
    MaxKB授权: "知识库问答系统授权。"
  };
  var SEED_QUOTATIONS = [
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
        { name: "MaxKB授权", brand: "飞致云", model: "企业版", qty: 1, unit: "式", price: 48e3, spec: "知识库问答系统授权。", hist: [48e3, 48e3, 48e3, 48e3] }
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
        { name: "训练显卡", brand: "NVIDIA", model: "RTX 6000 Ada 48G", qty: 2, unit: "张", price: 58800, spec: "48GB×2 双卡并行，满足模型训练与微调负载。", hist: [62e3, 60800, 59500, 58800] },
        { name: "CPU", brand: "AMD", model: "Threadripper 7970X", qty: 1, unit: "颗", price: 18999, spec: "32 核 64 线程，满足训练数据预处理与多任务并行。", hist: [19999, 19500, 19200, 18999] },
        { name: "主板", brand: "华硕", model: "Pro WS TRX50-SAGE WIFI", qty: 1, unit: "块", price: 8999, spec: "TRX50 平台，支持双卡与高带宽存储扩展。", hist: [8999, 8999, 8799, 8999] },
        { name: "内存", brand: "三星", model: "ECC DDR5 256GB（64GB×4）", qty: 1, unit: "组", price: 12999, spec: "ECC 大容量内存，满足训练集缓存与工作负载。", hist: [8999, 10500, 12e3, 12999] },
        { name: "系统硬盘", brand: "三星", model: "9100 Pro 4TB PCIe 5.0", qty: 2, unit: "块", price: 3999, spec: "作为系统盘与高速数据集加载介质。", hist: [4299, 4150, 4050, 3999] },
        { name: "存储硬盘", brand: "希捷", model: "16TB 企业级氦气盘", qty: 4, unit: "块", price: 2499, spec: "用于数据集、日志与备份数据持久化。", hist: [2599, 2550, 2520, 2499] },
        { name: "CPU散热", brand: "猫头鹰", model: "NH-U14S TR5-SP6", qty: 1, unit: "式", price: 1299, spec: "满足高功耗处理器满载散热要求。", hist: [1299, 1299, 1299, 1299] },
        { name: "电源", brand: "海韵", model: "PRIME TX-1600 钛金", qty: 1, unit: "式", price: 3299, spec: "高转换效率，满足双卡训练满载供电冗余。", hist: [3199, 3250, 3280, 3299] },
        { name: "机箱", brand: "Fractal Design", model: "Meshify 2 XL", qty: 1, unit: "台", price: 1499, spec: "全塔机箱，满足双卡、水冷与扩展空间要求。", hist: [1499, 1499, 1499, 1499] },
        { name: "UPS电源", brand: "山特", model: "C10K 10KVA 长效机", qty: 1, unit: "式", price: 12800, spec: "提供市电异常缓冲、数据落盘与安全关机保障。", hist: [11800, 12200, 12500, 12800] }
      ]
    }
  ];
  function buildSeedItems(list) {
    return list.map((o) => {
      const latest = o.hist && o.hist.length ? o.hist[o.hist.length - 1] : o.price;
      const history = o.hist ? [{
        date: SEED_DATES[SEED_DATES.length - 1],
        price: String(latest),
        note: "最新询价"
      }] : [];
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
  function buildSeedQuotations() {
    return SEED_QUOTATIONS.map((q, i) => ({
      id: uid("q"),
      name: q.name,
      note: q.note,
      docNo: "Q-" + q.createdAt.replace(/-/g, "") + "-" + pad2(i + 1),
      createdAt: q.createdAt,
      terms: [],
      // 由 store.makeTerms 统一补默认条款
      items: buildSeedItems(q.items)
    }));
  }

  // src/store.ts
  var KEY = "ai-quote-v1";
  var LEGACY_KEY = "ai-hardware-price-v1";
  var PREF_KEY = "ai-quote-prefs";
  var DEFAULT_TERMS = [
    { label: "报价有效期", value: "自报价之日起 30 天" },
    { label: "交货周期", value: "合同签订后 15 个工作日" },
    { label: "付款方式", value: "预付 30%，到货验收后付 70%" },
    { label: "质保期", value: "整机 3 年 / 硬盘 5 年" },
    { label: "报价说明", value: "本报价含税含运费；硬件价格随市场波动，超出有效期需重新核价。" }
  ];
  var state = {
    quotations: [],
    activeId: null,
    trendMode: "total"
  };
  function save(silent = false) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          quotations: state.quotations,
          activeId: state.activeId,
          savedAt: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      return true;
    } catch {
      if (!silent) toast("保存失败：浏览器存储不可用");
      return false;
    }
  }
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && (p.trendMode === "unit" || p.trendMode === "total")) state.trendMode = p.trendMode;
      }
    } catch {
    }
  }
  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ trendMode: state.trendMode }));
    } catch {
    }
  }
  function trimHistory(arr) {
    const out = [];
    if (!Array.isArray(arr)) return out;
    for (const h of arr) {
      const rec = h || {};
      if (!rec.date) continue;
      out.push({
        date: String(rec.date).slice(0, 10),
        price: hasVal(rec.price) ? String(rec.price) : "",
        note: rec.note || ""
      });
    }
    out.sort(byDate);
    return out;
  }
  function makeItem(d = {}) {
    return {
      id: d.id || uid("i"),
      name: d.name || "",
      brand: d.brand || "",
      model: d.model || "",
      spec: d.spec || "",
      qty: hasVal(d.qty) ? String(d.qty) : "1",
      unit: d.unit || "个",
      price: hasVal(d.price) ? String(d.price) : "",
      link: d.link || "",
      history: trimHistory(d.history)
    };
  }
  function makeTerms(arr) {
    if (!Array.isArray(arr) || !arr.length) {
      return DEFAULT_TERMS.map((t) => ({ label: t.label, value: t.value }));
    }
    const out = [];
    for (const raw of arr) {
      const t = raw || {};
      out.push({ label: t.label || "", value: t.value || "" });
    }
    return out;
  }
  function docNoFor(index) {
    return "Q-" + todayISO().replace(/-/g, "") + "-" + pad2((index || 0) + 1);
  }
  function makeQuotation(d = {}, index = 0) {
    const items = [];
    if (Array.isArray(d.items)) items.push(...d.items.map(makeItem));
    return {
      id: d.id || uid("q"),
      name: d.name || "报价单 " + ((index || 0) + 1),
      note: d.note || "",
      docNo: d.docNo || docNoFor(index || 0),
      createdAt: d.createdAt || todayISO(),
      terms: makeTerms(d.terms),
      items
    };
  }
  function seedQuotations() {
    return buildSeedQuotations().map((q, i) => makeQuotation(q, i));
  }
  function isPristineSeed(mapped) {
    const raw = SEED_QUOTATIONS;
    if (mapped.length !== raw.length) return false;
    for (let i = 0; i < raw.length; i++) {
      const q = mapped[i];
      const rq = raw[i];
      if (q.name !== rq.name || q.items.length !== rq.items.length) return false;
      for (let j = 0; j < rq.items.length; j++) {
        const it = q.items[j];
        const ri = rq.items[j];
        if (it.name !== ri.name || it.price !== String(ri.price) || it.qty !== String(ri.qty ?? 1)) {
          return false;
        }
        const prevSpec = PREV_SEED_SPECS[ri.name];
        if (it.spec !== (ri.spec || "") && it.spec !== (prevSpec || "") && it.spec !== "") {
          return false;
        }
        const knownPrices = new Set((ri.hist || []).map((p) => String(p)));
        knownPrices.add(String(ri.price));
        for (const h of it.history || []) {
          if (!SEED_DATES.includes(h.date)) return false;
          if (!knownPrices.has(h.price)) return false;
        }
      }
    }
    return true;
  }
  function load() {
    loadPrefs();
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
    }
    if (raw) {
      try {
        const o = JSON.parse(raw);
        if (o && Array.isArray(o.quotations) && o.quotations.length) {
          const mapped = o.quotations.map((q, i) => {
            const qq = q || {};
            qq.terms = makeTerms(qq.terms);
            if (!Array.isArray(qq.items)) qq.items = [];
            if (!qq.docNo) qq.docNo = docNoFor(i);
            if (!qq.createdAt) qq.createdAt = todayISO();
            if (!qq.id) qq.id = uid("q");
            return qq;
          });
          const EMPTY_TEMPLATE_NAMES = ["边缘节点标准配置", "报价单 2", "报价单 3"];
          const isUnusedDefaults = mapped.length === 3 && mapped.every((q) => !q.items.length) && mapped.every((q) => EMPTY_TEMPLATE_NAMES.includes(q.name));
          if (isUnusedDefaults) {
            state.quotations = seedQuotations();
            state.activeId = state.quotations[0].id;
            save(true);
            return;
          }
          const activeIdx = Math.max(0, mapped.findIndex((q) => q.id === o.activeId));
          if (isPristineSeed(mapped)) {
            state.quotations = seedQuotations();
            state.activeId = state.quotations[Math.min(activeIdx, state.quotations.length - 1)].id;
            save(true);
            return;
          }
          state.quotations = mapped;
          state.activeId = o.activeId || state.quotations[0].id;
          return;
        }
      } catch {
      }
    }
    const seeded = seedQuotations();
    const q1 = seeded[0];
    let legacy = null;
    try {
      const lraw = localStorage.getItem(LEGACY_KEY);
      if (lraw) {
        const lo = JSON.parse(lraw);
        const larr = Array.isArray(lo) ? lo : lo && typeof lo === "object" && "items" in lo ? lo.items : null;
        if (Array.isArray(larr) && larr.length) {
          legacy = larr.map((d) => {
            const dd = d || {};
            return {
              id: uid("i"),
              name: dd.name || "",
              brand: dd.brand || "",
              model: dd.model || "",
              spec: dd.spec || "",
              qty: hasVal(dd.qty) ? String(dd.qty) : "1",
              unit: dd.unit || "个",
              price: hasVal(dd.price) ? String(dd.price) : "",
              link: dd.link || "",
              history: trimHistory(dd.history)
            };
          });
        }
      }
    } catch {
    }
    if (legacy) {
      q1.items = legacy;
      q1.note = "由旧版清单自动迁移";
    }
    state.quotations = seeded;
    state.activeId = state.quotations[0].id;
    save(true);
  }
  function all() {
    return state.quotations;
  }
  function get(id) {
    return state.quotations.find((q) => q.id === id) || null;
  }
  function active() {
    return get(state.activeId || "") || state.quotations[0] || null;
  }
  function setActive(id) {
    state.activeId = id;
  }
  function indexOf(id) {
    return state.quotations.findIndex((q) => q.id === id);
  }
  function create(name) {
    const q = makeQuotation({ name: name || "", note: "", createdAt: todayISO() }, state.quotations.length);
    state.quotations.push(q);
    save();
    return q;
  }
  function duplicate(id) {
    const src = get(id);
    if (!src) return null;
    const copy = makeQuotation(
      {
        name: src.name + " 副本",
        note: src.note,
        createdAt: todayISO(),
        terms: src.terms,
        items: src.items.map((it) => ({
          id: uid("i"),
          name: it.name,
          brand: it.brand,
          model: it.model,
          spec: it.spec,
          qty: it.qty,
          unit: it.unit,
          price: it.price,
          link: it.link,
          history: (it.history || []).slice()
        }))
      },
      state.quotations.length
    );
    state.quotations.push(copy);
    save();
    return copy;
  }
  function remove(id) {
    const i = indexOf(id);
    if (i < 0) return false;
    state.quotations.splice(i, 1);
    if (state.activeId === id) state.activeId = state.quotations[0] ? state.quotations[0].id : null;
    save();
    return true;
  }
  function rename(id, name) {
    const q = get(id);
    if (!q) return;
    q.name = name;
    save(true);
  }
  function setNote(id, note) {
    const q = get(id);
    if (!q) return;
    q.note = note;
    save(true);
  }
  function addTerm(quoteId3, label, value) {
    const q = get(quoteId3);
    if (!q) return;
    q.terms.push({ label: label || "", value: value || "" });
    save(true);
    return q.terms.length - 1;
  }
  function removeTerm(quoteId3, index) {
    const q = get(quoteId3);
    if (!q) return;
    q.terms.splice(index, 1);
    save(true);
  }
  function resetTerms(quoteId3) {
    const q = get(quoteId3);
    if (!q) return;
    q.terms = DEFAULT_TERMS.map((t) => ({ label: t.label, value: t.value }));
    save(true);
  }
  function addItem(quoteId3, data) {
    const q = get(quoteId3);
    if (!q) return null;
    const it = makeItem(Object.assign({ name: "新硬件", qty: "1", unit: "个" }, data || {}));
    q.items.push(it);
    save();
    return it;
  }
  function removeItem(quoteId3, itemId2) {
    const q = get(quoteId3);
    if (!q) return;
    q.items = q.items.filter((x) => x.id !== itemId2);
    save();
  }
  function moveItem(quoteId3, itemId2, dir) {
    const q = get(quoteId3);
    if (!q) return;
    const i = q.items.findIndex((x) => x.id === itemId2);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= q.items.length) return;
    const t = q.items[i];
    q.items[i] = q.items[j];
    q.items[j] = t;
    save();
  }
  function histOf(item) {
    return (item.history || []).slice().sort(byDate);
  }
  function upsertHistory(item, date, price, note) {
    if (!item.history) item.history = [];
    let found = null;
    for (const h of item.history) {
      if (h.date === date) {
        found = h;
        break;
      }
    }
    if (found) {
      found.price = String(price);
      if (note) found.note = note;
    } else {
      item.history.push({ date, price: String(price), note: note || "" });
    }
    item.history.sort(byDate);
  }
  function trendOf(item) {
    const h = histOf(item);
    if (!h.length) return null;
    const vals = h.map((x) => num(x.price));
    const first = vals[0];
    const last = vals[vals.length - 1];
    const diff = last - first;
    const pct = first !== 0 ? diff / first * 100 : 0;
    return {
      h,
      vals,
      first,
      last,
      diff,
      pct,
      cls: diff > 0 ? "up" : diff < 0 ? "down" : "flat"
    };
  }
  function totalOf(q, mode2) {
    if (!q) return 0;
    const m = mode2 || state.trendMode;
    let s = 0;
    for (const it of q.items) {
      s += m === "unit" ? num(it.price) : num(it.price) * num(it.qty);
    }
    return s;
  }
  function allDates(q) {
    const seen = {};
    if (!q) return [];
    for (const it of q.items) {
      for (const h of it.history || []) seen[h.date] = 1;
    }
    return Object.keys(seen).sort();
  }
  function priceAsOf(item, date) {
    const h = histOf(item);
    if (!h.length) return num(item.price);
    let v = null;
    for (const r of h) {
      if (r.date <= date) v = r;
    }
    if (!v) v = h[0];
    return num(v.price);
  }
  function seriesOf(q, mode2) {
    const m = mode2 || state.trendMode;
    return allDates(q).map((d) => {
      let s = 0;
      for (const it of q ? q.items : []) {
        const p = priceAsOf(it, d);
        s += m === "unit" ? p : p * num(it.qty);
      }
      return { date: d, price: s };
    });
  }
  function deltaOf(q) {
    const s = seriesOf(q, "total");
    if (s.length < 2) return null;
    const a = s[0].price;
    const b = s[s.length - 1].price;
    return { diff: b - a, pct: a !== 0 ? (b - a) / a * 100 : 0 };
  }
  function statsOf(q = null) {
    const q2 = q || active();
    if (!q2) return { items: 0, qty: 0, priced: 0, missing: 0, total: 0, dates: 0, lastDate: null };
    let qty = 0;
    let priced = 0;
    let missing = 0;
    for (const it of q2.items) {
      qty += num(it.qty);
      if (String(it.price).trim() === "") missing++;
      else priced++;
    }
    const ds = allDates(q2);
    return {
      items: q2.items.length,
      qty,
      priced,
      missing,
      total: totalOf(q2, "total"),
      dates: ds.length,
      lastDate: ds.length ? ds[ds.length - 1] : null
    };
  }
  function snapshotAll(quoteId3, date) {
    const q = get(quoteId3);
    if (!q) return 0;
    let n = 0;
    for (const it of q.items) {
      if (String(it.price).trim() === "") continue;
      upsertHistory(it, date, it.price, "");
      n++;
    }
    if (n) save(true);
    return n;
  }
  function countOnDate(quoteId3, date) {
    const q = get(quoteId3);
    if (!q) return 0;
    let n = 0;
    for (const it of q.items) {
      for (const h of it.history || []) {
        if (h.date === date && String(it.price).trim() !== "") {
          n++;
          break;
        }
      }
    }
    return n;
  }
  function prevPriceDate(quoteId3, targetDate) {
    const q = get(quoteId3);
    if (!q) return null;
    const dates = allDates(q).filter((d) => d < targetDate);
    return dates.length ? dates[dates.length - 1] : null;
  }
  function copyDate(quoteId3, targetDate, sourceDate) {
    const q = get(quoteId3);
    if (!q) return 0;
    let n = 0;
    for (const it of q.items) {
      const h = histOf(it);
      if (!h.length || h[0].date > sourceDate) continue;
      const price = priceAsOf(it, sourceDate);
      upsertHistory(it, targetDate, String(price), "");
      n++;
    }
    if (n) save(true);
    return n;
  }
  function setTrendMode(m) {
    state.trendMode = m === "unit" ? "unit" : "total";
    savePrefs();
  }
  var store = {
    DEFAULT_TERMS,
    state,
    save,
    load,
    all,
    get,
    active,
    setActive,
    indexOf,
    create,
    duplicate,
    remove,
    rename,
    setNote,
    addTerm,
    removeTerm,
    resetTerms,
    addItem,
    removeItem,
    moveItem,
    histOf,
    upsertHistory,
    trendOf,
    totalOf,
    allDates,
    priceAsOf,
    seriesOf,
    deltaOf,
    statsOf,
    snapshotAll,
    countOnDate,
    prevPriceDate,
    copyDate,
    setTrendMode
  };

  // src/appRef.ts
  var instance = null;
  function registerApp(a) {
    instance = a;
  }
  function getApp() {
    if (!instance) throw new Error("应用控制器尚未初始化");
    return instance;
  }

  // src/charts.ts
  var seq = 0;
  function niceStep(raw) {
    if (!(raw > 0) || !isFinite(raw)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    const norm = raw / mag;
    const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return mult * mag;
  }
  function axisLabel(v, step) {
    if (Math.round(v) === 0) return "¥0";
    if (step >= 5e3) return "¥" + (v / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
    if (step >= 1) return "¥" + Math.round(v).toLocaleString("zh-CN");
    return "¥" + v.toFixed(1);
  }
  function pointLabel(v) {
    const a = Math.abs(v);
    if (a >= 1e8) return "¥" + (v / 1e8).toFixed(2).replace(/\.?0+$/, "") + "亿";
    if (a >= 1e6) return "¥" + (v / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
    return "¥" + Math.round(v).toLocaleString("zh-CN");
  }
  function chooseScale(lo, hi) {
    if (!(hi > lo)) hi = lo + (Math.abs(lo) * 0.1 || 100);
    const span = hi - lo;
    let best = null;
    for (let n = 3; n <= 8; n++) {
      const s = niceStep(span / n);
      if (!(s > 0)) continue;
      let mn = Math.floor(lo / s) * s;
      let mx = Math.ceil(hi / s) * s;
      if (mx <= mn) mx = mn + s;
      const ticks = Math.round((mx - mn) / s);
      const waste = (lo - mn + (mx - hi)) / span;
      const score = Math.abs(ticks - 4.5) + waste * 2;
      if (!best || score < best.score) best = { step: s, min: mn, max: mx, ticks, score };
    }
    return best || { step: 1, min: lo, max: hi, ticks: 4, score: 0 };
  }
  function line(points, opt = {}) {
    const W = opt.width || 900;
    const H = opt.height || 250;
    const padL = opt.padL || 78;
    const padR = opt.padR || 26;
    const padT = opt.padT || 24;
    const padB = opt.padB || 34;
    const n = points.length;
    if (!n) return '<div class="chart-empty">暂无数据</div>';
    const vals = points.map((p) => num(p.price));
    let lo = Math.min.apply(null, vals);
    let hi = Math.max.apply(null, vals);
    if (lo === hi) {
      const d0 = Math.abs(lo) * 0.08 || 100;
      lo -= d0;
      hi += d0;
    }
    const sc = chooseScale(lo, hi);
    const min = sc.min;
    const max = sc.max;
    const step = sc.step;
    const ticks = sc.ticks;
    const range = max - min;
    const iw = W - padL - padR;
    const ih = H - padT - padB;
    const times = points.map((p) => (/* @__PURE__ */ new Date(p.date + "T00:00:00")).getTime());
    const t0 = times[0];
    const t1 = times[n - 1];
    const X = (i) => t1 === t0 ? padL + iw * (n === 1 ? 0.5 : i / (n - 1)) : padL + iw * (times[i] - t0) / (t1 - t0);
    const Y = (v) => padT + ih * (1 - (v - min) / range);
    const diff = vals[n - 1] - vals[0];
    const color = opt.color || (diff > 0 ? "#FF3B30" : diff < 0 ? "#34C759" : "#007AFF");
    const gid = "cg" + ++seq;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" style="display:block">';
    s += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.20"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0.01"/></linearGradient></defs>';
    let k;
    for (k = 0; k <= ticks; k++) {
      const v = min + step * k;
      const y = Y(v);
      s += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke="rgba(60,60,67,0.10)" stroke-width="1"/>';
      s += '<text x="' + (padL - 9) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="rgba(60,60,67,0.35)">' + axisLabel(v, step) + "</text>";
    }
    const idxs = [];
    const seen = {};
    if (n <= 6) {
      for (k = 0; k < n; k++) idxs.push(k);
    } else {
      for (k = 0; k < 5; k++) idxs.push(Math.round(k * (n - 1) / 4));
    }
    for (k = 0; k < idxs.length; k++) {
      const ii = idxs[k];
      if (seen[ii]) continue;
      seen[ii] = 1;
      s += '<text x="' + X(ii).toFixed(1) + '" y="' + (H - padB + 19) + '" text-anchor="middle" font-size="11" fill="rgba(60,60,67,0.35)">' + fmtDate(points[ii].date) + "</text>";
    }
    const sx = [];
    const sy = [];
    for (k = 0; k < n; k++) {
      sx.push(X(k));
      sy.push(Y(vals[k]));
    }
    const single = n === 1;
    if (single) {
      s += '<line x1="' + padL + '" y1="' + sy[0].toFixed(1) + '" x2="' + (W - padR) + '" y2="' + sy[0].toFixed(1) + '" stroke="' + color + '" stroke-width="1.8" stroke-dasharray="6 5" stroke-opacity="0.55"/>';
    } else {
      s += '<path d="M' + sx[0].toFixed(1) + "," + (padT + ih) + " " + sx.map((x, i2) => "L" + x.toFixed(1) + "," + sy[i2].toFixed(1)).join(" ") + " L" + sx[n - 1].toFixed(1) + "," + (padT + ih) + ' Z" fill="url(#' + gid + ')"/>';
      s += '<polyline points="' + sx.map((x, i3) => x.toFixed(1) + "," + sy[i3].toFixed(1)).join(" ") + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    for (k = 0; k < n; k++) {
      const r = single ? 5.2 : 3.6;
      s += '<circle cx="' + sx[k].toFixed(1) + '" cy="' + sy[k].toFixed(1) + '" r="' + r + '" fill="#fff" stroke="' + color + '" stroke-width="2.4"><title>' + esc(points[k].date) + "　" + money(vals[k]) + "</title></circle>";
      if (n <= 8) {
        const an = k === 0 && n > 1 ? "start" : k === n - 1 && n > 1 ? "end" : "middle";
        s += '<text x="' + sx[k].toFixed(1) + '" y="' + (sy[k] - 12).toFixed(1) + '" text-anchor="' + an + '" font-size="' + (single ? 13 : 10.5) + '" font-weight="700" fill="' + color + '">' + pointLabel(vals[k]) + "</text>";
      }
    }
    return s + "</svg>";
  }
  function spark(hist, opt = {}) {
    const W = opt.width || 220;
    const H = opt.height || 52;
    const p = opt.pad === void 0 ? 6 : opt.pad;
    const vals = hist.map((h) => num(h.price));
    const n = vals.length;
    if (!n) return "";
    const lo = Math.min.apply(null, vals);
    const hi = Math.max.apply(null, vals);
    const flat = hi === lo;
    const span = hi - lo || 1;
    const diff = vals[n - 1] - vals[0];
    const color = opt.color || (diff > 0 ? "#FF3B30" : diff < 0 ? "#34C759" : "rgba(60,60,67,0.35)");
    const gid = "sg" + ++seq;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? W / 2 : p + (W - 2 * p) * i / (n - 1);
      const y = flat ? H / 2 : p + (H - 2 * p) * (1 - (vals[i] - lo) / span);
      pts.push([x, y]);
    }
    let s = '<svg class="sparkline" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">';
    if (n >= 2 && !flat) {
      s += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.22"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0.0"/></linearGradient></defs>';
      s += "<path d=M" + pts[0][0].toFixed(1) + "," + H + " " + pts.map((q) => "L" + q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ") + " L" + pts[n - 1][0].toFixed(1) + "," + H + ' Z" fill="url(#' + gid + ')"/>';
      s += '<polyline points="' + pts.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ") + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
    } else {
      s += '<line x1="' + p + '" y1="' + H / 2 + '" x2="' + (W - p) + '" y2="' + H / 2 + '" stroke="' + color + '" stroke-width="1.6" stroke-dasharray="4 4" stroke-opacity="0.6" vector-effect="non-scaling-stroke"/>';
    }
    s += '<circle cx="' + pts[n - 1][0].toFixed(1) + '" cy="' + pts[n - 1][1].toFixed(1) + '" r="3" fill="#fff" stroke="' + color + '" stroke-width="2.2" vector-effect="non-scaling-stroke"/>';
    return s + "</svg>";
  }
  var charts = {
    line,
    spark,
    niceStep,
    axisLabel,
    pointLabel,
    chooseScale
  };

  // src/views/sidebar.ts
  function sparkChange(q) {
    const s = store.seriesOf(q, "total");
    if (s.length < 2) return null;
    const a = s[0].price;
    const b = s[s.length - 1].price;
    const d = b - a;
    return {
      cls: d > 0 ? "up" : d < 0 ? "down" : "flat",
      txt: (d > 0 ? "↑ " : d < 0 ? "↓ " : "— ") + Math.abs(a !== 0 ? d / a * 100 : 0).toFixed(1) + "%"
    };
  }
  function itemHTML(q) {
    const s = store.seriesOf(q, "total");
    const t = sparkChange(q);
    const total = store.totalOf(q, "total");
    const act = q.id === store.state.activeId;
    return '<div class="q-item' + (act ? " active" : "") + '" data-q="' + q.id + '" title="' + util.esc(q.name) + '"><div class="q-top"><span class="q-name">' + util.esc(q.name || "未命名报价单") + '</span><span class="q-total">' + util.moneyShort(total) + '</span></div><div class="q-sub"><span class="q-meta">' + q.items.length + " 项 · " + s.length + ' 个记录日</span><span class="q-spark">' + (s.length >= 2 ? charts.spark(s, { width: 56, height: 20, pad: 2 }) : '<span class="q-nohist">暂无走势</span>') + (t ? '<span class="badge ' + t.cls + '" style="font-size:10px;padding:1px 5px">' + t.txt + "</span>" : "") + "</span></div></div>";
  }
  function render() {
    const box = document.getElementById("qList");
    if (!box) return;
    const list = store.all();
    if (!list.length) {
      box.innerHTML = '<div class="empty" style="padding:30px 10px"><b>还没有报价单</b><p>点上方「＋ 新建」开始</p></div>';
    } else {
      box.innerHTML = list.map(itemHTML).join("");
    }
    const c = document.getElementById("qCount");
    if (c) c.textContent = String(list.length);
  }
  var sidebar = { render };

  // src/views/modal.ts
  var itemId = null;
  var quoteId = null;
  function findItem() {
    if (!itemId) return null;
    const qs = store.all();
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
  function stat(k, v, cls = "") {
    return '<div class="mstat"><div class="k">' + k + '</div><div class="v' + (cls ? " " + cls : "") + '">' + v + "</div></div>";
  }
  function renderStats(it) {
    const t = store.trendOf(it);
    const box = document.getElementById("mStats");
    if (!box) return;
    if (!t) {
      box.innerHTML = stat("记录条数", "0") + stat("当前单价", util.money(util.num(it.price)));
      return;
    }
    const vals = t.vals;
    const mx = Math.max.apply(null, vals);
    const mn = Math.min.apply(null, vals);
    let sum = 0;
    for (const v of vals) sum += v;
    const sign = t.diff > 0 ? "+" : "−";
    box.innerHTML = stat("记录条数", t.h.length + " 条") + stat("最新单价", util.money(t.last)) + stat("首次单价", util.money(t.first)) + '<div class="mstat"><div class="k">累计变动</div>' + (t.diff === 0 ? '<div class="v sm" style="color:var(--ink-3)">持平</div>' : '<div class="v sm ' + t.cls + '">' + sign + util.money(Math.abs(t.diff)) + "（" + sign + Math.abs(t.pct).toFixed(2) + "%）</div>") + "</div>" + stat("最高", util.money(mx)) + stat("最低", util.money(mn)) + stat("平均", util.money(sum / vals.length));
  }
  function renderChart(it) {
    const t = store.trendOf(it);
    const box = document.getElementById("mChart");
    if (!box) return;
    box.innerHTML = t ? charts.line(t.h, { width: 900, height: 250 }) : '<div class="chart-empty">还没有价格记录 —— 用下面的表单添加第一条</div>';
  }
  function renderRecords(it) {
    const h = store.histOf(it);
    const cnt = document.getElementById("recCount");
    if (cnt) cnt.textContent = h.length ? "共 " + h.length + " 条，按日期升序" : "";
    const box = document.getElementById("recList");
    if (!box) return;
    if (!h.length) {
      box.innerHTML = '<div class="chart-empty">暂无记录</div>';
      return;
    }
    const rows = h.map((r, i) => {
      const prev = i > 0 ? util.num(h[i - 1].price) : null;
      const d = prev === null ? null : util.num(r.price) - prev;
      const cls = d === null || d === 0 ? "flat" : d > 0 ? "up" : "down";
      const txt = d === null ? h.length > 1 ? "首条" : "—" : d === 0 ? "0" : (d > 0 ? "+" : "−") + util.money(Math.abs(d));
      return '<tr><td style="width:150px"><input type="date" data-ri="' + i + '" data-rf="date" value="' + util.esc(r.date) + '"></td><td style="width:132px"><input class="rec-price" data-ri="' + i + '" data-rf="price" value="' + util.esc(r.price) + '" placeholder="0.00"></td><td class="rec-delta ' + cls + '" style="width:104px" data-rdelta="' + i + '">' + txt + '</td><td><input data-ri="' + i + '" data-rf="note" value="' + util.esc(r.note) + '" placeholder="备注…"></td><td style="width:52px;text-align:right">' + (i === h.length - 1 && h.length > 1 ? '<span class="tag">最新</span>' : "") + '</td><td style="width:44px;text-align:right"><button class="mini-btn del" data-act="recdel" data-ri="' + i + '" title="删除这条记录">✕</button></td></tr>';
    }).join("");
    box.innerHTML = '<table class="rec-table"><thead><tr><th>日期</th><th style="text-align:right">单价 ¥</th><th style="text-align:right">环比</th><th>备注</th><th></th><th></th></tr></thead><tbody>' + rows + "</tbody></table>";
  }
  function render2() {
    const it = findItem();
    if (!it) {
      close();
      return;
    }
    const q = quoteId ? store.get(quoteId) : null;
    const title = document.getElementById("mTitle");
    if (title) title.textContent = it.name || "未命名硬件";
    const sub = document.getElementById("mSub");
    if (sub) {
      const parts = [it.brand, it.model].filter(Boolean).join(" · ") || "—";
      const link = it.link ? '　<a href="' + util.esc(util.normalizeLink(it.link)) + '" target="_blank" rel="noopener" style="color:var(--brand);text-decoration:none">商品链接 ↗</a>' : "";
      sub.innerHTML = util.esc(parts) + "　当前单价 " + (String(it.price).trim() === "" ? "未填" : util.money(util.num(it.price))) + "　×" + util.esc(it.qty) + " " + util.esc(it.unit) + (q ? '　<span style="color:var(--ink-4)">' + util.esc(q.name) + "</span>" : "") + link;
    }
    renderStats(it);
    renderChart(it);
    renderRecords(it);
  }
  function open(iId, qId) {
    itemId = iId;
    quoteId = qId || store.state.activeId;
    const rd = document.getElementById("recDate");
    if (rd) rd.value = util.todayISO();
    const rp = document.getElementById("recPrice");
    if (rp) rp.value = "";
    const rn = document.getElementById("recNote");
    if (rn) rn.value = "";
    render2();
    const mask = document.getElementById("itemMask");
    if (mask) mask.hidden = false;
  }
  function close() {
    const mask = document.getElementById("itemMask");
    const wasOpen = mask && !mask.hidden;
    if (mask) mask.hidden = true;
    itemId = null;
    quoteId = null;
    if (wasOpen) {
      sidebar.render();
      getApp().renderMain();
    }
  }
  function isOpen() {
    const mask = document.getElementById("itemMask");
    return !!mask && !mask.hidden;
  }
  function bind() {
    const mask = document.getElementById("itemMask");
    if (!mask) return;
    mask.addEventListener("click", (e) => {
      const t = e.target;
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
      const h = store.histOf(it);
      const rec = h[parseInt(b.getAttribute("data-ri") || "", 10)];
      if (!rec) return;
      if (!confirm("删除 " + util.fmtDateCN(rec.date) + " 的记录（" + util.money(util.num(rec.price)) + "）？")) return;
      it.history = (it.history || []).filter((x) => x !== rec);
      store.save(true);
      render2();
      util.toast("已删除该条记录");
    });
    const list = document.getElementById("recList");
    if (list) {
      list.addEventListener("input", (e) => {
        const el = e.target;
        const ri = el.getAttribute("data-ri");
        const rf = el.getAttribute("data-rf");
        if (ri === null || !rf) return;
        const it = findItem();
        if (!it) return;
        const rec = store.histOf(it)[parseInt(ri, 10)];
        if (!rec) return;
        if (rf === "price") {
          const v = util.moneyInput(el.value);
          if (v !== el.value) el.value = v;
          rec.price = v;
          refreshDerived(it);
          store.save(true);
        } else if (rf === "note") {
          rec.note = el.value;
          store.save(true);
        }
      });
      list.addEventListener("change", (e) => {
        const el = e.target;
        if (el.getAttribute("data-rf") !== "date") return;
        const it = findItem();
        if (!it) return;
        const rec = store.histOf(it)[parseInt(el.getAttribute("data-ri") || "", 10)];
        if (!rec) return;
        const nd = el.value;
        if (!nd || nd === rec.date) return;
        let dup = null;
        for (const h of it.history || []) {
          if (h !== rec && h.date === nd) {
            dup = h;
            break;
          }
        }
        if (dup) {
          if (!confirm(util.fmtDateCN(nd) + " 已有一条记录（" + util.money(util.num(dup.price)) + "），用这条覆盖它？")) {
            render2();
            return;
          }
          it.history = it.history.filter((x) => x !== dup);
        }
        rec.date = nd;
        it.history.sort(util.byDate);
        store.save(true);
        render2();
        util.toast("日期已改为 " + util.fmtDateCN(nd));
      });
    }
    const add = document.getElementById("recAdd");
    if (add) {
      add.addEventListener("click", () => {
        const it = findItem();
        if (!it) return;
        const d = document.getElementById("recDate").value || util.todayISO();
        const priceIn = document.getElementById("recPrice");
        const noteIn = document.getElementById("recNote");
        const p = util.moneyInput(priceIn.value);
        const note = noteIn.value.trim();
        if (p === "") {
          util.toast("先填一个单价再添加");
          priceIn.focus();
          return;
        }
        let existed = null;
        for (const h of it.history || []) {
          if (h.date === d) {
            existed = h;
            break;
          }
        }
        if (existed && !confirm(util.fmtDateCN(d) + " 已有记录（" + util.money(util.num(existed.price)) + "），覆盖为 " + util.money(util.num(p)) + "？")) return;
        store.upsertHistory(it, d, p, note);
        store.save(true);
        priceIn.value = "";
        noteIn.value = "";
        render2();
        util.toast("已记录 " + util.fmtDateCN(d) + "：" + util.money(util.num(p)));
      });
    }
    const clr = document.getElementById("recClear");
    if (clr) {
      clr.addEventListener("click", () => {
        const it = findItem();
        if (!it) return;
        const len = (it.history || []).length;
        if (!len) {
          util.toast("本来就没有记录");
          return;
        }
        if (!confirm("清空「" + (it.name || "该硬件") + "」的全部 " + len + " 条价格记录？不可撤销。")) return;
        it.history = [];
        store.save(true);
        render2();
        util.toast("已清空该产品的价格记录");
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) close();
    });
  }
  function refreshDerived(it) {
    renderStats(it);
    renderChart(it);
    const h = store.histOf(it);
    for (let i = 1; i < h.length; i++) {
      const cell = document.querySelector('[data-rdelta="' + i + '"]');
      if (!cell) continue;
      const d = util.num(h[i].price) - util.num(h[i - 1].price);
      cell.className = "rec-delta " + (d === 0 ? "flat" : d > 0 ? "up" : "down");
      cell.textContent = d === 0 ? "0" : (d > 0 ? "+" : "−") + util.money(Math.abs(d));
    }
  }
  var modal = { open, close, bind, isOpen, currentItem: findItem };

  // src/views/terms.ts
  var quoteId2 = null;
  function current() {
    return quoteId2 ? store.get(quoteId2) : null;
  }
  function render3() {
    const q = current();
    if (!q) {
      close2();
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
      return '<tr><td class="term-label"><input data-ti="' + i + '" data-tf="label" value="' + util.esc(t.label) + '" placeholder="条款名"></td><td><input data-ti="' + i + '" data-tf="value" value="' + util.esc(t.value) + '" placeholder="条款内容"></td><td style="width:44px;text-align:right"><button class="mini-btn del" data-act="termdel" data-ti="' + i + '" title="删除这条条款">✕</button></td></tr>';
    }).join("");
    box.innerHTML = '<table class="rec-table"><thead><tr><th>条款名</th><th>条款内容</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>";
  }
  function open2(qId) {
    quoteId2 = qId || store.state.activeId;
    render3();
    const mask = document.getElementById("termsMask");
    if (mask) mask.hidden = false;
  }
  function close2() {
    const mask = document.getElementById("termsMask");
    if (mask) mask.hidden = true;
    quoteId2 = null;
    sidebar.render();
    getApp().renderMain();
  }
  function isOpen2() {
    const mask = document.getElementById("termsMask");
    return !!mask && !mask.hidden;
  }
  function bind2() {
    const mask = document.getElementById("termsMask");
    if (!mask) return;
    mask.addEventListener("click", (e) => {
      const t = e.target;
      if (t.hasAttribute && t.hasAttribute("data-close")) {
        close2();
        return;
      }
      if (t === mask) {
        close2();
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
        store.removeTerm(q.id, i);
        render3();
      } else if (act === "termadd") {
        store.addTerm(q.id, "", "");
        render3();
        const inputs = document.querySelectorAll('#termsTable input[data-tf="label"]');
        if (inputs.length) inputs[inputs.length - 1].focus();
      } else if (act === "termreset") {
        if (!confirm("恢复为默认条款？当前条款会被覆盖。")) return;
        store.resetTerms(q.id);
        render3();
        util.toast("已恢复默认条款");
      }
    });
    const box = document.getElementById("termsTable");
    if (box) {
      box.addEventListener("input", (e) => {
        const el = e.target;
        const ti = el.getAttribute("data-ti");
        const tf = el.getAttribute("data-tf");
        if (ti === null || !tf) return;
        const q = current();
        if (!q) return;
        const t = q.terms[parseInt(ti, 10)];
        if (!t) return;
        t[tf] = el.value;
        store.save(true);
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen2()) close2();
    });
  }
  var terms = { open: open2, close: close2, bind: bind2, isOpen: isOpen2 };

  // src/views/quoteDoc.ts
  function termsHTML(q) {
    const t = q.terms || [];
    if (!t.length) return "";
    const rows = [];
    for (let i = 0; i < t.length; i += 2) {
      const a = t[i] || {};
      const b = t[i + 1];
      if (b) {
        rows.push(
          "<tr><th>" + util.esc(a.label || "—") + "</th><td>" + util.esc(a.value || "—") + "</td><th>" + util.esc(b.label || "—") + "</th><td>" + util.esc(b.value || "—") + "</td></tr>"
        );
      } else {
        rows.push(
          "<tr><th>" + util.esc(a.label || "—") + '</th><td colspan="3">' + util.esc(a.value || "—") + "</td></tr>"
        );
      }
    }
    return '<table class="qd-notes">' + rows.join("") + "</table>";
  }
  function build(q) {
    if (!q) return "";
    const rows = q.items.map((it, i) => {
      const hasPrice = String(it.price).trim() !== "";
      const unit = util.num(it.price);
      return "<tr><td>" + (i + 1) + "</td><td>" + util.esc(it.name || "—") + "</td><td>" + util.esc(it.brand || "—") + "</td><td>" + util.esc(it.model || "—") + "</td><td>" + util.esc(it.spec || "") + '</td><td class="n">' + util.esc(it.qty) + "</td><td>" + util.esc(it.unit) + '</td><td class="n">' + (hasPrice ? util.money(unit) : '<span class="qd-blank">未报价</span>') + '</td><td class="n">' + util.money(unit * util.num(it.qty)) + "</td></tr>";
    }).join("");
    const total = store.totalOf(q, "total");
    const st = store.statsOf(q);
    return '<div class="qd-head"><h1>报 价 单</h1><div class="en">QUOTATION</div></div><div class="qd-meta"><span>报价单编号：' + util.esc(q.docNo) + "</span><span>项目名称：" + util.esc(q.name || "—") + "</span><span>报价日期：" + util.fmtDateCN(util.todayISO()) + "</span></div>" + (q.note ? '<div class="qd-meta" style="border:none;padding:0;margin:-4px 0 8px"><span>备注：' + util.esc(q.note) + "</span></div>" : "") + '<table class="qd-table"><thead><tr><th style="width:52px">序号</th><th>产品名称</th><th style="width:74px">品牌</th><th>型号</th><th>基本参数</th><th style="width:46px">数量</th><th style="width:42px">单位</th><th style="width:96px;text-align:right">单价</th><th style="width:104px;text-align:right">小计</th></tr></thead><tbody>' + rows + '</tbody></table><div class="qd-total">合计金额（含税）：' + util.money(total) + '<br><span class="upper">大写：人民币 ' + util.rmbUpper(total) + "</span></div>" + (q.terms && q.terms.length ? termsHTML(q) : "") + '<div class="qd-foot"><div class="qd-sign">报价方（盖章）<br><br><span class="qd-line" style="width:132px"></span><br>日期：<span class="qd-line" style="width:96px"></span></div><div class="qd-sign">客户确认（签字）<br><br><span class="qd-line" style="width:132px"></span><br>日期：<span class="qd-line" style="width:96px"></span></div></div><div style="text-align:center;font-size:10.5px;color:#999;margin-top:16px">共 ' + st.items + " 项硬件 / " + st.qty + " 件（套） · 本页由报价单管理系统生成</div>";
  }
  function generateAndPrint(qId) {
    const q = qId ? store.get(qId) : store.active();
    if (!q) {
      util.toast("没有可生成的报价单");
      return false;
    }
    if (!q.items.length) {
      util.toast("这张报价单还没有硬件，先点「编辑清单」录入");
      return false;
    }
    const st = store.statsOf(q);
    if (st.priced === 0) {
      util.toast("清单里都还没有单价，先填价格再生成");
      return false;
    }
    if (st.missing && !confirm("有 " + st.missing + " 项没填单价，报价单上会显示「未报价」且不计入合计。继续生成？")) return false;
    const doc = document.getElementById("quoteDoc");
    if (!doc) {
      util.toast("报价单容器缺失");
      return false;
    }
    doc.innerHTML = build(q);
    util.toast("正在打开打印预览 —— 在弹窗里选「另存为 PDF」即可生成报价单");
    const prevTitle = document.title;
    document.title = (q.name || "报价单") + "-" + util.todayISO();
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    setTimeout(() => {
      try {
        if (window.print) window.print();
      } catch {
      }
      setTimeout(restore, 800);
    }, 420);
    return true;
  }
  var quoteDoc = { build, generateAndPrint };

  // src/views/dashboard.ts
  function badge(t) {
    if (!t) return '<span class="badge flat">无记录</span>';
    if (t.h.length < 2) return '<span class="badge flat">已记 1 天</span>';
    return '<span class="badge ' + t.cls + '">' + (t.diff > 0 ? "↑" : t.diff < 0 ? "↓" : "—") + " " + Math.abs(t.pct).toFixed(1) + "%</span>";
  }
  function hwCard(it) {
    const t = store.trendOf(it);
    const sub = util.num(it.price) * util.num(it.qty);
    const range = t ? util.fmtDate(t.h[0].date) + " → " + util.fmtDate(t.h[t.h.length - 1].date) : "";
    return '<article class="hw-card" data-item="' + it.id + '" title="点击查看价格明细"><div class="hw-top"><span class="hw-name">' + util.esc(it.name || "未命名") + "</span>" + badge(t) + '</div><div class="hw-meta">' + util.esc([it.brand, it.model].filter(Boolean).join(" · ") || "—") + '</div><div class="hw-spark">' + (t ? charts.spark(t.h, { width: 240, height: 52 }) : '<div class="no-hist">暂无价格记录</div>') + "</div>" + (t ? '<div class="hw-range"><span>' + range + "</span><span>" + t.h.length + " 个记录日</span></div>" : "") + '<div class="hw-foot"><div class="price"><span class="k">单价</span><span class="v">' + (String(it.price).trim() === "" ? "—" : util.money(util.num(it.price))) + '</span></div><div class="unit">×' + util.esc(it.qty) + " " + util.esc(it.unit) + '</div><div class="sub"><span class="k">小计</span><span class="v">' + util.money(sub) + "</span></div></div></article>";
  }
  function sumQtyExtra(q) {
    let extra = 0;
    for (const it of q.items) {
      extra += util.num(it.price) * (util.num(it.qty) - 1);
    }
    return extra;
  }
  function kpisHTML(q, st, delta) {
    const modeUnit = store.state.trendMode === "unit";
    const hero = modeUnit ? st.total - sumQtyExtra(q) : st.total;
    const heroLabel = modeUnit ? "当前清单 · 单价之和" : "当前清单总价";
    const heroFoot = modeUnit ? "只把各项单价加起来，不乘数量" : "按清单里现已填写的单价 × 数量";
    let deltaHTML;
    if (delta) {
      const up = delta.diff > 0;
      deltaHTML = '<div class="v delta ' + (up ? "up" : "down") + '" style="font-size:19px">' + (up ? "+" : "−") + util.moneyShort(Math.abs(delta.diff)) + "（" + (up ? "+" : "−") + Math.abs(delta.pct).toFixed(2) + "%）</div>";
    } else {
      deltaHTML = '<div class="v" style="font-size:19px;color:var(--ink-3)">—</div>';
    }
    return '<div class="kpis"><div class="kpi hero"><div class="k">' + heroLabel + '</div><div class="v">' + util.money(hero) + '</div><div class="foot" style="color:rgba(255,255,255,.85)">' + heroFoot + '</div></div><div class="kpi"><div class="k">硬件项数</div><div class="v">' + st.items + '<small>项</small></div><div class="foot">共 ' + st.qty + " 件 / 套" + (st.missing ? " · " + st.missing + " 项未填价" : "") + '</div></div><div class="kpi"><div class="k">较首日变动</div>' + deltaHTML + '<div class="foot">' + (st.dates > 1 ? "对比 " + st.dates + " 个记录日" : "还需至少 2 个记录日") + '</div></div><div class="kpi"><div class="k">价格记录日</div><div class="v">' + st.dates + '<small>天</small></div><div class="foot">' + (st.lastDate ? "最新 " + util.fmtDateCN(st.lastDate) : "尚未记录") + "</div></div></div>";
  }
  function trendCardHTML(q) {
    const series = store.seriesOf(q, store.state.trendMode);
    const unit = store.state.trendMode === "unit";
    let body;
    if (!series.length) {
      body = '<div class="chart-empty">还没有价格记录 —— 点右上角「记录该日价格」给今天打个基线</div>';
    } else {
      body = charts.line(series, { width: 1e3, height: 262 });
      if (series.length === 1) {
        body += '<div class="note">当前只有 <b>1 个记录日</b>（' + util.fmtDateCN(series[0].date) + "），显示的是当日基线；换个日期再记一次就会连成曲线。</div>";
      }
      const vals = series.map((p) => p.price);
      const flatMulti = series.length >= 2 && Math.min.apply(null, vals) === Math.max.apply(null, vals);
      if (flatMulti) {
        body += '<div class="note">这几天价格<b>完全相同</b>（可能是刚复制出来的），所以走势是一条平线；之后改价并「记录该日价格」，就能看到波动了。</div>';
      }
      const last = series[series.length - 1];
      const cur = unit ? store.totalOf(q, "total") - sumQtyExtra(q) : store.totalOf(q, "total");
      if (Math.abs(last.price - cur) > 5e-3) {
        body += '<div class="note">走势最后一个点 <b>' + util.money(last.price) + "</b>（" + util.fmtDateCN(last.date) + "记录的价）与当前清单 <b>" + util.money(cur) + "</b> 不一致：有硬件的单价改过但还没记价，点右上角「记录该日价格」同步一次即可。</div>";
      }
    }
    return '<div class="card"><div class="card-head"><div><div class="card-title">总价走势</div><div class="card-sub">' + (unit ? "按日期汇总各硬件<b>当日最近记录的单价</b>，不加数量" : "按日期汇总各硬件<b>当日最近记录的单价</b> × 数量") + '</div></div><div class="seg" id="segTrend"><button data-mode="total" class="' + (unit ? "" : "on") + '">实际总价</button><button data-mode="unit" class="' + (unit ? "on" : "") + '">单价之和</button></div></div><div class="card-body">' + body + "</div></div>";
  }
  function copySrcHTML(q) {
    const dates = store.allDates(q);
    if (!dates.length) {
      return '<select class="sel-date" id="copySrc" disabled title="还没有价格记录日可复制"><option value="">暂无来源日</option></select>';
    }
    const target = document.getElementById("snapDate")?.value || util.todayISO();
    const prev = dates.filter((d) => d < target);
    const def = prev.length ? prev[prev.length - 1] : dates[dates.length - 1];
    const opts = dates.map((d) => '<option value="' + d + '"' + (d === def ? " selected" : "") + ">" + util.fmtDateCN(d) + "</option>").join("");
    return '<select class="sel-date" id="copySrc" title="选择要复制的来源价格日">' + opts + "</select>";
  }
  function html() {
    const q = store.active();
    if (!q) {
      return '<div class="empty"><b>还没有报价单</b><p>点左侧「＋ 新建」创建第一张</p></div>';
    }
    const st = store.statsOf(q);
    const delta = store.deltaOf(q);
    let body;
    if (!q.items.length) {
      body = '<div class="empty"><b>这张报价单还是空的</b><p>点「编辑清单」开始录入硬件，或用「复制」从别的报价单派生一份</p></div>';
    } else {
      body = '<div class="sec-head"><h3>硬件价格走势</h3><span class="n">共 ' + q.items.length + ' 项 · 点卡片看价格明细</span></div><div class="hw-grid">' + q.items.map(hwCard).join("") + "</div>";
    }
    return '<div class="q-head"><div class="q-head-l"><input class="q-title" id="qTitle" value="' + util.esc(q.name) + '" placeholder="给这张报价单起个名字" maxlength="60" title="点击可直接修改报价单名称"><input class="q-note" id="qNote" value="' + util.esc(q.note) + '" placeholder="备注（可选），例如：面向 XX 项目的两台节点" maxlength="120" title="点击可直接修改备注"><p class="q-doc-line">报价单编号 ' + util.esc(q.docNo) + " · 创建于 " + util.fmtDateCN(q.createdAt) + " · " + q.terms.length + ' 条报价条款</p></div><div class="q-actions" id="qActions"><input type="date" class="sel-date" id="snapDate" value="' + util.todayISO() + '"><button class="btn" data-act="snap" title="把所有已填单价的硬件，按左边选中的日期存一条价格记录">记录该日价格</button>' + copySrcHTML(q) + '<button class="btn" data-act="copy" title="把下拉框选中的价格日（如 9.16）的各项已记录价格，一键复制到左边选中的日期（如 9.17）">复制该日价格</button><button class="btn" data-act="terms" title="编辑这张报价单的条款">报价条款</button><button class="btn" data-act="dup" title="复制一份当前配置">复制</button><button class="btn primary" data-act="edit">编辑清单</button><button class="btn soft" data-act="quote">生成报价单</button><button class="btn danger" data-act="del">删除</button></div></div>' + kpisHTML(q, st, delta) + trendCardHTML(q) + body;
  }
  function bind3() {
    const q = store.active();
    if (!q) return;
    const nameEl = document.getElementById("qTitle");
    if (nameEl) {
      nameEl.addEventListener("input", () => {
        store.rename(q.id, nameEl.value);
        sidebar.render();
        document.title = (nameEl.value || "报价单管理") + " · AI 一体机价格监控";
      });
      nameEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          nameEl.blur();
        }
      });
    }
    const noteEl = document.getElementById("qNote");
    if (noteEl) {
      noteEl.addEventListener("input", () => store.setNote(q.id, noteEl.value));
    }
    const snapDate = document.getElementById("snapDate");
    if (snapDate) {
      snapDate.addEventListener("change", () => {
        const sel = document.getElementById("copySrc");
        if (!sel || sel.disabled) return;
        const prev = store.prevPriceDate(q.id, snapDate.value);
        if (prev) sel.value = prev;
      });
    }
    const seg = document.getElementById("segTrend");
    if (seg) {
      seg.addEventListener("click", (e) => {
        const b = e.target.closest ? e.target.closest("[data-mode]") : null;
        if (!b) return;
        store.setTrendMode(b.getAttribute("data-mode") || "total");
        getApp().renderMain();
        util.toast(
          store.state.trendMode === "unit" ? "已切换为「单价之和」—— 不乘数量" : "已切换为「实际总价」—— 单价 × 数量"
        );
      });
    }
    const acts = document.getElementById("qActions");
    if (acts) {
      acts.addEventListener("click", (e) => {
        const b = e.target.closest ? e.target.closest("[data-act]") : null;
        if (!b) return;
        const act = b.getAttribute("data-act");
        const app2 = getApp();
        if (act === "edit") {
          app2.setMode("editor");
        } else if (act === "terms") {
          terms.open(q.id);
        } else if (act === "quote") {
          quoteDoc.generateAndPrint(q.id);
        } else if (act === "dup") {
          const copy = store.duplicate(q.id);
          if (copy) {
            store.setActive(copy.id);
            app2.renderAll();
            util.toast("已复制为「" + copy.name + "」");
          }
        } else if (act === "del") {
          if (store.all().length <= 1) {
            util.toast("至少保留一张报价单");
            return;
          }
          if (!confirm("删除报价单「" + (q.name || "未命名") + "」？里面的硬件和价格记录都会一起删除，不可撤销。")) return;
          store.remove(q.id);
          app2.renderAll();
          util.toast("已删除报价单");
        } else if (act === "copy") {
          const d = document.getElementById("snapDate").value || util.todayISO();
          const sel = document.getElementById("copySrc");
          const src = sel && !sel.disabled && sel.value || store.prevPriceDate(q.id, d) || "";
          if (!src) {
            util.toast("还没有可复制的价格日 —— 先用「记录该日价格」建一个基线再复制");
            return;
          }
          if (src === d) {
            util.toast("来源与目标日期是同一天，无需复制");
            return;
          }
          const existed = store.countOnDate(q.id, d);
          if (existed && !confirm(util.fmtDateCN(d) + " 已有 " + existed + " 项记录，用 " + util.fmtDateCN(src) + " 的价格覆盖？")) return;
          const n = store.copyDate(q.id, d, src);
          app2.renderAll();
          util.toast("已把 " + util.fmtDateCN(src) + " 的 " + n + " 项价格复制到 " + util.fmtDateCN(d) + "（没记录过的项跳过）");
        } else if (act === "snap") {
          const d = document.getElementById("snapDate").value || util.todayISO();
          const st = store.statsOf(q);
          if (st.priced === 0) {
            util.toast("清单里还没有单价，先点「编辑清单」填价格");
            return;
          }
          const existed = store.countOnDate(q.id, d);
          if (existed && !confirm(util.fmtDateCN(d) + " 已有 " + existed + " 项记录，用当前清单里的单价覆盖？")) return;
          const n = store.snapshotAll(q.id, d);
          app2.renderAll();
          util.toast("已按 " + util.fmtDateCN(d) + " 记录 " + n + " 项价格");
        }
      });
    }
    const grid = document.querySelector(".hw-grid");
    if (grid) {
      grid.addEventListener("click", (e) => {
        const card = e.target.closest ? e.target.closest("[data-item]") : null;
        if (!card) return;
        modal.open(card.getAttribute("data-item") || "", q.id);
      });
    }
  }
  var dashboard = { html, bind: bind3 };

  // src/views/editor.ts
  var AUTOREC_KEY = "ai-quote-autorec";
  function copySrcHTML2(q) {
    const dates = store.allDates(q);
    if (!dates.length) {
      return '<select class="sel-date" id="copySrc" disabled title="还没有价格记录日可复制"><option value="">暂无来源日</option></select>';
    }
    const target = document.getElementById("snapDate2")?.value || util.todayISO();
    const prev = dates.filter((d) => d < target);
    const def = prev.length ? prev[prev.length - 1] : dates[dates.length - 1];
    const opts = dates.map((d) => '<option value="' + d + '"' + (d === def ? " selected" : "") + ">" + util.fmtDateCN(d) + "</option>").join("");
    return '<select class="sel-date" id="copySrc" title="选择要复制的来源价格日">' + opts + "</select>";
  }
  function autoRecordOn() {
    const el = document.getElementById("autoRec");
    return el ? el.checked : true;
  }
  function rowHTML(it, idx, len) {
    const sub = util.num(it.qty) * util.num(it.price);
    const t = store.trendOf(it);
    const cell = t ? charts.spark(t.h, { width: 104, height: 26, pad: 3 }) : '<span class="no-hist">暂无记录</span>';
    const badge2 = t && t.h.length >= 2 ? '<span class="badge ' + t.cls + '" style="font-size:10.5px;padding:1px 5px">' + (t.diff > 0 ? "↑" : t.diff < 0 ? "↓" : "—") + Math.abs(t.pct).toFixed(1) + "%</span>" : "";
    return '<tr data-id="' + it.id + '"><td class="c-idx">' + (idx + 1) + '</td><td><input class="cell" data-f="name" value="' + util.esc(it.name) + '" placeholder="产品名称"></td><td><input class="cell" data-f="brand" value="' + util.esc(it.brand) + '" placeholder="品牌"></td><td><input class="cell" data-f="model" value="' + util.esc(it.model) + '" placeholder="型号"></td><td><textarea class="cell" rows="1" data-f="spec" placeholder="基本参数 / 说明">' + util.esc(it.spec) + '</textarea></td><td><div class="qty-box"><input class="cell num q" data-f="qty" value="' + util.esc(it.qty) + '" placeholder="1"><input class="cell u" data-f="unit" value="' + util.esc(it.unit) + '" placeholder="个"></div></td><td><input class="cell money' + (String(it.price).trim() === "" ? " empty" : "") + '" data-f="price" value="' + util.esc(it.price) + '" placeholder="0.00" title="手动输入单价" inputmode="decimal"></td><td class="sub-cell' + (sub > 0 ? "" : " zero") + '" data-sub="' + it.id + '">' + (sub > 0 ? util.money(sub) : "—") + '</td><td><div class="nd" data-act="trend" data-id="' + it.id + '" title="点击查看价格明细" style="cursor:pointer">' + cell + badge2 + '</div></td><td><div class="nd"><input class="cell" data-f="link" value="' + util.esc(it.link) + '" placeholder="粘贴商品链接…"><button class="mini-btn" data-act="open" title="打开商品链接">↗</button></div></td><td><div class="act-box"><button class="mini-btn" data-act="up"' + (idx === 0 ? " disabled" : "") + ' title="上移">↑</button><button class="mini-btn" data-act="down"' + (idx === len - 1 ? " disabled" : "") + ' title="下移">↓</button><button class="mini-btn del" data-act="del" title="删除该硬件">✕</button></div></td></tr>';
  }
  function html2() {
    const q = store.active();
    if (!q) return '<div class="empty"><b>还没有报价单</b></div>';
    return '<div class="q-head"><div class="q-head-l"><input class="q-title" id="eqTitle" value="' + util.esc(q.name) + '" placeholder="报价单名称" maxlength="60"><p class="q-doc-line">编辑清单 · 直接点单元格修改 · 单价留空按 0 计算 · 改完单价离开输入框会自动为当天留一条价格记录</p></div><div class="q-actions"><button class="btn primary" data-act="add">＋ 添加硬件</button><input type="date" class="sel-date" id="snapDate2" value="' + util.todayISO() + '"><button class="btn" data-act="snap">记录该日价格</button>' + copySrcHTML2(q) + '<button class="btn" data-act="copy" title="把下拉框选中的价格日（如 9.16）的各项已记录价格，一键复制到左边选中的日期（如 9.17）">复制该日价格</button><label class="switch" title="改完单价离开输入框时，自动为当天留下一条价格记录"><input type="checkbox" id="autoRec" checked> 自动记价</label><button class="btn" data-act="done">完成，返回看板</button></div></div><div class="card"><div class="table-wrap"><table class="sheet"><thead><tr><th class="c-idx" style="text-align:center">序号</th><th class="c-name">产品名称</th><th class="c-brand">品牌</th><th class="c-model">型号</th><th class="c-spec">基本参数 / 说明</th><th class="c-qty" style="text-align:center">数量 / 单位</th><th class="c-price" style="text-align:right">单价 ¥</th><th class="c-sub" style="text-align:right">小计 ¥</th><th class="c-trend">价格走势</th><th class="c-link">商品链接</th><th class="c-act">操作</th></tr></thead><tbody id="sheetBody"></tbody><tfoot class="sum"><tr><td colspan="5" style="text-align:right;color:var(--ink-2);font-weight:500">合计</td><td style="text-align:center" id="fQty">0</td><td style="text-align:right;font-size:12px;color:var(--ink-3);font-weight:500" id="fPriced"></td><td class="t" id="fTotal">¥0.00</td><td colspan="3"></td></tr></tfoot></table></div></div>';
  }
  function renderSheet() {
    const q = store.active();
    if (!q) return;
    const body = document.getElementById("sheetBody");
    if (!body) return;
    if (!q.items.length) {
      body.innerHTML = '<tr><td colspan="11"><div class="empty"><b>清单是空的</b><p>点上方「＋ 添加硬件」开始录入</p></div></td></tr>';
    } else {
      body.innerHTML = q.items.map((it, i) => rowHTML(it, i, q.items.length)).join("");
    }
    autoGrowAll();
    renderFoot();
  }
  function autoGrowAll() {
    const list = document.querySelectorAll("textarea.cell");
    list.forEach((el) => {
      el.style.height = "auto";
      el.style.height = Math.max(31, el.scrollHeight) + "px";
    });
  }
  function renderFoot() {
    const q = store.active();
    if (!q) return;
    const st = store.statsOf(q);
    const a = document.getElementById("fQty");
    const b = document.getElementById("fPriced");
    const c = document.getElementById("fTotal");
    if (a) a.textContent = String(st.qty);
    if (b) b.textContent = st.priced + " 项已报价" + (st.missing ? " · " + st.missing + " 项未填" : "");
    if (c) c.textContent = util.money(st.total);
  }
  function findItem2(itemId2) {
    const q = store.active();
    if (!q) return null;
    return q.items.find((it) => it.id === itemId2) || null;
  }
  function rowOf(el) {
    return el.closest ? el.closest("tr") : null;
  }
  function bind4() {
    const q = store.active();
    if (!q) return;
    const chk = document.getElementById("autoRec");
    if (chk) {
      let v = "1";
      try {
        v = localStorage.getItem(AUTOREC_KEY) || "1";
      } catch {
      }
      chk.checked = v !== "0";
      chk.addEventListener("change", () => {
        try {
          localStorage.setItem(AUTOREC_KEY, chk.checked ? "1" : "0");
        } catch {
        }
        util.toast(chk.checked ? "已开启：改完单价自动记当天" : "已关闭自动记价");
      });
    }
    const titleEl = document.getElementById("eqTitle");
    if (titleEl) {
      titleEl.addEventListener("input", () => {
        store.rename(q.id, titleEl.value);
        sidebar.render();
      });
    }
    const snapDate2 = document.getElementById("snapDate2");
    if (snapDate2) {
      snapDate2.addEventListener("change", () => {
        const sel = document.getElementById("copySrc");
        if (!sel || sel.disabled) return;
        const prev = store.prevPriceDate(q.id, snapDate2.value);
        if (prev) sel.value = prev;
      });
    }
    const head = document.querySelector(".q-actions");
    if (head) {
      head.addEventListener("click", (e) => {
        const b = e.target.closest ? e.target.closest("[data-act]") : null;
        if (!b) return;
        const act = b.getAttribute("data-act");
        if (act === "add") {
          store.addItem(q.id, { name: "新硬件", qty: "1", unit: "个" });
          renderSheet();
          const rows = document.querySelectorAll("#sheetBody tr");
          const last = rows[rows.length - 1];
          if (last) {
            const inp = last.querySelector('input[data-f="name"]');
            if (inp) {
              inp.focus();
              inp.select();
            }
            if (last.scrollIntoView) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
          util.toast("已添加，直接输入名称");
        } else if (act === "done") {
          getApp().setMode("dashboard");
        } else if (act === "copy") {
          const d = document.getElementById("snapDate2").value || util.todayISO();
          const sel = document.getElementById("copySrc");
          const src = sel && !sel.disabled && sel.value || store.prevPriceDate(q.id, d) || "";
          if (!src) {
            util.toast("还没有可复制的价格日 —— 先用「记录该日价格」建一个基线再复制");
            return;
          }
          if (src === d) {
            util.toast("来源与目标日期是同一天，无需复制");
            return;
          }
          const existed = store.countOnDate(q.id, d);
          if (existed && !confirm(util.fmtDateCN(d) + " 已有 " + existed + " 项记录，用 " + util.fmtDateCN(src) + " 的价格覆盖？")) return;
          const n = store.copyDate(q.id, d, src);
          renderSheet();
          util.toast("已把 " + util.fmtDateCN(src) + " 的 " + n + " 项价格复制到 " + util.fmtDateCN(d) + "（没记录过的项跳过）");
        } else if (act === "snap") {
          const d = document.getElementById("snapDate2").value || util.todayISO();
          const st = store.statsOf(q);
          if (st.priced === 0) {
            util.toast("清单里还没有任何单价");
            return;
          }
          const existed = store.countOnDate(q.id, d);
          if (existed && !confirm(util.fmtDateCN(d) + " 已有 " + existed + " 项记录，用当前清单里的单价覆盖？")) return;
          const n = store.snapshotAll(q.id, d);
          renderSheet();
          util.toast("已按 " + util.fmtDateCN(d) + " 记录 " + n + " 项");
        }
      });
    }
    const body = document.getElementById("sheetBody");
    if (!body) return;
    body.addEventListener("input", (e) => {
      const el = e.target;
      const f = el.getAttribute("data-f");
      if (!f) return;
      const tr = rowOf(el);
      if (!tr) return;
      const it = findItem2(tr.getAttribute("data-id") || "");
      if (!it) return;
      if (f === "qty") {
        const dv = util.digitsOnly(el.value);
        if (dv !== el.value) el.value = dv;
        it.qty = dv;
      } else if (f === "price") {
        const mv = util.moneyInput(el.value);
        if (mv !== el.value) el.value = mv;
        it.price = mv;
        el.classList.toggle("empty", mv.trim() === "");
      } else if (f === "spec") {
        it.spec = el.value;
        el.style.height = "auto";
        el.style.height = Math.max(31, el.scrollHeight) + "px";
      } else if (f in it) {
        it[f] = el.value;
      }
      updateRow(it);
      store.save(true);
    });
    body.addEventListener("change", (e) => {
      const el = e.target;
      if (el.getAttribute("data-f") !== "price") return;
      if (!autoRecordOn()) return;
      const tr = rowOf(el);
      if (!tr) return;
      const it = findItem2(tr.getAttribute("data-id") || "");
      if (!it) return;
      if (String(it.price).trim() === "") return;
      const d = util.todayISO();
      const h = it.history || [];
      const lastDate = h.length ? h[h.length - 1].date : null;
      if (lastDate === d && util.num(h[h.length - 1].price) === util.num(it.price)) return;
      store.upsertHistory(it, d, it.price, "");
      store.save(true);
      renderSheet();
      util.toast("已记录 " + util.fmtDateCN(d) + " 价格：" + util.money(util.num(it.price)));
    });
    body.addEventListener("click", (e) => {
      const b = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!b) return;
      const act = b.getAttribute("data-act");
      const tr = b.closest("tr");
      const id = tr ? tr.getAttribute("data-id") : b.getAttribute("data-id");
      if (!id) return;
      const it = findItem2(id);
      if (!it) return;
      if (act === "del") {
        if (!confirm("从清单中删除「" + (it.name || "该项") + "」？")) return;
        store.removeItem(q.id, id);
        renderSheet();
        util.toast("已删除");
      } else if (act === "up") {
        store.moveItem(q.id, id, -1);
        renderSheet();
      } else if (act === "down") {
        store.moveItem(q.id, id, 1);
        renderSheet();
      } else if (act === "open") {
        const url = util.normalizeLink(it.link);
        if (!url) {
          const inp2 = tr ? tr.querySelector('input[data-f="link"]') : null;
          if (inp2) inp2.focus();
          util.toast("先填入商品链接再打开");
          return;
        }
        if (url !== it.link) {
          it.link = url;
          store.save(true);
          if (tr) {
            const li = tr.querySelector('input[data-f="link"]');
            if (li) li.value = url;
          }
        }
        window.open(url, "_blank", "noopener");
      } else if (act === "trend") {
        modal.open(id, q.id);
      }
    });
  }
  function updateRow(it) {
    const cell = document.querySelector('[data-sub="' + it.id + '"]');
    if (cell) {
      const s = util.num(it.qty) * util.num(it.price);
      cell.textContent = s > 0 ? util.money(s) : "—";
      cell.className = "sub-cell" + (s > 0 ? "" : " zero");
    }
    renderFoot();
  }
  var editor = { html: html2, bind: bind4, renderSheet };

  // src/app.ts
  var MODE_KEY = "ai-quote-mode";
  var STORE_KEY = "ai-quote-v1";
  var mode = "dashboard";
  function loadMode() {
    try {
      const v = localStorage.getItem(MODE_KEY);
      if (v === "editor" || v === "dashboard") mode = v;
    } catch {
    }
  }
  function saveMode() {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
    }
  }
  function setMode(m) {
    mode = m === "editor" ? "editor" : "dashboard";
    saveMode();
    renderMain();
    const main = document.querySelector(".main");
    if (main) main.scrollTop = 0;
  }
  function currentMode() {
    return mode;
  }
  function renderMain() {
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
  function renderAll() {
    sidebar.render();
    renderMain();
  }
  function syncTitle() {
    const q = store.active();
    const name = q && q.name ? q.name : "报价单管理";
    document.title = name + " · AI 一体机价格监控";
  }
  function normalizeItem(d) {
    const dd = d || {};
    let hist = [];
    if (Array.isArray(dd.history)) {
      hist = dd.history.filter((h) => h && h.date).map((h) => ({
        date: String(h.date).slice(0, 10),
        price: util.hasVal(h.price) ? String(h.price) : "",
        note: h.note || ""
      })).sort(util.byDate);
    }
    return {
      id: dd.id || util.uid("i"),
      name: dd.name || "",
      brand: dd.brand || "",
      model: dd.model || "",
      spec: dd.spec || "",
      qty: util.hasVal(dd.qty) ? String(dd.qty) : "1",
      unit: dd.unit || "个",
      price: util.hasVal(dd.price) ? String(dd.price) : "",
      link: dd.link || "",
      history: hist
    };
  }
  function exportJSON() {
    const data = {
      app: "AI 一体机 · 报价单管理",
      version: 2,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      quotations: store.all()
    };
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "报价单数据-" + util.todayISO().replace(/-/g, "") + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        try {
          URL.revokeObjectURL(url);
        } catch {
        }
      }, 0);
      util.toast("已导出 " + store.all().length + " 张报价单");
    } catch (e) {
      util.toast("导出失败：" + (e && e.message ? e.message : "浏览器不支持"));
    }
  }
  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed = null;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        util.toast("不是有效的 JSON 文件");
        return;
      }
      applyImport(parsed);
    };
    reader.onerror = () => util.toast("读取文件失败");
    try {
      reader.readAsText(file, "utf-8");
    } catch {
      util.toast("无法读取该文件");
    }
  }
  function applyImport(parsed) {
    let qs = null;
    if (parsed && Array.isArray(parsed.quotations)) {
      qs = parsed.quotations;
    } else if (Array.isArray(parsed)) {
      qs = [{ name: "导入的报价单", note: "由旧版 JSON 导入", items: parsed }];
    } else if (parsed && Array.isArray(parsed.items)) {
      qs = [{
        name: parsed.name || "导入的报价单",
        note: "由 JSON 导入",
        items: parsed.items
      }];
    }
    if (!qs || !qs.length) {
      util.toast("文件里没有可导入的报价单");
      return;
    }
    if (!confirm("导入会覆盖本机当前的 " + store.all().length + " 张报价单，换成文件里的 " + qs.length + " 张。确定继续？（建议先「导出 JSON」备份一次）")) return;
    const norm = qs.map((q, i) => {
      const qq = q || {};
      return {
        id: qq.id || util.uid("q"),
        name: qq.name || "报价单 " + (i + 1),
        note: qq.note || "",
        docNo: qq.docNo || "Q-" + util.todayISO().replace(/-/g, "") + "-" + util.pad2(i + 1),
        createdAt: qq.createdAt || util.todayISO(),
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
          savedAt: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
    } catch {
      util.toast("写入本机存储失败，导入中止");
      return;
    }
    store.load();
    renderAll();
    util.toast("已导入 " + norm.length + " 张报价单");
  }
  function bindAppbar() {
    const nb = document.getElementById("btnNewQuote");
    if (nb) {
      nb.addEventListener("click", () => {
        if (store.all().length >= 40 && !confirm("已经有 " + store.all().length + " 张报价单了，确定还要新建？")) return;
        const q = store.create();
        store.setActive(q.id);
        store.save(true);
        if (mode !== "editor") {
          setMode("editor");
        } else {
          renderAll();
        }
        util.toast("已新建「" + q.name + "」—— 名称可以直接在标题处改");
      });
    }
    const ex = document.getElementById("btnExport");
    if (ex) ex.addEventListener("click", exportJSON);
    const im = document.getElementById("btnImport");
    const fi = document.getElementById("fileImport");
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
  function bindSidebarList() {
    const box = document.getElementById("qList");
    if (!box) return;
    box.addEventListener("click", (e) => {
      const item = e.target.closest ? e.target.closest("[data-q]") : null;
      if (!item) return;
      const id = item.getAttribute("data-q");
      if (!id || id === store.state.activeId) return;
      store.setActive(id);
      store.save(true);
      renderAll();
    });
  }
  function boot() {
    loadMode();
    store.load();
    if (!store.all().length) {
      store.create();
      store.setActive(store.all()[0].id);
    }
    sidebar.render();
    renderMain();
    bindAppbar();
    bindSidebarList();
    modal.bind();
    terms.bind();
  }
  var view = { dashboard, editor, sidebar, modal, terms, quoteDoc };
  var app = {
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

  // src/main.ts
  function showBootError(msg) {
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
    window.HW = { app, store, util, charts, view };
  } catch (e) {
    showBootError(e instanceof Error ? e.message : String(e));
    console.error(e);
  }
})();
