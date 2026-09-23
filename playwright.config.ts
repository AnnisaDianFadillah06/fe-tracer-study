import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.e2e" });

/**
 * Suite ini berjalan langsung ke production (https://smart-tracer.id) --
 * tidak ada environment staging. Lihat e2e/README.md untuk kebijakan
 * keamanan data (akun uji khusus, prefix TEST_, tag @destructive).
 */
export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://smart-tracer.id",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "setup",
      testDir: "./e2e/setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
    },
    {
      name: "msedge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
      dependencies: ["setup"],
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
      dependencies: ["setup"],
    },
  ],
});
