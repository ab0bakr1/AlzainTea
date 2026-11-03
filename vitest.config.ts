import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "e2e/**", "tests/**", ".next/**"],
    testTimeout: 30000, // انظر المشكلة 3
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});