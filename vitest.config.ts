import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/platform/**/*.test.tsx"],
    restoreMocks: true,
  },
});
