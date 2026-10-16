import { test } from "node:test";
import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import { callbackDestination, googleOAuthOptions, isSupabaseAuthorizeUrl, memberDestination, oauthNotices } from "../../src/lib/oauth";
import { friendlyError } from "../../src/lib/errors";

// These are local SDK/routing contracts, not a real Google authorization test.
const member = { room_id: "00000000-0000-4000-8000-000000000001", name: "Friends", member_count: 2, alias: "chai-ghost-abcd1234", is_admin: false };
function fakeClient({ exchangeError = false, user = true, membership = [member] as unknown, membershipError = false, throws = false } = {}) {
  const calls: string[] = [];
  return { calls, client: {
    auth: {
      async exchangeCodeForSession() { calls.push("exchange"); if(throws) throw new Error("sensitive provider response");return { error: exchangeError ? {} : null }; },
      async getUser() { calls.push("verify-user");return { data:{user: user ? { id: "private-user" } : null}, error:null }; },
    },
    async rpc() { calls.push("membership");return { data:membership, error:membershipError ? {} : null }; },
  } };
}
const callback = (query = "code=local-fixture") => new URLSearchParams(query);

test("Google starts only basic-identity OAuth with a configured local callback and safe next", () => {
  const options=googleOAuthOptions("http://localhost:4318","https://evil.example/");
  assert.equal(options.provider,"google");
  assert.equal(options.options.scopes,"openid email profile");
  assert.equal(options.options.skipBrowserRedirect,true);
  const url=new URL(options.options.redirectTo);
  assert.equal(url.origin,"http://localhost:4318");assert.equal(url.pathname,"/auth/callback");assert.equal(url.searchParams.get("next"),"/feed");
  assert.ok(!JSON.stringify(options).includes("hd")); // no Google domain restriction
  assert.equal(new URL(googleOAuthOptions("https://example.vercel.app","/admin").options.redirectTo).searchParams.get("next"),"/admin");
});

test("OAuth authorization redirect can only target this configured Supabase Google endpoint", () => {
  const base="https://project.supabase.co";
  assert.equal(isSupabaseAuthorizeUrl(base+"/auth/v1/authorize?provider=google&code_challenge=fixture",base),true);
  for(const url of ["https://evil.example/auth/v1/authorize?provider=google",base+"/auth/v1/authorize?provider=github",base+"/redirect?provider=google","https://user:pass@project.supabase.co/auth/v1/authorize?provider=google",base+"/auth/v1/authorize?provider=google#secret","javascript:alert(1)"]){assert.equal(isSupabaseAuthorizeUrl(url,base),false);}
});

test("callback verifies exchange/session before membership routing and preserves only safe targets", async () => {
  const f=fakeClient();assert.equal(await callbackDestination(callback(),f.client),"/rooms");assert.deepEqual(f.calls,["exchange","verify-user","membership"]);
  assert.equal(await callbackDestination(callback("code=fixture&next=https://evil.example"),f.client),"/rooms");
  assert.equal(await callbackDestination(callback("code=fixture&next=/join"),f.client),"/rooms");
  const target=`/rooms/${member.room_id}/admin`;
  assert.equal(await callbackDestination(callback(`code=fixture&next=${target}`),f.client),`/rooms/${member.room_id}/feed?notice=admin-only`);
  const admin=fakeClient({membership:[{...member,is_admin:true}]});
  assert.equal(await callbackDestination(callback(`code=fixture&next=${target}`),admin.client),target);
  const newcomer=fakeClient({membership:[]});assert.equal(await callbackDestination(callback("code=fixture&next=/admin"),newcomer.client),"/rooms");
  assert.equal(memberDestination("/feed",[]),"/rooms");
  assert.equal(memberDestination(target,[]),"/rooms?notice=room-unavailable");
});

test("cancelled, failed and missing-code callbacks do not exchange or leak provider messages", async () => {
  for(const [query,expected] of [["error=access_denied&error_description=private-email%40example.com","/login?notice=oauth-cancelled"],["error=server_error&error_description=secret","/login?notice=oauth-error"],["error_code=access_denied","/login?notice=oauth-cancelled"],["next=//evil.example","/login?notice=oauth-missing-code"],["code=first&code=second","/login?notice=oauth-missing-code"]]){
    const f=fakeClient();assert.equal(await callbackDestination(callback(query),f.client),expected);assert.deepEqual(f.calls,[]);
  }
  assert.ok(!Object.values(oauthNotices).some(message=>message.includes("private-email")));
});

test("expired/failed exchange, absent verified user, and database errors fail closed", async () => {
  const failed=fakeClient({exchangeError:true});assert.equal(await callbackDestination(callback(),failed.client),"/login?notice=oauth-exchange-failed");assert.deepEqual(failed.calls,["exchange"]);
  const absent=fakeClient({user:false});assert.equal(await callbackDestination(callback(),absent.client),"/login?notice=oauth-exchange-failed");assert.deepEqual(absent.calls,["exchange","verify-user"]);
  assert.equal(await callbackDestination(callback(),fakeClient({membershipError:true}).client),"/login?notice=oauth-membership-error");
  assert.equal(await callbackDestination(callback(),fakeClient({membership:{role:"admin"}}).client),"/login?notice=oauth-membership-error");
  assert.equal(await callbackDestination(callback(),fakeClient({throws:true}).client),"/login?notice=oauth-error");
});

