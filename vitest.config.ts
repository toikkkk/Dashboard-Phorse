import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Database di memori dibuat per berkas uji; hash scrypt cukup berat, jadi berkas dijalankan paralel secukupnya.
    fileParallelism: true,
  },
});
