import { expect, test } from "@playwright/test";

// No real Google login is automated here. The authorization navigation is
// intercepted/aborted BEFORE reaching Supabase/Google. Callback error cases use
// the real local route without a successful provider exchange or user fixtures.
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configured = !!(projectUrl && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
test.use({ trace: "off" }); // Never retain PKCE verifier cookies in this contract test.

test("Google is primary on both auth entry points; password login remains accessible", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("button",{name:"Continue with Google"})).toBeVisible();
  await expect(page.getByLabel("Email address")).not.toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("button",{name:"Continue with Google"})).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Step inside"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Forgot password?"})).toHaveAttribute("href","/forgot-password");
});

test("Google action starts PKCE with safe callback and basic scopes (navigation intercepted)", async ({ page, context }) => {
  test.skip(!configured,"Public Supabase configuration needed to construct the authorize URL; no provider credentials required.");
  let captured: URL | undefined;
  await page.route(`${new URL(projectUrl!).origin}/auth/v1/authorize**`, async route => {
    captured = new URL(route.request().url());
    await route.abort();
  });
  await page.goto("/login?next=https://untrusted.example");
  await page.getByRole("button",{name:"Continue with Google"}).click();
  await expect.poll(()=>!!captured).toBe(true);
  expect(captured!.searchParams.get("provider")).toBe("google");
  expect(captured!.searchParams.get("scopes")).toBe("openid email profile");
  expect(captured!.searchParams.get("code_challenge_method")).toBe("s256");
  expect(!!captured!.searchParams.get("code_challenge")).toBe(true);
  const redirect = new URL(captured!.searchParams.get("redirect_to")!);
  expect(redirect.origin).toBe(new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4318").origin);
  expect(redirect.pathname).toBe("/auth/callback");expect(redirect.searchParams.get("next")).toBe("/feed");
  expect((await context.cookies()).some(cookie=>cookie.name.includes("code-verifier"))).toBe(true);
});

test("local callback handles cancellation/missing codes without echoing input or external redirects", async ({ page, request }) => {
  test.skip(!configured,"Unconfigured app redirects to setup instead.");
  const cancelled=await request.get("/auth/callback?error=access_denied&error_description=do-not-echo-this&next=https://untrusted.example",{maxRedirects:0});
  expect(cancelled.status()).toBe(307);
  expect(new URL(cancelled.headers().location).pathname).toBe("/login");
  expect(new URL(cancelled.headers().location).searchParams.get("notice")).toBe("oauth-cancelled");
  expect(cancelled.headers().location).not.toContain("do-not-echo-this");
  expect(cancelled.headers()["cache-control"]).toContain("no-store");
  expect(cancelled.headers()["referrer-policy"]).toBe("no-referrer");
  await page.goto("/auth/callback?error=access_denied");
  await expect(page.getByRole("alert").filter({hasText:"Google sign-in was cancelled"})).toBeVisible();
  await page.goto("/auth/callback");
  await expect(page.getByRole("alert").filter({hasText:"sign-in link is incomplete"})).toBeVisible();
  await page.goto("/auth/callback?error=server_error&error_description=never-display");
  await expect(page.getByRole("alert").filter({hasText:"Google sign-in couldn't be completed"})).toBeVisible();
  await expect(page.getByText("never-display",{exact:true})).toHaveCount(0);
});