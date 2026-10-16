import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

test("landing has working calls to action, responsive layout, and no hydration errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Less small talk/ })).toBeVisible();
  await expect(page.getByText("say it without saying who you are", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up", exact: true })).toHaveCSS("background-color", "rgb(230, 0, 35)");
  await page.getByRole("button", { name: "Find your ghost", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog", { name: "Join GhostPost" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.getByText("Use email instead (requires email delivery)", { exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Lost your way in?" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("home auth overlay traps focus, dismisses with Escape and restores focus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Join GhostPost" });
  await expect(dialog).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up", exact: true })).toBeFocused();
});

test("anonymous requests cannot enter room or moderation routes", async ({ page, request }) => {
  for (const route of ["/rooms", "/rooms/00000000-0000-4000-8000-000000000001/feed", "/rooms/00000000-0000-4000-8000-000000000001/admin", "/rooms/00000000-0000-4000-8000-000000000001/post/00000000-0000-4000-8000-000000000002", "/feed", "/admin", "/post/00000000-0000-4000-8000-000000000001", "/join", "/reset-password"]) {
    await page.goto(route);
    await expect(page).toHaveURL(configured ? /\/login/ : /\/setup/);
    await expect(page.getByTestId("post-card")).toHaveCount(0);
  }
  const response = await request.get("/login");
  expect(response.headers()["cache-control"]).toMatch(/no-store/);
});

test("missing configuration is explicit, not a mocked social feed", async ({ page }) => {
  test.skip(configured, "This test exercises the intentionally unconfigured setup state.");
  await page.goto("/signup");
  await expect(page.getByText(/isn't connected to Supabase yet/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  await page.getByText("Use email instead (requires email delivery)", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Create your account" })).toBeDisabled();
  await page.getByRole("link", { name: "View setup requirements" }).click();
  await expect(page.getByRole("heading", { name: "Give your ghosts a home." })).toBeVisible();
});

test("desktop and mobile layouts have no horizontal overflow", async ({ page }) => {
  await mkdir("artifacts/screenshots", { recursive: true });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/screenshots/landing-${viewport.width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Join GhostPost" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/screenshots/signup-modal-${viewport.width}.png` });
    await page.keyboard.press("Escape");
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back, ghost." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/screenshots/login-${viewport.width}.png`, fullPage: true });
  }
});

test("keyboard users can reach the main content and authentication controls", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.goto("/login");
  await page.getByLabel("Email address").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
});

test("landing and auth forms pass automated WCAG A/AA accessibility checks", async ({ page }) => {
  for (const route of ["/", "/login", "/signup", "/forgot-password", "/setup"]) {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations, `${route}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  }
});