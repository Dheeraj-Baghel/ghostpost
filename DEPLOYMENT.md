# GhostPost deployment

## Active release: public GitHub and personal Vercel Hobby (2026-10-16)

The user supplied `https://github.com/Dheeraj-Baghel/ghostpost`, authorized the push
and deployment, then explicitly selected **public GitHub + personal/non-commercial
Vercel Hobby**. This supersedes the private-repository assumption and hosting hold
in historical sections below. Do not change repository visibility or buy a plan.

- Repository: `Dheeraj-Baghel/ghostpost`, initially empty; only this app is its root.
- Vercel: dedicated `ghostpost` project in `softtech10`, Node 24, Next.js, `npm ci`,
  `npm run build`. Existing workspace deployments are not reused or modified.
- Reserved production origin: **https://ghostpost-softtech10.vercel.app**.
- Only the three public application variables are configured for **Production**.
  Preview does not receive production database credentials. Preview deployment
  protection is enabled; the production hostname is intended to be publicly reachable.
- Authenticated GitHub and Vercel browser flows succeeded. No chat-supplied PAT was
  used or stored in the project. A token disclosed in chat must be revoked by its
  owner. Never put any replacement credential in documentation or source.
- Actual staged-file secret scan: no findings. Local environment, private keys,
  generated screenshots/logs/reports and the destructive one-time reset script are
  excluded. No hosted migration, data reset, new users or role changes occur here.
- Fresh lint, types, 21 unit tests, 37 PostgreSQL tests and production build passed.

**Remaining before deployment:** save production Supabase URL configuration while
preserving localhost entries. Set Site URL to the reserved origin and add exactly:

```text
https://ghostpost-softtech10.vercel.app/auth/callback
https://ghostpost-softtech10.vercel.app/auth/callback?next=/feed
https://ghostpost-softtech10.vercel.app/auth/callback?next=/join
https://ghostpost-softtech10.vercel.app/auth/callback?next=/reset-password
https://ghostpost-softtech10.vercel.app/auth/confirm
```

The Google-provider credentials and Google-to-Supabase callback stay unchanged.
No Supabase management credential is available to apply these settings here;
the dashboard step is pending user completion. The reserved URL is not a claim
of successful deployment. Then verify public HTTPS routes, signed-out protection,
Google initiation with the production redirect and a user-operated Google login.
Do not test destructive workflows against existing room content.

The prior preflight/release notes below are retained history.

## Current: user reports working; GitHub/Vercel rollout requested

The user reports that everything is working and requests GitHub/Vercel hosting
with ongoing improvements based on real-user feedback. This supersedes the prior
general deployment hold in principle; the destination account/repository, Vercel
team/eligible plan and exact production origin still need to be established before
upload or deployment. No Git push, Vercel project creation, production environment
change or deployment has been performed in this readiness check.

Read-only preflight: GhostPost is not in a Git worktree, has no local Vercel link,
and neither GitHub CLI nor Vercel CLI is on PATH. Ignore rules exclude local env,
private keys, logs, build/test output and Vercel metadata; the environment example
contains blank credential fields. This is not a final staged-file secret scan.
The local canonical origin is still http://localhost:4318. No new account counts,
moderator identity or real Google/browser test outcome is inferred from the
general user report. The prior empty-account counts below describe reset time.

### Information and access needed for hosting

1. An empty private `ghostpost` GitHub repository URL under the intended owner.
   Create it without a generated README/license/gitignore; do not overwrite an
   existing repository. Only this app directory becomes its repository root,
   not the multi-app Designer workspace. Authenticate via GitHub's normal browser
   or local credential flow; never paste passwords/tokens into chat.
2. The intended signed-in Vercel account/team and an eligible hosting plan. Hobby
   is for personal non-commercial use; the six-room/25-member limits do not decide
   plan eligibility. Do not purchase/upgrade a plan without explicit approval.
3. An available stable Vercel project hostname. A purchased custom domain is not
   required for basic Google login. Never assume a requested hostname is free.
4. Access to the existing dedicated Supabase project's URL configuration once the
   production origin is known. Preserve Google provider credentials and local
   redirects; add exact production callbacks and set the production Site URL.

