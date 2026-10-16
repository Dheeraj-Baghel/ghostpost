// Isolated browser integration: REAL Next/SSR/Server Actions + REAL PostgreSQL
// migrations/RPCs/RLS. Auth and the HTTP RPC transport are LOCAL TEST DOUBLES,
// NOT GoTrue/PostgREST/Google. No hosted credentials or project data are used.
// Run: npx tsx tests/room-browser-smoke.ts
import { mkdtemp, cp, symlink, readFile, readdir, rm, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import { chromium, expect as browserExpect, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const root=process.cwd(), pgPort=55441, apiPort=4320, appPort=4321;
// Keep the project's Playwright assertion budget, not its 5-second default.
const expect=browserExpect.configure({timeout:20000});
const base=`http://localhost:${appPort}`, api=`http://127.0.0.1:${apiPort}`;
const pgConfig={host:"127.0.0.1",port:pgPort,user:"postgres",password:"test-only",database:"postgres"};
const users=["owner","member","newcomer"].map(name=>({ id:randomUUID(),email:`${name}@example.invalid`,aud:"authenticated",role:"authenticated",email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:"email"},user_metadata:{} }));
const tokens=new Map<string,typeof users[number]>();
let dir:string, pg:EmbeddedPostgres, admin:Client, next:ChildProcess, browser:Browser;
let logs="";
const passed:string[]=[];
const server=createServer(async(req,res)=>{
  const send=(status:number,value:unknown)=>{res.writeHead(status,{"Content-Type":"application/json"});res.end(JSON.stringify(value));};
  try {
    const url=new URL(req.url!,api); const chunks:Buffer[]=[];
    for await(const chunk of req) chunks.push(Buffer.from(chunk));
    const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
    const user=tokens.get((req.headers.authorization??"").replace(/^Bearer /,""));
    if(url.pathname==="/auth/v1/token") {
      const found=users.find(u=>u.email===body.email);
      if(!found || body.password!=="local-test-password") return send(400,{code:"invalid_credentials",message:"Invalid login credentials"});
      const exp=Math.floor(Date.now()/1000)+3600;
      const token=[{alg:"HS256",typ:"JWT"},{sub:found.id,aud:"authenticated",exp},"test-signature"].map(v=>Buffer.from(typeof v==="string"?v:JSON.stringify(v)).toString("base64url")).join(".");
      tokens.set(token,found);return send(200,{access_token:token,refresh_token:"local-fixture",expires_in:3600,token_type:"bearer",user:found});
    }
    if(url.pathname==="/auth/v1/user") return send(user?200:401,user??{message:"Not authenticated"});
    if(url.pathname==="/auth/v1/logout") {res.writeHead(204);res.end();return;}
    if(url.pathname.startsWith("/rest/v1/rpc/")) {
      if(!user)return send(401,{message:"Not authenticated"});
      const name=url.pathname.split("/").at(-1)!;
      if(!/^(my_rooms|room_[a-z_]+)$/.test(name))return send(404,{message:"Unknown RPC"});
      const args=Object.keys(body); if(!args.every(a=>/^p_[a-z_]+$/.test(a))) return send(400,{message:"Bad arguments"});
      const client=new Client(pgConfig);await client.connect();
      try {
        await client.query("begin;set local role authenticated");await client.query("select set_config('request.jwt.claim.sub',$1,true)",[user.id]);
        const result=await client.query(`select public.${name}(${args.map((a,i)=>`${a} => $${i+1}`).join(",")}) result`,Object.values(body));
        await client.query("commit");return send(200,result.rows[0].result);
      } catch(e) {const error=e as {code:string;message:string};return send(400,{code:error.code,message:error.message});}
      finally {await client.end();}
    }
    send(404,{message:"Unknown local fixture route"});
  }catch {send(500,{message:"Local fixture failure"});}
});
async function login(page:Page,name:string) {
  await page.goto(`${base}/login`);await page.getByLabel("Email address").fill(`${name}@example.invalid`);
  await page.getByLabel("Password",{exact:true}).fill("local-test-password");await page.getByRole("button",{name:"Step inside"}).click();
  await expect(page).toHaveURL(/\/rooms$/,{timeout:60000});
}
async function screenshot(page:Page,name:string) {
  // Next streams a loading shell before server components finish. Never archive
  // a skeleton or run accessibility assertions against an unloaded page.
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(200);
  await page.screenshot({path:join(root,"artifacts/screenshots/rooms",name),fullPage:true});
}
async function main(){
  dir=await mkdtemp(join(tmpdir(),"ghostpost-room-browser-"));
  try {
    pg=new EmbeddedPostgres({databaseDir:join(dir,"db"),user:"postgres",password:"test-only",port:pgPort,persistent:false,initdbFlags:["--encoding=UTF8","--locale=C"],onLog:()=>{},onError:()=>{}});
    await pg.initialise();await pg.start();admin=new Client(pgConfig);await admin.connect();
    await admin.query(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;grant usage on schema public to anon,authenticated,service_role;
      create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
    for(const f of (await readdir("supabase/migrations")).filter(f=>f.endsWith(".sql")).sort()) await admin.query(await readFile(join("supabase/migrations",f),"utf8"));
    for(const u of users)await admin.query("insert into auth.users(id,email,email_confirmed_at)values($1,$2,now())",[u.id,u.email]);
    server.listen(apiPort,"127.0.0.1");await once(server,"listening");
    // Snapshot source only: deliberately never copy environment, keys, build output
    // or reports. Test build cannot disrupt the existing localhost:4318 process.
    const app=join(dir,"app");await mkdir(app);
    for(const f of ["src","public","package.json","package-lock.json","tsconfig.json","next-env.d.ts","next.config.ts","postcss.config.mjs"]) await cp(join(root,f),join(app,f),{recursive:true});
    await symlink(join(root,"node_modules"),join(app,"node_modules"),"dir");
    const env: NodeJS.ProcessEnv={NODE_ENV:"production",PATH:process.env.PATH,HOME:process.env.HOME,LANG:"en_US.UTF-8",NEXT_TELEMETRY_DISABLED:"1",NEXT_PUBLIC_SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"local-test-public-key",NEXT_PUBLIC_SITE_URL:base};
    next=spawn(process.execPath,[join(root,"node_modules/next/dist/bin/next"),"build","--webpack"],{cwd:app,env,stdio:["ignore","pipe","pipe"]});
    next.stdout?.on("data",b=>{logs=(logs+b.toString()).slice(-20000);});next.stderr?.on("data",b=>{logs=(logs+b.toString()).slice(-20000);});
    const [buildExit]=await once(next,"exit");if(buildExit!==0)throw new Error("Isolated production build failed: "+logs);
    next=spawn(process.execPath,[join(root,"node_modules/next/dist/bin/next"),"start","--port",String(appPort)],{cwd:app,env,stdio:["ignore","pipe","pipe"]});
    next.stdout?.on("data",b=>{logs=(logs+b.toString()).slice(-20000);});next.stderr?.on("data",b=>{logs=(logs+b.toString()).slice(-20000);});
    let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
    if(!ready)throw new Error("Local Next test app did not start. "+logs);
    const chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    browser=await chromium.launch(existsSync(chrome)?{executablePath:chrome}:{});
    const owner=await browser.newContext({viewport:{width:1440,height:1000}});const member=await browser.newContext({viewport:{width:390,height:844}});const newcomer=await browser.newContext();
    const a=await owner.newPage(),b=await member.newPage(),c=await newcomer.newPage();
    const errors:string[]=[];for(const p of [a,b,c])p.on("pageerror",e=>errors.push(e.message));
    await mkdir(join(root,"artifacts/screenshots/rooms"),{recursive:true});
    await login(a,"owner");await expect(a.getByText("Find your comfortable corner.")).toBeVisible();
    await a.getByLabel("Room name",{exact:true}).fill("Weekend crew");await a.getByRole("button",{name:"Create room",exact:true}).click();
    await expect(a).toHaveURL(/\/rooms\/[0-9a-f-]+\/admin$/,{timeout:60000});
    const roomId=new URL(a.url()).pathname.split("/")[2];
    await a.getByRole("button",{name:"Generate key",exact:true}).click();
    await expect(a.getByTestId("new-room-key")).toBeVisible();const code=(await a.getByTestId("new-room-key").textContent())!;
    expect(code).toMatch(/^[a-f0-9]{32}$/);passed.push("create room and generate moderator-only key through real Server Actions/SQL");
    await login(b,"member");await b.getByLabel("Room key",{exact:true}).fill(code);await b.getByRole("button",{name:"Join room",exact:true}).click();
    await expect(b).toHaveURL(new RegExp(`/rooms/${roomId}/feed`),{timeout:60000});
    await b.goto(`${base}/rooms/${roomId}/admin`);await expect(b).toHaveURL(/\/feed\?notice=admin-only/);passed.push("join by code and deny nonmoderator admin route");
    await a.goto(`${base}/rooms/${roomId}/feed`);await a.getByRole("button",{name:"Create post",exact:true}).click();
    await a.getByLabel("Your thought",{exact:true}).fill("A real room conversation from the local test.");await a.getByRole("button",{name:"Post anonymously"}).click();
    await expect(a).toHaveURL(/\/post\//,{timeout:60000});const postUrl=a.url();
    await b.goto(postUrl);await b.getByRole("button",{name:"Fire: 0",exact:true}).click();await expect(b.getByRole("button",{name:"Fire: 1",exact:true})).toBeVisible();
    await b.getByLabel(/Reply as/).fill("A reply stored in PostgreSQL.");await b.getByRole("button",{name:"Post reply",exact:true}).click();
    await expect(b.getByText("A reply stored in PostgreSQL.",{exact:true})).toBeVisible();passed.push("persistent scoped posts, reactions and comments");
    await login(c,"newcomer");await c.goto(postUrl);await expect(c).toHaveURL(/\/rooms\?notice=room-unavailable/);await expect(c.getByTestId("post-card")).toHaveCount(0);passed.push("outsider deep-link denial");
    await a.goto(`${base}/rooms/${roomId}/admin`);await a.getByLabel("Key label").fill("Friends only");await a.getByRole("button",{name:"Save key settings"}).click();await expect(a.getByLabel("Key label")).toHaveValue("Friends only");
    await a.getByRole("button",{name:"Replace key"}).click();await a.getByRole("alertdialog").getByRole("button",{name:/Confirm|Delete|Continue/}).click();
    await expect(a.getByTestId("new-room-key")).toBeVisible();expect(await a.getByTestId("new-room-key").textContent()).not.toBe(code);
    await c.goto(`${base}/rooms`);await c.getByLabel("Room key",{exact:true}).fill(code);await c.getByRole("button",{name:"Join room",exact:true}).click();await expect(c.getByRole("alert").filter({hasText:"invalid or expired"})).toBeVisible();
    await b.goto(`${base}/rooms/${roomId}/feed`);await expect(b.getByTestId("post-card")).toHaveCount(1);passed.push("key rotation invalidates old key without evicting members");
    await screenshot(a,"moderation-1440.png");
    // Existing social components must continue working with explicit room IDs.
    await a.goto(`${base}/rooms/${roomId}/feed`);await a.getByRole("button",{name:"Create post",exact:true}).click();
    await a.getByRole("button",{name:"Poll",exact:true}).click();await a.getByLabel("Your question",{exact:true}).fill("What should we do this weekend?");
    await a.getByLabel("Option 1",{exact:true}).fill("Read");await a.getByLabel("Option 2",{exact:true}).fill("Hike");await a.getByRole("button",{name:"Post anonymously"}).click();
    await expect(a).toHaveURL(/\/post\//,{timeout:60000});const pollUrl=a.url();
    await b.goto(pollUrl);await b.getByRole("radio",{name:"Read",exact:true}).check();await b.getByRole("button",{name:"Cast vote"}).click();await expect(b.getByText("1 vote · Your vote is in")).toBeVisible();passed.push("room poll creation and persistent voting through browser");
    await b.goto(postUrl);await b.getByRole("button",{name:/Post options for/}).click();await b.getByRole("menuitem",{name:"Report post"}).click();
    await b.getByRole("radio",{name:"Spam",exact:true}).check();await b.getByRole("button",{name:"Send report"}).click();await expect(b.getByRole("dialog",{name:"Report this post"})).not.toBeVisible();
    await a.goto(`${base}/rooms/${roomId}/admin`);await expect(a.getByText("Spam",{exact:true})).toBeVisible();await a.getByRole("button",{name:"Dismiss report"}).click();await expect(a.getByText("All clear on this page.")).toBeVisible();passed.push("room-scoped reporting and moderator dismissal");
    const moderationAxe=await new AxeBuilder({page:a}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(moderationAxe.violations).toEqual([]);
    await b.goto(`${base}/rooms`);await b.getByLabel("Room name",{exact:true}).fill("Book club");await b.getByRole("button",{name:"Create room",exact:true}).click();
    await expect(b).toHaveURL(/\/admin$/,{timeout:60000});const roomB=new URL(b.url()).pathname.split("/")[2];
    await b.getByRole("button",{name:"Generate key",exact:true}).click();await expect(b.getByTestId("new-room-key")).toBeVisible();const codeB=(await b.getByTestId("new-room-key").textContent())!;
    await a.goto(`${base}/rooms`);await a.getByLabel("Room key",{exact:true}).fill(codeB);await a.getByRole("button",{name:"Join room",exact:true}).click();await expect(a).toHaveURL(new RegExp(`/rooms/${roomB}/feed`),{timeout:60000});await expect(a.getByTestId("post-card")).toHaveCount(0);
    await a.getByLabel("Switch room",{exact:true}).selectOption(roomId);await expect(a).toHaveURL(new RegExp(`/rooms/${roomId}/feed`));await expect(a.getByTestId("post-card")).toHaveCount(2);
    await b.goto(`${base}/rooms/${roomId}/feed`);await b.getByRole("button",{name:"Open room navigation"}).click();await b.getByRole("dialog").getByLabel("Switch room").selectOption(roomB);await expect(b).toHaveURL(new RegExp(`/rooms/${roomB}/feed`));await expect(b.getByTestId("post-card")).toHaveCount(0);passed.push("independent room scenes, desktop/mobile room switching and role isolation");
    await screenshot(a,"feed-1440.png");await b.goto(`${base}/rooms/${roomId}/feed`);await screenshot(b,"feed-390.png");
    const feedAxe=await new AxeBuilder({page:b}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(feedAxe.violations).toEqual([]);
    await a.goto(`${base}/rooms`);await screenshot(a,"hub-1440.png");
    await b.goto(`${base}/rooms`);await screenshot(b,"hub-390.png");
    for(const page of [a,b]){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const axe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(axe.violations).toEqual([]);}
    await b.getByRole("button",{name:"Leave Weekend crew"}).click();await b.getByRole("alertdialog").getByRole("button",{name:/Confirm|Delete|Continue/}).click();
    await expect(b.getByRole("heading",{name:"Weekend crew",exact:true})).toHaveCount(0);await expect(b.getByRole("heading",{name:"Book club",exact:true})).toBeVisible();await b.goto(postUrl);await expect(b).toHaveURL(/\/rooms\?notice=room-unavailable/);passed.push("leave confirmation frees membership and removes access");
    expect(errors).toEqual([]);passed.push("desktop/mobile room hub accessibility, overflow and hydration checks");
    await writeFile(join(root,"artifacts/screenshots/rooms/verification.json"),JSON.stringify({scope:"Local Next + real PostgreSQL; simulated Auth/HTTP transport, NOT hosted Supabase or Google E2E",passed},null,2));
    console.log(passed.map(p=>`PASS: ${p}`).join("\n"));
  }catch(e){console.error("Local room integration failed:",e);await writeFile(join(root,"room-browser-test.log"),logs);throw e;}
  finally {
    await browser?.close();if(next && next.exitCode===null){next.kill("SIGTERM");await Promise.race([once(next,"exit"),new Promise(r=>setTimeout(r,5000))]);if(next.exitCode===null)next.kill("SIGKILL");}
    server.closeAllConnections();if(server.listening)await new Promise<void>(r=>server.close(()=>r()));
    await admin?.end();await pg?.stop();if(dir)await rm(dir,{recursive:true,force:true});
  }
}
main().catch(()=>{process.exitCode=1;});
