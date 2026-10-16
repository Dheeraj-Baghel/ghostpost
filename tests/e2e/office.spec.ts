import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

// Historical single-office UI regression, retained for the old release only.
// The current room browser suite is npm run test:rooms; it is explicitly LOCAL.
const enabled = process.env.GHOSTPOST_LEGACY_E2E === "1" && process.env.GHOSTPOST_E2E === "1" && !!process.env.GHOSTPOST_E2E_EMAIL && !!process.env.GHOSTPOST_E2E_PASSWORD;
test.skip(!enabled, "Historical office suite; requires explicit GHOSTPOST_LEGACY_E2E=1 and disposable credentials. Not a current room/cloud verification.");

async function login(page: Page, admin = false) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill((admin ? process.env.GHOSTPOST_E2E_ADMIN_EMAIL : process.env.GHOSTPOST_E2E_EMAIL)!);
  await page.getByLabel("Password", { exact: true }).fill((admin ? process.env.GHOSTPOST_E2E_ADMIN_PASSWORD : process.env.GHOSTPOST_E2E_PASSWORD)!);
  await page.getByRole("button", { name: "Step inside" }).click();
  await expect(page).toHaveURL(/\/feed/);
}

test("real member can publish, edit, react, reply, report, and delete", async ({ page }) => {
  await login(page);
  const text = `[SMOKE TEST ${Date.now()}] This temporary post will be deleted.`;
  await page.getByRole("button", { name: "Create post", exact: true }).first().click();
  await page.getByLabel("Your thought", { exact: true }).fill(text);
  await page.getByLabel("Category", { exact: true }).selectOption("Funny");
  await page.getByRole("button", { name: "Post anonymously" }).click();
  await expect(page).toHaveURL(/\/post\//);
  const postUrl = page.url();
  try {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await page.reload(); // Persistence is not just optimistic local state.
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // Record actual animation events so a short-lived pop doesn't make the
    // assertion race network timing. No account data or tokens are recorded.
    await page.evaluate(() => {
      document.documentElement.dataset.reactionPops = "0";
      document.addEventListener("animationstart", event => {
        if (event.animationName !== "reaction-pop") return;
        document.documentElement.dataset.reactionPops = String(Number(document.documentElement.dataset.reactionPops || 0) + 1);
        document.documentElement.dataset.lastReactionEmoji = event.target instanceof HTMLElement ? event.target.textContent || "" : "";
      });
    });
    for (const [label, emoji] of [["Like", "👍"], ["Laugh", "😄"], ["Fire", "🔥"], ["Shocked", "😲"]]) {
      const button = page.getByRole("button", { name: `${label}: 0`, exact: true });
      await expect(button.locator(".reaction-emoji")).toHaveText(emoji);
      const bounds = await button.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Like: 0", exact: true }).click();
    await expect(page.getByRole("button", { name: "Like: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.lastReactionEmoji)).toBe("👍");
    await expect(page.getByTestId("reaction-pop")).toHaveCount(0); // timer cleans up
    await page.getByRole("button", { name: "Laugh: 0", exact: true }).click();
    await expect(page.getByRole("button", { name: "Like: 0", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Laugh: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.lastReactionEmoji)).toBe("😄");
    await expect(page.getByTestId("reaction-pop")).toHaveCount(0);
    const popCount = await page.evaluate(() => document.documentElement.dataset.reactionPops);
    await page.getByRole("button", { name: "Laugh: 1", exact: true }).click();
    await expect(page.getByRole("button", { name: "Laugh: 0", exact: true })).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => document.documentElement.dataset.reactionPops)).toBe(popCount); // no pop on removal
    await page.getByRole("button", { name: "Fire: 0", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Fire: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.lastReactionEmoji)).toBe("🔥");
    await expect(page.getByTestId("reaction-pop")).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const beforeReduced = await page.evaluate(() => document.documentElement.dataset.reactionPops);
    await page.getByRole("button", { name: "Shocked: 0", exact: true }).click();
    await expect(page.getByRole("button", { name: "Shocked: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("reaction-pop")).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset.reactionPops)).toBe(beforeReduced);
    await page.reload();
    await expect(page.getByRole("button", { name: "Shocked: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await mkdir("artifacts/screenshots", { recursive: true });
    await page.getByTestId("post-card").screenshot({ path: "artifacts/screenshots/emoji-reactions.png" });
    // Fail one request locally before it reaches the server: no false success
    // animation and the stored selection must remain unchanged.
    await page.route("**/post/**", async route => {
      if (route.request().method() === "POST" && route.request().headers()["next-action"]) await route.abort("failed");
      else await route.continue();
    });
    await page.getByRole("button", { name: "Like: 0", exact: true }).click();
    await expect(page.getByText("Reaction didn't save. Please try again.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shocked: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("reaction-pop")).toHaveCount(0);
    await page.unroute("**/post/**");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("#reply").fill("[SMOKE TEST] A persistent reply.");
    await page.getByRole("button", { name: "Post reply", exact: true }).click();
    await expect(page.getByText("[SMOKE TEST] A persistent reply.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit comment", exact: true }).click();
    await page.getByRole("textbox", { name: "Comment text" }).fill("[SMOKE TEST] Edited reply.");
    await page.getByRole("button", { name: "Save comment", exact: true }).click();
    await expect(page.getByText("[SMOKE TEST] Edited reply.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delete comment", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("[SMOKE TEST] Edited reply.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delete comment", exact: true }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByText("[SMOKE TEST] Edited reply.", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /Post options for/ }).click();
    await page.getByRole("menuitem", { name: "Edit post", exact: true }).click();
    await page.getByLabel("Your thought", { exact: true }).fill(text + " Edited.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(text + " Edited.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Post options for/ }).click();
    await page.getByRole("menuitem", { name: "Report post", exact: true }).click();
    await page.getByRole("radio", { name: "Other", exact: true }).check();
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByText("Report sent privately to your administrator.", { exact: true })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/feed\?notice=admin-only/);
  } finally {
    await page.goto(postUrl);
    await page.getByRole("button", { name: /Post options for/ }).click();
    await page.getByRole("menuitem", { name: "Delete post", exact: true }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/feed/);
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(postUrl);
  await expect(page).toHaveURL(/\/login/);
});

test("poll votes persist and the question freezes after voting", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Create post", exact: true }).first().click();
  await page.getByRole("button", { name: "Poll", exact: true }).last().click();
  await page.getByLabel("Your question", { exact: true }).fill(`[SMOKE TEST ${Date.now()}] Chai or coffee?`);
  await page.getByRole("textbox", { name: "Option 1", exact: true }).fill("Chai");
  await page.getByRole("textbox", { name: "Option 2", exact: true }).fill("Coffee");
  await page.getByRole("button", { name: "Post anonymously" }).click();
  await expect(page).toHaveURL(/\/post\//);
  try {
    await page.getByRole("radio", { name: "Chai", exact: true }).check();
    await page.getByRole("button", { name: "Cast vote" }).click();
    await expect(page.getByText("1 vote · Your vote is in", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("1 vote · Your vote is in", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Post options for/ }).click();
    await page.getByRole("menuitem", { name: "Edit post", exact: true }).click();
    await expect(page.getByLabel("Your question", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Close dialog" }).click();
  } finally {
    await page.getByRole("button", { name: /Post options for/ }).click();
    await page.getByRole("menuitem", { name: "Delete post", exact: true }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
  }
});

test("only a real administrator can open the report queue", async ({ page }) => {
  test.skip(!process.env.GHOSTPOST_E2E_ADMIN_EMAIL || !process.env.GHOSTPOST_E2E_ADMIN_PASSWORD, "Dedicated administrator credentials not configured.");
  await login(page, true);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Keep the good ghost energy." })).toBeVisible();
  await expect(page.getByText("Administrator space", { exact: true })).toBeVisible();
});

test("new member must redeem an invitation before seeing the feed", async ({ page }) => {
  test.skip(!process.env.GHOSTPOST_E2E_NEW_EMAIL || !process.env.GHOSTPOST_E2E_INVITE, "New-member fixture not configured.");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env.GHOSTPOST_E2E_NEW_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.GHOSTPOST_E2E_NEW_PASSWORD!);
  await page.getByRole("button", { name: "Step inside" }).click();
  await expect(page).toHaveURL(/\/join/);
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/join/);
  await page.getByLabel("Office invitation code").fill("incorrect-ghost-invite");
  await page.getByRole("button", { name: "Join the office", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "This invitation is invalid or expired." })).toBeVisible();
  await page.getByLabel("Office invitation code").fill(process.env.GHOSTPOST_E2E_INVITE!);
  await page.getByRole("button", { name: "Join the office", exact: true }).click();
  await expect(page).toHaveURL(/\/feed/);
  await expect(page.getByRole("heading", { name: /The breakroom/ })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/feed/);
});

test("real recovery token updates the password and requires a fresh sign-in", async ({ page }) => {
  test.skip(!process.env.GHOSTPOST_E2E_RECOVERY_HASH, "Recovery token fixture not configured; no email delivery is simulated.");
  const query = new URLSearchParams({ token_hash: process.env.GHOSTPOST_E2E_RECOVERY_HASH!, type: "recovery" });
  await page.goto(`/auth/confirm?${query}`);
  await expect(page).toHaveURL(/\/reset-password/);
  const password = `New-ghost-password-${Date.now()}!`;
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/login\?notice=password-updated/);
  await page.getByLabel("Email address").fill(process.env.GHOSTPOST_E2E_RECOVERY_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Step inside" }).click();
  await expect(page).toHaveURL(/\/feed/);
});

test("real feed is responsive, accessible and filters persistent posts", async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  await mkdir("artifacts/screenshots", { recursive: true });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/feed");
    await expect(page.getByTestId("post-card").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    // Screenshots show only temporary test posts. Hide real content ONLY for
    // capture; all assertions/accessibility tests run against the actual feed.
    await page.getByTestId("post-card").filter({ hasNotText: "[LIVE TEST]" }).evaluateAll(nodes => nodes.forEach(node => node.setAttribute("data-private-capture", "true")));
    const captureStyle = '[data-private-capture="true"] { display: none !important; }';
    await page.screenshot({ path: `artifacts/screenshots/feed-${viewport.width}.png`, fullPage: true, style: captureStyle });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    if (viewport.width >= 768) {
      await expect(page.getByRole("button", { name: "Open office navigation" })).toBeHidden();
    } else {
      await page.getByRole("button", { name: "Open office navigation" }).click();
      await expect(page.getByRole("dialog", { name: "Your office" })).toBeVisible();
      await page.getByRole("navigation", { name: "Mobile office navigation" }).getByRole("link", { name: "Conversations" }).click();
      await expect(page.getByRole("dialog", { name: "Your office" })).not.toBeVisible();
    }
    await page.getByRole("button", { name: "Create post", exact: true }).click();
    await page.getByRole("button", { name: "Poll", exact: true }).click();
    await page.getByRole("button", { name: "Add option" }).click();
    await expect(page.getByRole("textbox", { name: "Option 3", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove option 3" }).click();
    const modalAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(modalAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    await page.screenshot({ path: `artifacts/screenshots/composer-${viewport.width}.png`, style: captureStyle });
    await page.getByRole("button", { name: "Post anonymously" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Post anonymously" })).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
  }
  await page.getByRole("navigation", { name: "Feed order" }).getByRole("link", { name: "Trending" }).click();
  await expect(page).toHaveURL(/sort=trending/);
  await page.getByRole("navigation", { name: "Category filters" }).getByRole("link", { name: "Question" }).click();
  await expect(page).toHaveURL(/category=Question/);
  await expect(page.getByText("[LIVE TEST] Which afternoon break sounds better?", { exact: true })).toBeVisible();
});

test("administrator can dismiss a report and remove a reported post", async ({ page, browser }) => {
  test.setTimeout(180000);
  test.skip(!process.env.GHOSTPOST_E2E_ADMIN_EMAIL, "Administrator fixture not configured.");
  await login(page);
  const texts = [`[MODERATION TEST ${Date.now()}] Dismiss this report.`, `[MODERATION TEST ${Date.now()}] Remove this post.`];
  const urls: string[] = [];
  for (const text of texts) {
    await page.goto("/feed");
    await page.getByRole("button", { name: "Create post", exact: true }).first().click();
    await page.getByLabel("Your thought", { exact: true }).fill(text);
    await page.getByRole("button", { name: "Post anonymously" }).click();
    await expect(page).toHaveURL(/\/post\//);
    urls.push(page.url());
    await page.getByRole("button", { name: /Post options for/ }).click();
    await page.getByRole("menuitem", { name: "Report post", exact: true }).click();
    await page.getByRole("radio", { name: "Other", exact: true }).check();
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByText("Report sent privately to your administrator.", { exact: true })).toBeVisible();
  }
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const admin = await context.newPage();
  try {
    await login(admin, true);
    await admin.goto("/admin");
    await expect(admin.getByText(texts[0], { exact: true })).toBeVisible();
    await expect(admin.getByText(texts[1], { exact: true })).toBeVisible();
    await admin.evaluate(() => document.fonts.ready);
    await mkdir("artifacts/screenshots", { recursive: true });
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.locator("article").filter({ hasNotText: "[MODERATION TEST" }).evaluateAll(nodes => nodes.forEach(node => node.setAttribute("data-private-capture", "true")));
    await admin.screenshot({ path: "artifacts/screenshots/moderation-1440.png", fullPage: true, style: '[data-private-capture="true"] { display: none !important; }' });
    const result = await new AxeBuilder({ page: admin }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    const first = admin.locator("article").filter({ hasText: texts[0] });
    await first.getByRole("button", { name: "Dismiss report" }).click();
    await expect(first).toHaveCount(0);
    const second = admin.locator("article").filter({ hasText: texts[1] });
    await second.getByRole("button", { name: "Remove post" }).click();
    await admin.getByRole("button", { name: "Delete permanently" }).click();
    await expect(second).toHaveCount(0);
    await page.goto(urls[1]);
    await expect(page.getByRole("heading", { name: "This one vanished." })).toBeVisible();
    await page.goto(urls[0]);
    await expect(page.getByText(texts[0], { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Post options for/ }).click();
    await page.getByRole("menuitem", { name: "Delete post", exact: true }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
  } finally { await context.close(); }
});