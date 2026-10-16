import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 20000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4317",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "npm run start -- --port 4317",
    url: "http://localhost:4317",
    // Never silently test another workspace app that happens to use this port.
    reuseExistingServer: false,
    timeout: 60000,
  },
});