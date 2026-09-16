/* =========================================================
   vitest.config.ts — 测试配置（node 环境 + 自定义 jsdom 全局注入）
   ========================================================= */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000
  }
});