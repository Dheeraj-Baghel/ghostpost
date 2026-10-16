// Isolated browser contract for the actual PostCard reaction UI. Server actions
// are explicitly stubbed in this TEST-ONLY bundle; no app routes or auth bypasses
// are added. Does not claim live persistence or full-app build verification.
// Run: npx tsx tests/ui/emoji-reactions.ts
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function main() {
const root = process.cwd();
const directory = await mkdtemp(join(tmpdir(), "ghostpost-emoji-ui-"));
const bundle = join(directory, "ui.js");
const css = (await postcss([tailwind({ base: root })]).process(await readFile("src/app/globals.css", "utf8"), { from: resolve("src/app/globals.css") })).css;
const entry = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { PostCard } from './src/components/post-card';
const id='00000000-0000-4000-8000-000000000001';
const roomId='00000000-0000-4000-8000-000000000002';
function Fixture(){
 const [selected,setSelected]=useState(null);
 React.useEffect(()=>{const handler=event=>setSelected(event.detail);window.addEventListener('fixture:reaction',handler);return()=>window.removeEventListener('fixture:reaction',handler);},[]);
 const post={id,room_id:roomId,author_alias:'test-ghost-1234abcd',content:'REACTION UI TEST — a local fixture, not office activity.',category:'General',created_at:'2026-10-16T00:00:00Z',updated_at:'2026-10-16T00:00:00Z',is_owner:false,comment_count:0,my_reaction:selected,has_reported:false,poll:null,reactions:Object.fromEntries(['like','laugh','fire','shocked'].map(kind=>[kind,kind===selected?1:0]))};
 return <main id="main" style={{maxWidth:420,margin:'64px auto',padding:16}}><h1 className="mb-6 text-xl font-semibold">Reaction interaction test</h1><PostCard post={post} member={{room_id:roomId,name:'Test room',member_count:1,alias:'test-member-1234abcd',is_admin:false}}/><Toaster/></main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
`;
await build({
  stdin: { contents: entry, resolveDir: root, loader: "tsx" },
  outfile: bundle, bundle: true, platform: "browser", format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "isolated-react-contract", setup(b) {
    b.onResolve({ filter: /^(next\/navigation|next\/link|@\/app\/actions\/social)$/ }, args => ({ path: args.path, namespace: "fixture" }));
    b.onResolve({ filter: /^\.\/composer$/ }, args => args.importer.endsWith("post-card.tsx") ? { path: "composer", namespace: "fixture" } : undefined);
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => {
      if (args.path === "next/navigation") return { contents: "export const useRouter=()=>({refresh(){},push(){}});", loader: "js" };
      if (args.path === "next/link") return { contents: "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}", loader: "js", resolveDir: root };
      if (args.path === "composer") return { contents: "export const ComposerDialog=()=>null;", loader: "js" };
      return { contents: `
        export async function reactToPost(roomId,id,kind){
          window.fixtureCalls=(window.fixtureCalls||0)+1;
          await new Promise(r=>setTimeout(r,150));
          if(window.fixtureFail)return {error:'Test-only save failure'};
          window.dispatchEvent(new CustomEvent('fixture:reaction',{detail:kind}));
          return {success:'Saved'};
        }
        export const deletePost=async()=>({error:'Not used in this fixture'});
        export const reportPost=deletePost; export const votePoll=deletePost;
      `, loader: "js" };
    });
  } }],
});
const js = await readFile(bundle);
const font = await readFile("public/fonts/InterVariable.woff2");
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  if (request.url === "/ui.js") { response.setHeader("Content-Type", "text/javascript"); response.end(js); }
  else if (request.url === "/ui.css") { response.setHeader("Content-Type", "text/css"); response.end(css); }
  else if (request.url === "/fonts/InterVariable.woff2") { response.setHeader("Content-Type", "font/woff2"); response.end(font); }
  else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Emoji UI test</title><link rel="stylesheet" href="/ui.css"></head><body><div id="root"></div><script type="module" src="/ui.js"></script></body></html>'); }
});
await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Test server unavailable");
const executable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, ...(existsSync(executable) ? { executablePath: executable } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 740 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.evaluate(() => document.fonts.ready);
  const reactions = page.getByRole("group", { name: "Post reactions" });
  for (const [label, emoji] of [["Like", "👍"], ["Laugh", "😄"], ["Fire", "🔥"], ["Shocked", "😲"]]) {
    const button = reactions.getByRole("button", { name: `${label}: 0`, exact: true });
    await expect(button.locator(".reaction-emoji")).toHaveText(emoji);
    const box = await button.boundingBox(); assert.ok(box && box.width >= 44 && box.height >= 44);
  }
  // Record each actual animation, and pause only the first one briefly for the
  // visual inspection capture. The component's normal 750ms cleanup stays active.
  await page.evaluate(() => {
    document.documentElement.dataset.pops = "0";
    document.addEventListener("animationstart", event => {
      if (event.animationName !== "reaction-pop") return;
      const n = Number(document.documentElement.dataset.pops || 0) + 1;
      document.documentElement.dataset.pops = String(n);
      if (n === 1 && event.target instanceof Element) for (const animation of event.target.getAnimations()) { animation.pause(); animation.currentTime = 180; }
    });
  });
  await reactions.getByRole("button", { name: "Like: 0", exact: true }).click();
  await expect(reactions.getByRole("button", { name: "Like: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("reaction-pop")).toHaveText("👍");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.pops)).toBe("1");
  await mkdir("artifacts/screenshots", { recursive: true });
  await page.getByTestId("post-card").screenshot({ path: "artifacts/screenshots/emoji-reaction-pop.png", animations: "allow" });
  await expect(page.getByTestId("reaction-pop")).toHaveCount(0);
  await reactions.getByRole("button", { name: "Laugh: 0", exact: true }).click();
  await expect(reactions.getByRole("button", { name: "Laugh: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.pops)).toBe("2");
  await expect(reactions.getByRole("button", { name: "Like: 0", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("reaction-pop")).toHaveCount(0);
  await reactions.getByRole("button", { name: "Laugh: 1", exact: true }).click();
  await expect(reactions.getByRole("button", { name: "Laugh: 0", exact: true })).toHaveAttribute("aria-pressed", "false");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.pops), "2");
  // Native keyboard activation; pending state blocks repeat submits.
  const fire = reactions.getByRole("button", { name: "Fire: 0", exact: true });
  await fire.focus(); await page.keyboard.press("Enter");
  await expect(fire).toBeDisabled();
  await page.keyboard.press("Enter");
  await expect(reactions.getByRole("button", { name: "Fire: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.pops)).toBe("3");
  assert.equal(await page.evaluate(() => (window as unknown as { fixtureCalls: number }).fixtureCalls), 4);
  await expect(page.getByTestId("reaction-pop")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await reactions.getByRole("button", { name: "Shocked: 0", exact: true }).click();
  await expect(reactions.getByRole("button", { name: "Shocked: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("reaction-pop")).not.toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.pops), "3");
  await expect(page.getByTestId("reaction-pop")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { (window as unknown as { fixtureFail: boolean }).fixtureFail = true; });
  await reactions.getByRole("button", { name: "Like: 0", exact: true }).click();
  await expect(page.getByText("Test-only save failure", { exact: true })).toBeVisible();
  await expect(reactions.getByRole("button", { name: "Shocked: 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.pops), "3");
  await expect(reactions.getByRole("button", { name: "Like: 0", exact: true })).toBeEnabled();
  // Wait for the transient toast to finish before its fade affects contrast.
  await expect(page.getByText("Test-only save failure", { exact: true })).not.toBeVisible({ timeout: 8000 });
  await page.setViewportSize({ width: 320, height: 740 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) })), []);
  console.log("PASS: emoji glyphs, 44px targets, successful pop and cleanup, switch/remove, keyboard, duplicate blocking, reduced motion, failed-save behavior, 320px fit and Axe checks.");
  console.log("Test boundary: actual PostCard UI with stubbed server actions; no live accounts, Google flow, or database writes.");
} finally {
  await browser.close(); await new Promise<void>(r => server.close(() => r())); await rm(directory, { recursive: true, force: true });
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