Vercel Production needs only `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` (the final HTTPS
origin). Reuse existing public values securely, not by echoing environment files.
Google client secrets remain in Supabase. Never upload the operator secret,
database URI, test account credentials or the entire local environment to Vercel.
Use Next.js, Node 24, `npm ci`, and `npm run build`; do not run migrations/resets/
seeding as a build step. Inspect staged files and perform a secret scan before
the first commit/push, then rerun release checks and verify Google on the actual
production URL before inviting testers. Do not log OAuth callback codes.

### Updates while users test the live app

- Capture feedback as issues with sanitized reproduction steps; no invite keys,
  account credentials or private room content in shared issue attachments.
- Implement each change on a branch, test locally, and review a Vercel preview
  before merging to the production branch. Once intentionally connected, GitHub
  pushes/merges can trigger deployments; configure branch/env scopes first.
- A Preview label is NOT database isolation. Use disposable/local Supabase or a
  separate test project for authenticated previews. Do not attach production
  credentials or broad production OAuth redirect wildcards to untrusted previews.
- Normal code/UI deployments keep the stable production URL and external Supabase
  data. No blanket promise of zero interruption or compatibility: test auth,
  mutations, migrations and long-open tabs before release.
- Use reviewed versioned migrations, appropriate production backups and additive,
  backward-compatible schema changes first. Delay destructive changes until old
  clients are retired. Never repeat the one-time clean reset on tester data.
- Vercel application rollback does not undo external Supabase data/schema changes.
  Database recovery/forward fixes require a separate reviewed plan and backup.

