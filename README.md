# GhostPost

**say it without saying who you are**

A lean, private-room social app: code-joined groups, room-local ghost nicknames,
pseudonymous posts, reactions, comments, polls, and room moderator controls.
Warm cream/black UI with restrained red actions, responsive layouts, accessible Radix
dialogs/menus, Lucide icons, and no fake feed fallback.

## Current: private rooms (2026-10-16)

**Release destination:** [Dheeraj-Baghel/ghostpost](https://github.com/Dheeraj-Baghel/ghostpost)
is the standalone source repository; the user explicitly chose **public source**.
The dedicated GhostPost project in Vercel workspace `softtech10` has reserved
`https://ghostpost-softtech10.vercel.app`, Node 24 and production-only application
configuration. Personal/non-commercial use on Hobby was confirmed. Deployment is
pending production Supabase callbacks and release verification; a reserved domain
is not yet a working site. See [hosting status and safe updates](DEPLOYMENT.md).

Local verification screenshots, logs, environment files and the one-time reset
script are deliberately excluded from GitHub and Vercel uploads. Screenshot links
below refer to local Designer artifacts, not published private room content.
The user reports the local app works; historical zero-account/room counts below
describe reset time, not the current number of users.

**The single-office onboarding/operator instructions below are retained history;
this section and [the room guide](PRIVATE_ROOMS.md) supersede them.**

- Google sign-in leads to **Your rooms**: join by a moderator's key or create a
  private group. Friends, hobbies, classmates: no office restriction.
- At most **6 active rooms per account**, created rooms included. At most **25
  active members per room**, retaining the earlier capacity as a per-room default.
- Separate feeds, members, Latest/Trending, posts, polls and moderation per room.
- A different stable ghost nickname per room; no public Google identity mapping.
- The creator moderates only their room: generate/replace keys, edit key settings,
  renew or delete/revoke. Keys are hashed and shown once; old keys stop new joins.
- Ordinary members can leave/rejoin; prior content stays and the room nickname
  returns. Creators cannot leave their own rooms yet; transfer/deletion/banning
  are outside this iteration and the limitation is shown before creation.
- Migration 004 supports preserving existing data in Original group, but the user
  subsequently authorized a **clean app + Auth reset**; that group and all old
  data/accounts have now been removed. Legacy global APIs remain revoked and
  room-aware SQL/RLS protects every interaction, not just navigation.

**Hosted schema upgraded; clean start completed (2026-10-16).** After the user's
Google callback reached a room-loading error, read-only diagnosis confirmed that
hosted Supabase lacked 004. The user authorized the migration, then explicitly
changed the request to delete **all app data AND existing Auth users/sessions**,
without preserving data. Migration 004 was applied through tracked Supabase CLI
after a dry run. The reset removed two Auth accounts and all rows in the eleven
application tables; zero rooms/memberships/moderators remain. Google provider
settings, application credentials, GitHub and deployment are unchanged. No backup,
new users, sample content or moderator assignment was made during this reset.

GhostPost is running at **http://localhost:4318/login**. Use that clean URL rather
than the old `?notice=oauth-membership-error` page. Old sessions are gone; a new
Google sign-in creates a fresh Supabase identity. Next: select the intended account
for the first room moderator, then test with real users. Google initiation and
signed-out route protection passed; a new real-Google round trip remains pending.

Verification: 21 unit/SDK tests, 37 PostgreSQL tests (22 historical + 15 current
room tests), lint/types/build, 9 public browser checks (1 configuration-state skip),
and 10 local room-browser workflow groups passed. Room browsers use an isolated
production build and real SQL/RLS but **simulated Auth/HTTP transport**, not Google
or hosted Supabase E2E. See [verification](VERIFICATION.md).

- [Room hub: desktop](artifacts/screenshots/rooms/hub-1440.png)
- [Room hub: mobile](artifacts/screenshots/rooms/hub-390.png)
- [Room feed: mobile](artifacts/screenshots/rooms/feed-390.png)
- [Moderator key controls](artifacts/screenshots/rooms/moderation-1440.png)

Run `npm run test:rooms` for the isolated room browser suite. Follow
[PRIVATE_ROOMS.md](PRIVATE_ROOMS.md) for current status and moderator/test steps.
The local run instructions/Auth variables below remain valid. Do not run historical
`db:invite`, `db:admin`, or `test:live` against the rooms schema.

## Visual refresh — before GitHub

The user's supplied Pinterest design reference replaces the earlier dark/violet
direction. [DESIGN.md](DESIGN.md) captures exact tokens and the GhostPost adaptation:
cream surfaces, black type, #e60023 primary actions, 16/32px corners, no card shadows,
and self-hosted Inter (official [SIL license](public/fonts/OFL.txt)). The live feed
uses natural-height **text/poll** masonry, not photo pins; 1/2/3 columns keep long
posts and reactions readable. No image uploads or fake search were introduced.

The header is compact, filters invert to black, and mobile navigation is a drawer.
Landing-page login/signup opens in an accessible modal over the page; direct auth
routes still work. Composer, comments, polls, reporting and moderation share the
same palette and 44px-or-larger interactive targets. Google Auth/session/membership
logic, 25-member admission, SQL policies and production settings were not changed.

Verification: 21 unit tests, 22 real PostgreSQL tests, 16 live browser checks
(one unconfigured-state test skipped), lint/types/build, automated accessibility,
and design-token lint passed. Temporary live-test fixtures were cleaned up; original
office records matched before/after. Screenshots below show test content only;
real office posts are omitted from capture, not changed in the application.

- [Desktop feed](artifacts/screenshots/feed-1440.png)
- [Mobile feed](artifacts/screenshots/feed-390.png)
- [Signup overlay](artifacts/screenshots/signup-modal-390.png)
- [Mobile composer](artifacts/screenshots/composer-390.png)

GitHub work is paused for design review. Nothing was committed, pushed or deployed.

## Current authentication: Google-first, private invitations, 25 members

**Continue with Google** is primary on `/login` and `/signup`. Supabase handles
Google OAuth using the existing SSR/PKCE session infrastructure. After verified
exchange, existing office members go to `/feed`; authenticated nonmembers go to
`/join`. A private valid invitation plus available capacity is still required.
Google authentication alone grants neither membership nor administrator access.

Google users do not need a GhostPost password, custom SMTP, purchased email
domain, or Supabase organization/dashboard membership for ordinary verified
Google login. No email-domain restriction is imposed by GhostPost. Google account
eligibility/Workspace security policies still apply. A hosted application URL can
be used without purchasing a custom domain; hosting plan eligibility is separate.

Existing password sign-in stays visible as a secondary login option. Optional
email signup is collapsed under **Use email instead**; it and password recovery
still require working email delivery. Old SMTP-first instructions below are
secondary to this Google-first flow, not removed history.

**Status:** code and local tests complete. With the user's explicit Supabase
authorization, the missing Google-return redirect was added and migration
[202610150003_member_limit.sql](supabase/migrations/202610150003_member_limit.sql)
was **applied and verified on hosted Supabase**, preserving existing records.
Google provider enablement is now verified through public Supabase Auth settings;
the local login page is ready, and password sign-in/confirmation remain enabled.
The user reached the authenticated invitation screen after Google sign-in and
successfully joined; a single confirmed Google-linked member was verified. With
explicit authorization, that exact member is now the first administrator. Its
nickname and other data were preserved. Admin database access and signed-out route
protection passed; the user's screenshot confirms the signed-in `/admin` screen
and empty report queue work. The user reports Google re-login preserves the nickname,
skips the invitation and retains admin access. Existing-password/account-linking
regression remains unverified. Private GitHub setup is next; no upload or deployment
has been performed.
The supplied management token's
temporary local copy was removed; rotate/revoke it because it was shared in chat.
See [Google setup and authorization gates](DEPLOYMENT.md#google-first-migration--current-gates).

#### Stable identities and account linking

Profiles continue to map `auth.users.id` privately to a server-generated alias.
No Google name, email, picture or subject becomes a public nickname or appears in
feed/comment payloads. This is pseudonymity to colleagues, not anonymity from
Google, Supabase or the operator. The original email-confirmation SQL check is
retained: trusted `auth.users.email_confirmed_at` must be set. Supabase's OAuth
handler confirms provider-verified emails; user-editable `email_verified` metadata
is never accepted as a substitute. Keep password email confirmation enabled and
Google verification safety checks at their secure defaults.

[Supabase's automatic identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
links matching verified email identities to an existing Auth user. When the Auth
user ID is retained, the private membership and nickname remain unchanged. The
service removes unsafe unconfirmed identities as an account-takeover protection;
do not promise preservation of unconfirmed login identities. Different emails are
not merged by GhostPost. We have added no manual merging/linking, role inference,
or client-email matching. Test a confirmed existing password account with the same
verified Google email before claiming live linking compatibility; also verify that
its password login and nickname still work. No hosted users were modified or deleted
as part of this migration work.

#### Membership cap

The cap is **25 office profiles, administrators included**. Other authenticated
Supabase users do not count until admitted. The new join function preserves all
original invitation/confirmation/alias protections. New admissions acquire locks
in the fixed order **account → office → invitation**, then count profiles and
insert/update invitation usage atomically. Different invitations share the office
lock. A failed join consumes no invitation use and leaves no partial membership.

Existing members return before the cap check, preserving aliases and access even
if a pre-existing office is already above 25. The migration never evicts members.
The error is **This office has reached its 25-member limit**. There is no public
occupancy endpoint, extra configuration table, or member-management feature.
PostgREST's READ COMMITTED transaction mode is supported; new joins explicitly
reject snapshot-isolated transactions rather than risk stale capacity counts.
Direct profile writes remain unavailable to ordinary users. Privileged database
operators must not bypass the join function to create memberships.

## Stack and scope

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4.
- Supabase Auth, PostgreSQL, Row Level Security, and narrow database RPCs.
- Vercel-ready. No ORM, Redis, AI, payments, WebSockets, or uploads.
- Node **24** recommended (`.nvmrc`); dependencies require Node >=22.
- npm dependencies are pinned; use the committed lockfile with `npm ci`.

This is a separate app. Other workspace projects and deployments are not reused.

## Run locally

From this directory:

```sh
npm ci
cp .env.example .env.local  # ONLY on a fresh checkout; do not overwrite existing configuration
npm run dev -- --port 4318
```

Open **http://localhost:4318** (the existing local origin; port 3000 serves another
app). Set these values in the ignored local environment:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public/publishable key; legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted |
| `NEXT_PUBLIC_SITE_URL` | Canonical application origin, currently `http://localhost:4318` |
| `SUPABASE_SECRET_KEY` | Operator/seed/live-test scripts only; legacy `SUPABASE_SERVICE_ROLE_KEY` accepted by bootstrap scripts |
| `SUPABASE_DB_URL` | Operator-only PostgreSQL connection URI for migrations/live-test cleanup |
| `SUPABASE_DB_CA_PATH` | Optional replacement CA certificate path for the migration helper |

**Never put operator keys or database passwords in `NEXT_PUBLIC_*` variables.**
The running web app needs only the first three values. Without public configuration,
auth screens show a setup message and protected routes go to `/setup`; there is no
pretend database. Restart/rebuild after environment changes.

### After rotating a Supabase secret key

Update **only `SUPABASE_SECRET_KEY`** in the ignored `.env.local`. Do not paste the
value into chat, this README, `.env.example`, source, or shell command arguments.
The local file should be owner-readable/writable only (`0600` on macOS/Linux).
Operator, seed, and live-test scripts read this variable at startup; restart any
long-running operator process after a change. The web app never uses this key.

Do not copy the new secret into the public/publishable key, `SUPABASE_DB_URL`, or
`NEXT_PUBLIC_SITE_URL`: these are separate settings. Avoid simultaneously setting
the legacy `SUPABASE_SERVICE_ROLE_KEY` fallback; the current local configuration
has no legacy override. SMTP credentials belong in Supabase Auth's SMTP settings,
not in the application environment. No operator/database/SMTP secret belongs in
Vercel for this app.

**Rotation follow-up, 2026-10-15:** the user reports rotation complete, the current
local operator key validates successfully, and the working local values were
preserved without echoing or needlessly rewriting them. Both migrations remain
installed. The old key's revocation was not independently tested. See the current
production hold and sequential manual gates in [deployment instructions](DEPLOYMENT.md).

## Supabase database setup

Use a **dedicated GhostPost project**. The migrations own the public application
tables/grants and the private identity schema; do not apply them to an unrelated app.

### Hosted project

1. Create a Supabase project and set its public/operator values locally.
2. In **Connect**, copy the PostgreSQL URI. Use the **session pooler on port 5432**
   when your machine cannot reach the IPv6-only direct database endpoint.
3. Replace the whole password placeholder, including its square brackets. URL-encode
   reserved characters in the password (`#`, `@`, `/`, `%`, etc.). Do not leave a raw
   `#` in an unquoted env value: it starts a comment. Pooler usernames include the
   project reference; use the exact username/host shown by Supabase.
4. Download the CA certificate from **Database Settings > SSL Configuration** when
   needed. The public Supabase Root 2021 CA is included in
   [certificate notes](supabase/certs/README.md). TLS verification is not disabled.
5. Only after explicit authorization for the target hosted project, preview and
   apply migrations. **Do not run the apply command during the current hold.**

```sh
npm run db:migrate -- --dry-run
npm run db:migrate
```

The helper invokes Supabase CLI migration tracking with `verify-full`. Alternatively,
use `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, and
`npx supabase db push`, or run these SQL files in order in the SQL editor:

- [Core schema, grants, RLS, membership and mutations](supabase/migrations/202610150001_core.sql)
- [Bounded feed, comments, aggregate and moderation queries](supabase/migrations/202610150002_queries.sql)
- [25-member admission cap — applied to the hosted project with authorization](supabase/migrations/202610150003_member_limit.sql)

Do not expose the `private` schema through the Supabase Data API. No migration or
deployment automatically inserts posts, votes, accounts, or sample activity.

### Fully local Supabase

Install/start Docker Desktop or another compatible Docker runtime, then:

```sh
npx supabase start
npx supabase db reset --local
npx supabase status
```

Copy the local API/public/operator values into the ignored environment file.
The local CLI config enables email confirmation; inspect mail in Inbucket at
**http://localhost:54324**. `db reset --local` is destructive to the local stack;
never aim destructive tests at production.

## Invitations and the first administrator

1. Configure Google OAuth following [deployment setup](DEPLOYMENT.md#google-first-migration--current-gates).
   Email/password setup below is retained for existing password users and optional email signup.
2. Create a high-entropy office invitation explicitly:

```sh
npm run db:invite -- "Office launch" 50
```

The code is shown once, is valid for 30 days, and permits the specified number
of joins. Share it privately. PostgreSQL stores only its SHA-256 hash.

3. Continue with Google at `/signup`, then redeem the invitation
   at `/join`. Invalid, expired, revoked, or exhausted codes never create membership.
   Admission also requires fewer than 25 members after the cap migration is applied.
   Email/password signup instead requires its existing confirmation email flow.
4. In Supabase **Authentication > Users**, copy the exact Auth UUID of the intended
   administrator **after that account has joined**:

```sh
npm run db:admin -- AUTH_USER_UUID
```

Only an explicit privileged operator command promotes that member. The first
registrant is **not** automatically an admin. Signup metadata and client parameters
cannot select a nickname, membership, or role. There is no hardcoded admin password.

Other operator commands:

```sh
npx tsx --env-file=.env.local scripts/operator.ts demote AUTH_USER_UUID
npx tsx --env-file=.env.local scripts/operator.ts revoke INVITATION_UUID
```

### Secondary email/password confirmation and recovery (not required for Google)

Set Supabase **Authentication > URL Configuration > Site URL** to the canonical
application origin. Add these redirect URLs for local development and replace the
origin with the production domain when deployed:

```text
http://localhost:4318/auth/callback
http://localhost:4318/auth/callback?next=/feed
http://localhost:4318/auth/callback?next=/join
http://localhost:4318/auth/callback?next=/reset-password
http://localhost:4318/auth/confirm
```

Default `{{ .ConfirmationURL }}` emails support the PKCE callback flow when opened
in the browser that initiated signup/recovery. For cross-device confirmation, set
the email template links to these token-hash URLs:

```html
<!-- Confirm signup -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/join">Confirm your email</a>
<!-- Reset password -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

Configure custom SMTP for reliable office email delivery. Supabase's default mail
service is restricted/rate-limited; successful Auth API/token tests do **not** prove
email delivery. Test an actual confirmation and recovery email before office launch.
The reset screen requires a verified session and signs out sessions after a change.
Redirect targets are allowlisted; arbitrary external `next` URLs are rejected.

## Secondary email testing mode: Supabase default mail

The user chose to remove Resend and disable custom SMTP; the supplied screenshot
shows the toggle off and a successful settings-save notice. The app already uses
Supabase Auth for email, so no Resend SDK, application SMTP credentials, database
changes, or replacement API key are needed. Existing templates/callbacks remain.

Supabase's built-in mail service is for testing, not general office production:
it sends only to email addresses belonging to the Supabase organization's team
and is documented as limited to **2 emails per hour**. A GhostPost member or invite
does not satisfy that team restriction. Test with your existing Supabase owner/team
email; do not grant coworkers dashboard privileges just to enable email delivery.
Confirmation and recovery both consume limited mail capacity. Avoid repeated
requests, and wait for quota reset if limited. No delivery is claimed until an
actual inbox test succeeds. Google onboarding does not depend on this service.
Do not claim unrestricted email signup/password recovery for an office without
suitable production email delivery; it need not be Resend. This is a secondary
email-flow limitation, not a reason to grant dashboard access to Google users.

References: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Privacy and authorization model

GhostPost is **pseudonymous, not absolutely anonymous**. Your colleagues see a
server-generated stable nickname such as `chai-phantom-1a2b3c4d`; the random suffix
prevents name collisions. The operator can access account information for moderation.
Do not publish personal details in post text.

- Nine application tables: private profiles/invitations; public posts, comments,
  reactions, polls, options, votes, and reports.
- Private profiles alone map Auth UUIDs to aliases/admin roles. Ordinary members
  cannot select/update them, including through the Data API.
- Posts/comments contain nicknames, not auth UUIDs or emails. Feed/comment RPCs
  return only public content, counts, and the caller's own interaction/ownership flags.
- RLS defaults to deny. Members can read office content, and only their own raw
  reaction/vote records. Reports require admin RLS; reporter UUID columns are not
  granted even to the admin table API.
- Direct member table writes are revoked. Narrow security-definer RPCs perform
  explicit membership, ownership, and admin checks based on `auth.uid()`; no RPC
  accepts a caller-supplied author/user ID. Operator-only functions are separately
  granted solely to `service_role`. All definers have fixed empty search paths.
- Definers intentionally bypass table RLS for atomic writes/hidden aggregates;
  their internal checks and execute grants are therefore security-critical and tested.
- Server Actions re-verify session/membership/admin roles too. Proxy refreshes cookies;
  authentication is never trusted from `getSession()`. Personalized responses are
  `private, no-store`; clients are request-scoped.

## Product rules

- Posts: 1-1,000 trimmed characters; comments: 1-500. Plain text only, no HTML rendering.
- Categories: Confession, Hot Take, Funny, Question, General.
- Like/Laugh/Fire/Shocked: one reaction per member/post, changeable or removable.
- Polls: 2-4 distinct options, each 1-120 characters; one vote per member/poll.
  Options are immutable once published; the question locks after the first vote.
  Aggregate totals/percentages appear only after the caller votes.
- Poll creation is atomic; vote/edit locks prevent a voted-on question being rewritten.
- Report reasons: Spam, Harassment, Inappropriate content, Other. One report per
  member/post. Admin dismissal leaves the post; removal deletes its dependent records.
- Post/comment edits/deletes require ownership. Deletion has a confirmation dialog.
- Pages contain at most 20 posts/comments/reports, with a 21st-row has-more probe.
- Latest sorts by creation time then ID. Trending is computed in PostgreSQL:

```text
score = (1 + R7 + 2*C7) / (max(ageHours, 0) + 2)^1.2
```

`R7` is current reactions added/changed in seven days; `C7` is extant comments
created in seven days. Ties use creation time then ID. Only the selected posts are
hydrated. Offset pagination is deliberately simple; live activity may move rankings
between pages. The implementation targets a small office, not a global social network.

## Development seed

Set `GHOSTPOST_SEED_EMAIL` and `GHOSTPOST_SEED_PASSWORD` for a **new disposable local
account**. With local Supabase running:

```sh
npm run db:seed
```

This explicitly creates four `[DEVELOPMENT SAMPLE]` posts (one poll). No fake
reactions/votes/comments are added. The script refuses hosted URLs, production mode,
and Vercel. It is never a build step and never silently reuses an existing account.

## Tests

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npm run test:e2e
```

- Unit tests cover validation, redirects, errors, limits, and trending.
- Database tests start a disposable **real PostgreSQL 17** instance and run the
  actual migrations. Only Supabase's Auth schema/roles/`auth.uid()` accessor are
  supplied by the harness. No Docker/hosted credentials are needed. Tests cover
  ownership, grants/RLS, private mappings, invitation races, reaction/vote uniqueness,
  cross-poll options, reporting/moderation, cascades, pagination, and vote/edit races.
- Playwright starts **this app** on port **4317** and refuses to reuse another
  process on that port. Uses installed Chrome on macOS, otherwise install Chromium
  with `npx playwright install chromium`. Public smoke tests include Axe WCAG A/AA,
  keyboard navigation, private cache headers, and desktop/mobile overflow checks.
- Live browser tests need test member/admin credentials and `GHOSTPOST_E2E=1`.
  Without those, they are explicitly skipped rather than replaced by mocks.

To create short-lived fixtures, exercise actual Supabase Auth/PostgREST, run the
signed-in browser suite, and clean up:

```sh
npm run build
npm run test:live -- --allow-project-tests
```

Run this only against the dedicated GhostPost test project. It creates random,
clearly identified temporary users and content, then removes them in `finally`.
Auth signup/recovery **tokens are generated through the admin API**, avoiding email
delivery; token verification, sign-in, cookies, joining, recovery, and application
requests use the real Auth service. This is not a test of outbound SMTP. If the process
is forcibly killed, inspect `ghostpost-test-*` Auth accounts and `LIVE TEST` invitation
records and remove only those test fixtures. Traces may contain temporary credentials;
keep ignored test reports private.

Read [verification notes](VERIFICATION.md) for the final results and limitations.
See [the implementation checklist](IMPLEMENTATION_PLAN.md) and
[Vercel deployment instructions](DEPLOYMENT.md).

### Dependency note

The production dependency audit is separate from development-tool auditing.
Next's current lint preset requires ESLint 9 for its React/import plugin peers;
ESLint 10 was tested and rejected due to invalid peer dependencies. npm currently
flags a dev-only upstream `braces` advisory through Next's lint plugin/fast-glob;
no patched compatible `braces` release was available during implementation.
Do not use `npm audit fix --force` to downgrade Next's lint preset across majors.
Monitor the upstream fix. The affected glob parser does not handle web requests.