import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Make .env (incl. non VITE_ vars) available to integration tests.
  Object.assign(process.env, loadEnv(mode || "test", process.cwd(), ""));
  return {
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
      testTimeout: 20000,
    },
  };
});