References: [Vercel Hobby](https://vercel.com/docs/plans/hobby),
[GitHub deployments](https://vercel.com/docs/git/vercel-for-github),
[generated URLs](https://vercel.com/docs/deployments/generated-urls),
[Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls).

The sections below retain the completed reset and earlier release history.

## Current release gate: private rooms (2026-10-16)

**This section supersedes all older single-office launch sequences below.**
The new source implements private rooms, six active memberships per account,
25 members per room, separate aliases, isolated feeds and creator-only key controls.
Read [PRIVATE_ROOMS.md](PRIVATE_ROOMS.md) for behavior, limitations and upgrade steps.

**Hosted 004 is now applied; an explicitly authorized clean reset is complete.**
The Google callback had verified the user but could not find `my_rooms`: the hosted
schema was still 001-003. The user approved upgrade, then superseded preservation
with a clean reset and selected **app data plus Auth accounts/sessions**. No backup
was created or restoration attempted. The app was stopped briefly, CLI dry-run
confirmed only 004 pending, and tracked migration application succeeded. The
scoped reset deleted all application rows and hard-deleted the two existing Auth
users through Supabase Admin API. Users, identities, sessions and refresh tokens
were verified empty; room/membership/moderator counts are zero.

Google's provider settings were not changed; before/after public Auth settings
matched. All eleven application tables retain RLS, the room RPC is available to
authenticated users, anonymous calls are denied, private mappings remain unreadable
and legacy global RPC access is revoked. The local app was restarted on port 4318.
Signed-out browser navigation correctly redirects room/feed/moderation URLs to
login. Google PKCE initiation was intercepted before contacting the provider.

**Next gate: choose the intended moderator account, then real-user testing.**
No moderator or test user has been created. New rooms still use creator-only
moderation; choosing an initial moderator does not grant a global administrator
role. Use a fresh Google sign-in after selecting the account. Do not bootstrap via
the revoked legacy `operator_set_admin`. Repeating the destructive reset requires
new explicit authorization; the one-time script is not an automatic migration.

Local checks use real PostgreSQL and isolated production-build browsers, but browser
Auth/HTTP is simulated, not real Google/GoTrue/PostgREST. The current hosted check
confirms RPC availability and anonymous denial, not authenticated social E2E.
Old live-office results below do not verify the clean version. Old operator/bootstrap/live scripts are guarded against
accidental use; room creators manage their own keys in the app instead.

No scopes, provider secrets, public variables or callback changes are needed.
The existing `?next=/feed` callback now routes to `/rooms`. Recovery remains intact.
GitHub, Vercel linkage and deployment remain separately on hold.

## UI refresh hold

Before GitHub setup, the user requested the supplied Pinterest-inspired visual
direction. That presentation-only refresh is implemented and verified: warm cream,
black typography, precise red primary actions, flat 16/32px cards, text/poll masonry,
mobile navigation and auth overlays. See [design tokens](DESIGN.md) and
[current verification](VERIFICATION.md). Existing real office data is unchanged;
only temporary labelled regression fixtures were created and removed during tests.
There were no schema/provider changes. **GitHub and deployment remain paused**
until the user reviews the redesign and resumes the release workflow.

## Google-first migration — current gates

**This section supersedes the older SMTP-first onboarding sequence below.**
Google is the primary new-user login; existing password sign-in/recovery remain.
The 25-member cap applies only to office memberships, including administrators.

**Latest authorized Supabase setup:** the user explicitly granted management access
for this GhostPost project. The missing `?next=/feed` redirect has now been added,
and hosted migration `202610150003` was applied after a clean dry run. Readback
verified the office lock, 25-member check, fixed definer search path, least-privilege
execute grant, and all nine RLS-enabled tables. Existing application records and
Auth account identity/confirmation state were unchanged. No users were created,
deleted, merged, or promoted.

Local origin remains **http://localhost:4318**. Existing redirects, email/password
login and email confirmation were preserved. **Google is now enabled**, verified
through Supabase's public Auth settings after the user's dashboard update. The
same check confirms email/password is enabled and email confirmation is required.
The local `/login` page returns HTTP 200 with Google and secondary password actions.
The user has now reached the authenticated `/join` page in an incognito browser
(screenshot verified). At that stage a read-only database check found one Auth
account and one Google-linked account, with zero office members/admins. This supports successful
Google authentication; nickname stability, repeat login, and password-linking
regression still need testing. No identity fields or credential values were printed.

The supplied management token was used only for the scoped Supabase setup; its
temporary local copy was removed. It was supplied in chat, so revoke/rotate it in
Supabase Access Tokens before reuse. Never share replacement credentials in chat.
No Google/Supabase secret entered the app's public configuration or browser build.

**Deployment hold continues:** no Git initialization/push, Vercel linkage, or
deployment occurred. Supabase authorization does not authorize those operations.

### Administrator screen and Google re-login checked — next: private GitHub

The user authorized first-admin bootstrap after reporting that joining worked.
Read-only checks identified exactly one Auth account and one joined profile:
confirmed, Google-linked, not previously admin, with the initial single-use
invitation redeemed within its validity window. No identity values were printed.
The existing `operator_set_admin` function was called for that exact member under
the privileged operator role. **There is now 1 member and 1 administrator.**

Verification passed: before promotion the member could not read reports or invoke
the operator bootstrap; after promotion its authenticated database context could
read the moderation queue. A nonmember remained denied. The nickname/join date
and all other application/Auth rows were unchanged. A fresh signed-out browser
request to `/admin` redirected to login. This does not substitute for verifying
the administrator's real signed-in browser session.

The user's screenshot now confirms the real signed-in `/admin` page renders
**Keep the good ghost energy.**, the Moderation navigation item, and an empty
report queue. The administrator screen check is complete; the screenshot alone
does not constitute a report-removal test.

The user now reports **relogin works** after checking the same Google account,
unchanged nickname, no repeated invitation and continued admin access. This is
manual user-reported verification, not a new automated Google E2E result.
Existing-password/account-linking regression remains a separate pending check.

Read-only GitHub preflight: this app is not in a Git worktree and has no Vercel
linkage. GitHub CLI is not installed; no authenticated GitHub owner was identified.
Git and Vercel ignore rules exclude local env files, logs, test results and private
keys. The example's secret fields are blank, and the candidate text-source scan
found zero matches for known local secrets or checked key patterns. This scan is
not a substitute for inspecting the actual staged files before any future push.
Consumed invitation and temporary management-token files are absent.

**Current manual step:** at `https://github.com/new`, create a private repository
named `ghostpost` under the intended account. Leave initial README, .gitignore and
license unchecked because this app already has source and ignore rules. Send only
the resulting repository URL, never a token or password. If the name is already
in use, do not overwrite an existing project. No local Git initialization, commit,
push, Vercel integration or deployment has been performed; obtain explicit
authorization before uploading the existing app. Keep auto-deployment disconnected.

### 1. Google Cloud — manual setup

**Progress:** the user reports selecting **External** audience and saving the
basic identity scopes (`openid`, `.../auth/userinfo.email`, and
`.../auth/userinfo.profile`). The user now reports **Client created** following
the GhostPost Web / Web application instructions. Client settings and redirect
URI have not been independently inspected. The user then reported **Google enabled**;
provider enablement has been independently verified via public Auth settings.
**Onboarding completed:** the initial single-use invitation was redeemed and
membership verified. Its plaintext local file was removed after redemption and
the explicitly authorized admin bootstrap were verified. The consumed database
invitation record remains for usage accounting. The invitation itself never
assigned administrator rights; promotion was a separate privileged operation.

1. Open a dedicated Google Cloud project → **Google Auth Platform** (older console:
   APIs & Services → OAuth consent screen). Supply accurate app name, support email,
   and developer contact details under **Branding**.
2. Under **Audience**, choose **External** to permit personal Google accounts.
   Do not choose Workspace-only Internal for this office flow. GhostPost sets no
   `hd`/email-domain restriction; Google Workspace/Advanced Protection policies can
   independently block an account from authorizing a third-party application.
3. Under **Data Access**, request only **openid, email, profile**. The console may
   show the equivalent `.../auth/userinfo.email` and `.../auth/userinfo.profile`
   names. Do not request Gmail, Drive, offline API access, or unrelated scopes.
4. Under **Clients**, create an OAuth client of type **Web application**.
5. In Supabase **Authentication → Sign In / Providers → Google**, copy the exact
   **Callback URL** displayed there. Add that URL to the Google client's
   **Authorized redirect URIs**. It normally looks like:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   Use the displayed value, not a guessed host. **Do not put GhostPost's
   `/auth/callback` here.** This is the Google → Supabase callback.
6. This app uses server redirects, not the Google JavaScript/One Tap SDK. If adding
   Authorized JavaScript origins for your web client, use origins only, such as
   `http://localhost:4318` and your eventual HTTPS app origin (no path). These do
   not replace the authorized redirect URI above. Configure authorized domains
   per the current Google/Supabase console instructions; don't claim ownership of
   a platform's parent domain. Use the standard Supabase-hosted callback unless
   intentionally configuring a verified custom Auth domain.
7. Keep the client secret private for the next step. Do not paste it into chat,
   `.env.example`, application source, or any `NEXT_PUBLIC_*` variable.

**Testing vs Production:** Google's general Testing rules include a tester list,
100-test-user quota and seven-day authorization expiry. Google's official Audience
documentation explicitly gives an exception for requests limited to basic
name/email/profile/OpenID identity scopes: users need not be on the tester list,
do not see that Testing warning, and those authorizations do not expire after
seven days. Adding any other scope removes that exception. This Google rule is
separate from GhostPost's 25-member database cap.

For a public release, review Audience → **In production / Publish app** and the
console's verification status as an authorized dashboard step. Publishing,
brand verification and sensitive/restricted-scope verification are distinct.
Basic identity scopes do not require sensitive-scope verification; Google may
still require branding verification to display your custom name/logo or under
its other criteria. A request to verify branding can require a public homepage,
privacy policy and proof of domain ownership. Do not claim every Testing app has
the same restrictions, or promise that this project's branding is approved.

A suitable hosted application URL works for basic Google login without purchasing
a custom domain. Optional custom branding/domain verification requirements are
separate; inspect the actual console criteria rather than purchasing a domain
as a blanket prerequisite.

### 2. Supabase — redirects complete, Google credentials still required

1. In **Authentication → Sign In / Providers → Google**, enable Google, paste the
   web client ID and secret directly into their dashboard fields, and save.
   Leave nonce/email verification safety checks at their secure defaults.
2. Keep email/password Auth enabled so existing users can still sign in. Do not
   reset passwords, delete accounts, or disable confirmation globally.
3. Set local **Site URL** to `http://localhost:4318`. Allow the application callback
   URLs below in **URL Configuration** (preserve existing confirmation/recovery entries):

   ```text
   http://localhost:4318/auth/callback
   http://localhost:4318/auth/callback?next=/feed
   http://localhost:4318/auth/callback?next=/join
   http://localhost:4318/auth/callback?next=/reset-password
   http://localhost:4318/auth/confirm
   ```

   The **`?next=/feed` entry has now been added and verified** for Google-first sign-in. This callback leg is
   Supabase → GhostPost. In production, add exact equivalents using the chosen
   HTTPS application origin; avoid broad production wildcards.
4. Supabase's server handles provider email verification and PKCE. GhostPost
   verifies the resulting session, queries private membership, and chooses only
   allowlisted local destinations. No separate app-sent confirmation is required
   for a Google email that Supabase accepts as verified. If Google does not supply
   a verified email, do not bypass the trusted confirmation check with metadata.

### 3. Database — authorized hosted migration applied

The [25-member migration](supabase/migrations/202610150003_member_limit.sql)
was applied to the intended hosted project with explicit user authorization. It
replaces only `join_office`; the two old migrations and all existing application
data are unchanged. Before applying: 1 Auth account, 0 office memberships/admins.
The dry run showed only this migration pending. After applying, migration history
contains `202610150001`, `202610150002`, and `202610150003`.

The office-wide lock and capacity check are present in the hosted function; anon
cannot execute it, authenticated callers can, and RLS remains enabled. The detailed
last-slot race tests were run in disposable local PostgreSQL, not by filling the
hosted office with fake members. No additional authorization is needed to repeat
this already-completed operation; do not reapply SQL manually. Commands used:

```sh
npm run db:migrate -- --dry-run
npm run db:migrate
```

At more than 25 existing members, no one is evicted. Existing login/join retries
work, but new admissions are blocked. No data rewrite or membership cleanup is
part of this migration. Use the normal READ COMMITTED PostgREST transaction; the
function refuses snapshot-isolated new admission rather than risk a stale count.

### 4. Manual Google verification / identity linking

After the remaining Google provider setup (hosted migration is complete):

- Use **Continue with Google** with an actual Google account. Test cancellation,
  successful return, session persistence, and a sign-in started in the same browser
  (PKCE verifier cookie required). No real Google OAuth E2E has passed yet.
- Confirm a nonmember lands at `/join` and cannot reach `/feed` or `/admin`.
  Use an authorized private invitation, verify the server-generated nickname,
  then sign out/in and confirm the nickname and membership persist.
- Test a **confirmed existing password user's same verified Google email**.
  Supabase documents automatic linking to that Auth user. Privately verify the
  same Auth UUID/nickname and that password login still works. GhostPost performs
  no manual email matching/merging. Different-email accounts remain distinct.
  Supabase may remove unconfirmed identities to prevent account takeover; don't
  promise preservation of an unconfirmed identity or infer admin rights from it.
- Verify ordinary-member payloads contain no Google name/email/avatar/subject or
  account UUID, and private mappings/moderation permissions remain protected.
- Exercise the cap in a disposable/staging office, not by filling the real office
  with fake members. Local automated tests already cover member 25/26, multiple
  invitations, concurrent last-slot races, over-cap upgrades and usage rollback.

### 5. Hosting / continued hold

Choose an appropriate HTTPS hosted URL (a custom purchased domain is not mandatory
for basic sign-in). Vercel plan terms still apply: don't assume free Hobby hosting
permits an office/business application. Future app variables remain only
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`NEXT_PUBLIC_SITE_URL`. Google client secrets live in Supabase; operator/database
credentials are never needed in the Vercel web app environment.

Do not initialize/push Git, link a Vercel project, edit production provider settings,
or deploy without explicit authorization for the relevant operation. Review
production URLs and hosting logs (OAuth codes are sensitive even though short-lived)
before any authorized release. SMTP instructions below now apply only to retained
email/password registration/recovery, not Google onboarding. Default Supabase mail
does not prevent Google users joining but still restricts those secondary email flows.

### Official references reviewed

- [Supabase Google / Next.js SSR](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase OAuth email confirmation source](https://github.com/supabase/auth/blob/master/internal/api/external.go)
- [Google Audience / Testing exception](https://support.google.com/cloud/answer/15549945?hl=en)
- [Google production-readiness overview](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
- [Google branding verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)

## Previous preparation / retained email-path history

The sections below preserve earlier diagnostics and setup history. Their
SMTP-first sequence is superseded for Google users by the gates above. Historical
test counts and hosted database checks do not assert the new migration is deployed.

## Original boundary

The app is self-contained and has a production build. Supabase connection and
migration setup are supported through explicit operator scripts. Deployment must
use a **new GhostPost Vercel project**, not any existing workspace app's project.
No real credentials belong in source, examples, screenshots, or Git.

## Rotation follow-up / production hold (2026-10-15)

**Do not deploy yet.** The user requests sequential guidance and no deployment
until the required production settings are ready. No Git initialization, GitHub
push, Vercel linkage, or deployment was performed in this follow-up.

- Rotation is reported complete by the user. The operator key currently stored in
  the ignored `.env.local` was validated through Supabase Auth without displaying
  it. No replacement was necessary: the local configuration already works.
- Only `SUPABASE_SECRET_KEY` consumes the rotated value. No legacy
  `SUPABASE_SERVICE_ROLE_KEY` override is set. Public keys, the database URI, and
  site URL are independent; do not replace them with the secret.
- Local environment permissions: `0600`; example secret fields are blank. No
  operator secret or database-password matches occur in the browser build.
- Verified TLS database access works; migrations `202610150001` and `202610150002`
  remain applied. The old key's revocation has not been independently tested.
- Email/password signup is enabled and confirmation is required. SMTP delivery,
  templates, and hosted redirect configuration are not verified by this check.
- Local site URL remains localhost. There is no selected production origin in
  local configuration. Do not overwrite the local origin just to prepare Vercel;
  set the production origin in the future Vercel Production environment.
- No members, office administrators, or active invitations were present. There is
  no app-local Git metadata or Vercel project linkage.
- Fresh verification: lint, TypeScript, 10 unit tests, 15 PostgreSQL tests,
  production build, real Supabase API checks, and 12 browser tests passed. The
  unconfigured-state test was intentionally skipped. Production dependency audit:
  zero vulnerabilities. Temporary accounts/posts/invitations were cleaned up and
  absence confirmed. Existing dev-only lint-tool audit caveat still applies.

### Sequential manual gates

**Latest progress:** user reports **SMTP saved**. This records dashboard setup,
not successful delivery or independently verified sender/DNS settings. Port 3000
serves another app and was left untouched. GhostPost is running locally at
**http://localhost:4318**; its login page was verified. Only the non-secret local
`NEXT_PUBLIC_SITE_URL` was updated to that origin; credentials were unchanged.
If restarting for this test, use `npm run dev -- --port 4318`.

**URL setup:** all four redirect URLs below were verified in the screenshot.
The user subsequently confirmed saving Site URL as `http://localhost:4318`.
The Site URL correction is user-reported, not independently read from the dashboard.
Leave the four redirect entries as they are:

```text
http://localhost:4318/auth/callback
http://localhost:4318/auth/callback?next=/join
http://localhost:4318/auth/callback?next=/reset-password
http://localhost:4318/auth/confirm
```

**Confirmation template saved (user-reported).** The instructed confirmation link is
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/join`.
Actual confirmation-email delivery has not yet been tested.

**Recovery template saved (user-reported).** The instructed reset link is
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
(with `&amp;` in HTML source). Actual recovery-email delivery is still untested.

**Current blocker: real signup returned a generic Auth error.** User screenshots
show the signup failure and a confirmation template with the expected token-hash
link. No persisted Auth accounts were found by the read-only diagnostic check.
**Cause identified from user-supplied Auth service logs:** `/signup` failed at
16:01:44 and 16:02:43 with SMTP `535 "Invalid username"`. The SMTP server rejected
mail-service authentication. Correct the provider-issued SMTP username and its
matching credential in Supabase SMTP settings; do not change application keys,
SQL permissions, email templates, or disable confirmation to work around it.
The user identified the SMTP provider as **Resend**. Official Resend documentation
specifies hostname `smtp.resend.com`, port `465`, and the literal SMTP username
`resend`. The password is a Resend API key with sending permission, not a Supabase
key or mailbox password. The accompanying GoTrue deprecation/reload notices are
not the reported signup failure.

Added allowlisted signup diagnostics (code, HTTP status, and a boolean email-send
failure classification only) and actionable messages for known email/Auth errors.
No raw errors, form fields, emails, passwords, or tokens are logged. Lint,
TypeScript and all 11 unit tests pass; real signup remains unverified.

The user supplied a log summary confirming HTTP 500 on `/auth/v1/signup` at
16:02:41 (15 October, dashboard time), with the expected localhost:4318 callback.
The other supplied records are normal PostgreSQL checkpoints/dashboard queries;
SQLSTATE `00000` is not an error. The HTTP summary does not include the root cause
and does not establish SMTP failure.

**Previous attempt — superseded by default mail below.** The user confirmed updating Resend SMTP
settings after the `535 Invalid username` failure. The instructed values were
host `smtp.resend.com`, port `465`, username `resend`, and a Resend API key with
appropriate sending permission entered directly in Supabase. Credentials were
not requested or printed; successful SMTP authentication is not yet independently
verified. Production still requires a sender on a domain verified in Resend.

**Latest choice: Supabase default email for testing.** User removed Resend access.
Screenshot shows **Enable custom SMTP** off and settings successfully updated.
Do not reintroduce Resend or change Supabase keys. Auth templates and callback
routes remain compatible; the mail provider is selected in Supabase, not app code.
App error messages now distinguish the email quota from generic request throttling
and explain the default provider's recipient restriction.

Default mail sends only to Supabase organization-team email addresses, with a
documented limit of 2 emails per hour. It is not suitable for general office
production use. GhostPost membership/invitations do not authorize recipients.
Do not invite ordinary coworkers to the Supabase dashboard to work around this.
Production mail remains an unresolved launch gate; Resend is not required.
Source: https://supabase.com/docs/guides/auth/auth-smtp

**Current manual step: one controlled signup retry using the existing Supabase
owner/team email address.** The local signup page at
`http://localhost:4318/signup` was rechecked: HTTP 200 and expected GhostPost form.
Refresh it, register once using the user's controlled inbox, and check inbox/spam
for the confirmation email. Open its link on this computer and stop at `/join`.
Report only whether the email arrived and the invitation screen appeared, or the
sanitized error text. Do not share passwords or confirmation links. Do not disable
email confirmation or repeatedly submit signup if it fails. No signup/email was
sent by the agent's availability check.
Source: https://resend.com/docs/send-with-supabase-smtp
After fixing the cause, resume real confirmation delivery and stop at `/join`;
no office invitation or admin promotion has been created by this step.

Confirmation delivery and recovery delivery remain pending until tested. These
are temporary local-test settings, not production settings; deployment remains
on hold.

Work on **one gate at a time**, then record its outcome before advancing:

1. **SMTP sender setup — saved, user-reported.** In Supabase Authentication's Email/SMTP settings,
   enable custom SMTP with your mail provider's host, port, credentials, and a
   verified sender address/name. Complete the provider's sender/domain verification
   and required DNS records. Enter credentials directly in the dashboard, never
   chat. Saving settings does not prove delivery; inbox tests belong to gate 2.
2. **Auth email flow.** Review confirmation/recovery templates and redirect URLs
   from the README; match the local origin to the actual local server port. Start
   only GhostPost, then test an actual signup confirmation email and recovery email
   using an operator-controlled inbox. Do not disable confirmation to bypass mail.
3. **First administrator.** Generate a small-capacity private invitation locally
   (the script prints the invitation to the operator's terminal, not chat); join
   the intended account. Confirm its exact Auth UUID and promote only that account.
   Check `/admin` access and ordinary-member denial. No guessed identity/promotion.
4. **GitHub preparation.** Confirm repo owner/name and private visibility. Prefer
   this directory as the standalone repository root. Inspect staged filenames,
   ignore behavior, and a secret scan before any commit/push. Exclude `.env*`
   except the blank example, test traces/reports/logs, private keys, and `.vercel`.
   Do not connect an auto-deploy integration yet.
5. **Production/Vercel settings, before any deployment.** Decide the exact HTTPS
   production origin, an appropriate Vercel plan, repository/root, and environment
   scope. Set matching Supabase Site URL, redirects and email links; review sender
   configuration. Vercel needs only the three public application variables.
   Do not click **Deploy**, run `vercel`, or connect a Git integration that triggers
   a build until these settings and the preceding gates are ready. If the selected
   Vercel workflow cannot reserve/configure the target without deployment, stop
   for an explicit decision rather than deploy to discover its URL.

Once all gates are ready, obtain the user's go-ahead for the dedicated GhostPost
deployment. Then perform HTTPS-domain email and application checks before sharing
the invitation with the office. Do not confuse local mail-flow verification with
verification of production redirects after deployment.

## Exact launch steps

1. **Confirm the operator secret rotation.** The user has reported this complete;
   the current local key is accepted. It was initially
   placed in a shareable example file and was moved to the ignored local environment.
   Update that local value after rotation. Rotate the database password too if its
   connection URI has been shared outside the intended operator environment.
2. Create/select the dedicated Supabase project, configure its public/operator/DB
   values, and run `npm run db:migrate -- --dry-run`, then `npm run db:migrate`.
   Already-applied migrations are tracked by Supabase CLI and not re-applied.
3. Configure Supabase email/password Auth, confirmation and recovery templates,
   allowed redirects, and SMTP as described in the [README](README.md).
4. Push this app to a private/new Git repository (or an appropriate subdirectory in
   your existing repository). Ensure the ignored local environment is **not staged**.
5. Prepare the Vercel import settings for **GhostPost**, but do not submit an import
   that starts deployment until the readiness gates are complete. Root Directory is `ghostpost`
   when importing the full workspace, or `.` when this directory is its own repo.
   Select Next.js, Node 24, install `npm ci`, build `npm run build`; no custom output
   directory or migration/seed build command is needed. Select a Vercel plan whose
   terms permit the office's intended use; do not assume Hobby covers business use.
6. Add only these application environment variables for the intended environment:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `NEXT_PUBLIC_SITE_URL=https://YOUR_GHOSTPOST_DOMAIN`.
   **The web app does not require the operator key or database password on Vercel.**
7. Before deploying, set Supabase's Site URL and redirects to the chosen exact
   production domain. Keep deployment on hold until the sequential gates above
   are satisfied:

```text
https://YOUR_GHOSTPOST_DOMAIN/auth/callback
https://YOUR_GHOSTPOST_DOMAIN/auth/callback?next=/join
https://YOUR_GHOSTPOST_DOMAIN/auth/callback?next=/reset-password
https://YOUR_GHOSTPOST_DOMAIN/auth/confirm
```

8. Only after readiness review and go-ahead, deploy. Rebuild after changing any
   `NEXT_PUBLIC_*` values. Use separate Supabase
   projects/environments for untrusted previews; avoid broad production auth redirect
   wildcards. Do not enable anonymous access to the private schema.
9. Run `npm run db:invite -- "Office launch" 50` locally. Register/confirm/join your
   own account, then use `npm run db:admin -- AUTH_USER_UUID` to bootstrap the intended
   operator. There is no automatically promoted first registrant.
10. Complete the post-deployment checklist below before sharing the office invite.

## Release checks

- Landing, signup, sign-in, invalid-password errors, and sign-out work over HTTPS.
- An actual confirmation email arrives and links back to the correct domain.
- Wrong invitations fail; a valid invite assigns a stable nickname.
- Signed-out/nonmember requests cannot read posts or call office mutations.
- Publish/edit/delete a disposable post; add/edit/delete a comment; verify persistence
  after reload and from a second account.
- Change/remove a reaction; cast a poll vote; a second vote cannot be recorded.
- Ordinary users cannot edit another member's content or access reports/admin actions.
- Report, dismiss, and remove a disposable post as the administrator.
- Trigger an actual password recovery email and complete the reset.
- Confirm no test accounts/posts remain and no operator credentials entered a browser
  bundle, deployment logs, Git history, or publicly shared test traces.

## Operational notes

- Keep Supabase backups/retention appropriate for the office; a moderation delete
  removes live application records but does not erase operator backups/logs.
- Auth sessions are verified server-side. Membership/role checks happen on reads and
  mutations; grants and RLS protect direct Data API attempts too.
- Do not add an elevated client as a shortcut for a failing member operation.
- Review migrations before release. Apply schema migrations before deploying source
  that depends on them. There is no automatic production seeding.
- Expected production scale is a small office. No load-test or absolute-anonymity
  claims are made.