test("password-recovery callback remains available before office joining", async () => {
  const f=fakeClient({membership:null});assert.equal(await callbackDestination(callback("code=fixture&next=/reset-password"),f.client),"/reset-password");assert.deepEqual(f.calls,["exchange","verify-user"]);
  assert.equal(await callbackDestination(callback("next=/reset-password"),f.client),"/forgot-password?notice=link-expired");
  assert.equal(await callbackDestination(callback("code=fixture&next=/reset-password"),fakeClient({exchangeError:true}).client),"/forgot-password?notice=link-expired");
});

test("25-member SQL error reaches the user without revealing SQL/identity internals", () => {
  const message="This office has reached its 25-member limit";
  assert.equal(friendlyError({code:"P0001",message}),message);
  assert.ok(!friendlyError({code:"P0001",message:"private.users identity detail"}).includes("identity detail"));
});

test("real Supabase SSR SDK stores PKCE/session cookies and verifies user before routing (mock transport)", async () => {
  const cookies=new Map<string,string>();const requests: string[]=[];
  const fakeUser={id:"00000000-0000-4000-8000-000000000012",aud:"authenticated",role:"authenticated",email:"private@example.invalid",email_confirmed_at:new Date().toISOString(),app_metadata:{provider:"google"},user_metadata:{name:"Private Name",avatar_url:"private-photo"},created_at:new Date().toISOString(),identities:[]};
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=[{alg:"HS256",typ:"JWT"},{sub:fakeUser.id,aud:"authenticated",exp,iat:exp-3600},"fixture-signature"].map(v=>Buffer.from(typeof v==="string"?v:JSON.stringify(v)).toString("base64url")).join(".");
  const client=createServerClient("https://fixture.supabase.co","local-public-fixture",{
    cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>cookies.set(name,value))},
    global:{fetch:async (input,init)=>{
      const u=new URL(String(input));requests.push(u.pathname+(u.searchParams.get("grant_type")?"?grant_type="+u.searchParams.get("grant_type"):""));
      if(u.pathname==="/auth/v1/token"){
        const body=JSON.parse(String(init?.body));
        assert.equal(body.auth_code,"local-fixture");assert.equal(typeof body.code_verifier,"string");assert.ok(body.code_verifier.length>20);
        return Response.json({access_token:token,refresh_token:"fixture-refresh-token",expires_in:3600,token_type:"bearer",user:fakeUser});
      }
      if(u.pathname==="/auth/v1/user")return Response.json(fakeUser);
      if(u.pathname==="/rest/v1/rpc/my_rooms")return Response.json([]);
      throw new Error("Unexpected SDK transport path");
    }},
  });
  const begun=await client.auth.signInWithOAuth(googleOAuthOptions("http://localhost:4318"));
  assert.equal(begun.error,null);
  assert.ok(new URL(begun.data.url!).searchParams.get("code_challenge"));
  assert.equal(new URL(begun.data.url!).searchParams.get("code_challenge_method"),"s256");
  assert.ok([...cookies.keys()].some(name=>name.includes("code-verifier")));
  const destination=await callbackDestination(callback(),client);
  assert.equal(destination,"/rooms");
  assert.ok([...cookies].some(([name,value])=>name.includes("auth-token")&&!name.includes("verifier")&&value.length>0));
  assert.ok(requests.includes("/auth/v1/token?grant_type=pkce"));
  assert.ok(requests.indexOf("/auth/v1/user")<requests.indexOf("/rest/v1/rpc/my_rooms"));
  assert.ok(!destination.includes(fakeUser.email));
  // This intentionally used an in-memory transport, not a configured provider.
});

test("existing password sign-in still uses Supabase's password grant and SSR cookies (mock transport)", async () => {
  const cookies=new Map<string,string>();
  const user={id:"00000000-0000-4000-8000-000000000034",aud:"authenticated",email:"existing@example.invalid",app_metadata:{provider:"email"},user_metadata:{},created_at:new Date().toISOString()};
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=[{alg:"HS256",typ:"JWT"},{sub:user.id,exp,iat:exp-3600},"fixture"].map(v=>Buffer.from(typeof v==="string"?v:JSON.stringify(v)).toString("base64url")).join(".");
  const client=createServerClient("https://fixture.supabase.co","local-public-fixture",{
    cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>cookies.set(name,value))},
    global:{fetch:async(input,init)=>{
      const url=new URL(String(input));
      if(url.pathname==="/auth/v1/user")return Response.json(user);
      assert.equal(url.searchParams.get("grant_type"),"password");
      const body=JSON.parse(String(init?.body));assert.equal(body.email,user.email);assert.equal(body.password,"local-fixture-password");
      return Response.json({access_token:token,refresh_token:"fixture-refresh",expires_in:3600,token_type:"bearer",user});
    }},
  });
  assert.equal((await client.auth.signInWithPassword({email:user.email,password:"local-fixture-password"})).error,null);
  assert.equal((await client.auth.getUser()).data.user?.id,user.id);
  assert.ok([...cookies].some(([name,value])=>name.includes("auth-token")&&value.length>0));
});
