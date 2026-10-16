# GhostPost verification

## GitHub/Vercel release preflight (2026-10-16)

- User explicitly selected public repository `Dheeraj-Baghel/ghostpost` and personal,
  non-commercial hosting on Vercel `softtech10` Hobby. Remote was verified empty.
- Browser GitHub/Vercel authentication succeeded. The PAT disclosed in chat was
  not used or stored by this release workflow; the user was instructed to revoke it.
- Actual staged files scanned against known local operator/database secrets and
  credential patterns: **zero findings**. Environment, screenshots/reports, keys,
  logs and the one-time reset script are excluded from publication.
- Fresh `npm run check`: lint, TypeScript, **21 unit tests**, **37 PostgreSQL tests**
  and production build passed. Supabase data/schema/provider settings unchanged.
- A dedicated Vercel project and verified hostname are reserved with Node 24 and
  the three Production-only public variables. No preview receives production data.
- Hosted release and actual production Google login are pending the URL-configuration
  step documented in [deployment instructions](DEPLOYMENT.md). Reservation and a
  local build do not imply a working deployed site.

## Current: authorized hosted clean start (2026-10-16)

The user reported `oauth-membership-error`. Screenshot plus callback code shows
that Auth verification succeeded before room lookup. A read-only verified-TLS
check confirmed only 001-003 existed and `private.rooms`, room memberships and
`public.my_rooms()` were absent. The user approved migration, then explicitly
superseded preservation with **all app data AND Auth account/session deletion**.
No backup was made; the unused backup helper was removed before execution.

- Fresh preflight: all **37 local PostgreSQL tests passed**.
- Target checked: dedicated GhostPost project `wruqjadlbrenozglxpnt`.
- App on port 4318 stopped; CLI dry-run listed only 004; tracked apply succeeded.
- User-authorized reset: **2 Auth users deleted** through the Admin API. Readback:
  **0 users, 0 identities, 0 sessions, 0 refresh tokens**.
- All **11 application tables empty**: no rooms, memberships, roles, invitations,
  posts, replies, reactions, polls, options, votes or reports. No real test users
  created and no moderator assigned. Storage was empty before deletion.
- Public Auth settings match before/after, with Google enabled. No Google/client
  secret, provider, redirect, environment or deployment configuration changed.
- All 11 tables still have RLS; authenticated `my_rooms` execute allowed; anonymous
  execute denied; legacy global feed RPC denied; ordinary private-membership reads
  and direct post writes denied.
- Live PostgREST `my_rooms` call as anonymous returned **401 / 42501**, not a missing
  function response. This proves route presence/denial, not signed-in workflows.
- App restarted. Browser checks against localhost:4318: room hub, room feed and
  room moderation redirect to login while signed out; clean login renders; Google
  initiation includes PKCE/S256, intercepted before the provider. No account was
  created and no new real Google round trip is claimed. No hydration errors.
- Operator script TypeScript and focused lint passed. See the narrowly guarded
  [one-time reset script](scripts/reset-room-version.ts); never rerun without new
  explicit destructive authorization. It is not part of migration/build/seed.

Next: user selects the first room's moderator account, then actual Google and
real-user room tests. GitHub, Vercel and deployment remain on hold. Old screenshots
show fixtures or history, not retained content in the now-empty hosted app.

## Latest: private rooms (2026-10-16)

See [room scope and upgrade boundaries](PRIVATE_ROOMS.md). The following records
the local implementation phase before the authorized hosted clean start above.
These tests alone do not establish real Google or hosted signed-in integration.

- Lint, TypeScript and production build: passed.
- Unit/SDK contracts: **21 passed**, including room-aware callback routing, verified
  sessions and safe destinations. SDK Google/password transports are mocked.
- Real disposable PostgreSQL: **37 passed**. 22 preserve 001-003 historical
  contracts; 15 apply all migrations with legacy fixtures and verify preservation,
  RLS/grants, cross-room reads/writes, every key operation, lifecycle, concurrent
  six-room/25-member caps, idempotency, rollback, poll locks/uniqueness, ownership,
  pagination, forged metadata, snapshot-isolation refusal and Auth-delete cascades.
- Public Playwright: **9 passed, 1 skipped**. Signed-out room protection, intercepted
  Google initiation, callback errors, responsive/auth keyboard checks and Axe.
  The final full `npm run test:e2e` run reports **9 passed, 8 skipped**: the same
  configuration-state skip plus seven explicitly historical office-only cases.
- The focused emoji-reaction browser suite was rerun after room integration and
  passed; its server actions are stubbed. No existing emoji behavior was removed.
- `npm run test:rooms`: **10 workflow groups passed**, isolated production build,
  real pages/Server Actions/Supabase SSR and PostgreSQL migrations/RLS, but
  **simulated Auth and RPC HTTP transport, not GoTrue/PostgREST/Google**. Tests
  create/join, keys, old-code rejection, outsider denial, scoped moderator access,
  posts/comments/reactions, polls/votes, reports/dismissal, independent room scenes,
  desktop/mobile switching, leave/access revocation, hydration and loaded-page Axe.

Source: [room SQL tests](tests/database/rooms.test.ts),
[local browser runner](tests/room-browser-smoke.ts),
[workflow results](artifacts/screenshots/rooms/verification.json).
Temporary local databases/accounts are discarded; no hosted fixture was created.

- [Desktop hub](artifacts/screenshots/rooms/hub-1440.png)
- [Mobile hub](artifacts/screenshots/rooms/hub-390.png)
- [Desktop feed](artifacts/screenshots/rooms/feed-1440.png)
- [Mobile feed](artifacts/screenshots/rooms/feed-390.png)
- [Moderator controls](artifacts/screenshots/rooms/moderation-1440.png)

Screenshots contain disposable local fixtures and unusable test keys only. The
initial dev-build browser run exceeded timing budgets; the final runner uses an
isolated production build and waits for streamed content before screenshots/Axe.
The expanded final run passed. Real environment/provider/hosted data are untouched.
No dependency version or lockfile changes. Existing emoji reactions are preserved.
The historical SQL-fixture failure noted by the concurrent emoji task below is
resolved by explicitly separating old-schema regression from current room tests,
not by weakening grants. Current local full-suite results are those above.

## Emoji reaction update (2026-10-16)

Replaced reaction outline icons with native emoji and a small success-only
pop/bounce. Existing reaction keys, counts, toggle/change behavior and backend
rules are unchanged by this update. Reduced motion disables animation; the popup
is decorative/aria-hidden and pointer-events:none, with cleanup on timer/unmount.

Focused validation: `npx tsx tests/ui/emoji-reactions.ts` passed using the actual
PostCard and CSS in a browser, with explicitly stubbed server actions. It checks
glyphs, 44px targets, animation events/cleanup, switching/removing, Enter activation,
duplicate-submit prevention, reduced motion, failed-save handling, 320px overflow
and Axe A/AA checks. The [animation capture](artifacts/screenshots/emoji-reaction-pop.png)
shows only a labelled local test fixture; no real office content or credentials.
Focused ESLint for the modified component/tests passed. No dependencies, hosted
data, schema, or auth settings were changed for this feature.

**Broader verification boundary:** the separate private-room migration was being
edited concurrently. The legacy SQL suite stopped during fixture setup because
`operator_create_invite` was no longer executable. An intermediate build/typecheck
also encountered room-signature/test-harness errors outside this reaction change;
**the final production build passed** after that concurrent work progressed. The
SQL fixture failure was not bypassed by weakening grants and the legacy SQL suite
was not reverified by the emoji task. The existing live regression was extended
with emoji assertions but not run against hosted data in this update. Do not read
the older full-suite passes below as fresh live-room regression evidence.

## Latest: editorial UI refresh (2026-10-15)

The user replaced the original dark/violet design direction with a Pinterest-style
cream/black/red system. The adaptation is implemented in [DESIGN.md](DESIGN.md):
flat 16px cards, 32px modals, pill controls, restrained #e60023 primary actions,
self-hosted Inter, natural-height text/poll columns, compact navigation, mobile
drawer, and marketing auth overlays. No Pinterest branding, photo-upload features
or fake live feed were introduced. The older visual descriptions below are history.

### Fresh results

- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `npm test`: 21 passed.
- `npm run test:db`: 22 passed in real local PostgreSQL, including privacy,
  ownership, moderation, reaction/poll uniqueness and the 25-member race checks.
- `npx --yes @google/design.md@0.4.0 lint DESIGN.md`: 0 errors, 0 warnings.
  Tool run via npm cache; not added to project dependencies.
- `npm run test:live -- --allow-project-tests`: real Supabase API checks passed;
  final Playwright run **16 passed, 1 skipped** (unconfigured-state test).
- Four viewports: 320, 390, 768 and 1440px. No horizontal overflow in public/auth/feed.
- Axe WCAG A/AA on public pages, auth overlay, signed-in feed, poll composer and
  moderation queue; all checked views passed.
- Auth overlay Escape/focus return; mobile navigation open/close; composer type,
  option add/remove and scroll access to submit; live post/comment CRUD, reaction
  changes, polls, reports, admin dismissal/removal, password recovery and session
  protection all passed. Google initiation is intercepted before the provider;
  this UI run does not claim a new actual Google authorization test.

### Preservation and screenshots

The existing test harness created random temporary accounts and clearly labelled
test posts/polls; all were removed afterward. Before/after fingerprints of all
nine original application tables matched, preserving the real member's alias,
administrator status, posts and interactions. No temporary test Auth users remain.
No schema/Auth policy/provider configuration changed. No GitHub or deployment action.

Screenshots are from real rendered components and real temporary Supabase records.
Real office posts/reports are hidden **only for screenshot capture** to avoid
archiving employee content; the actual app, assertions, and accessibility checks
use the normal data. The capture-only filtering is not an application feature.

- [Landing](artifacts/screenshots/landing-1440.png)
- [Desktop feed](artifacts/screenshots/feed-1440.png)
- [Mobile feed](artifacts/screenshots/feed-390.png)
- [Signup mobile overlay](artifacts/screenshots/signup-modal-390.png)
- [Composer mobile sheet](artifacts/screenshots/composer-390.png)
- [Moderation](artifacts/screenshots/moderation-1440.png)

The official Inter font and SIL license are bundled under the font assets. The
system-font fallback remains. No package version or dependency changes were made.

## Latest: targeted Google-first auth and 25-member limit (2026-10-15)

### Subsequent real onboarding and authorized first administrator

Google enablement was independently verified through public Auth settings. The
user reached `/join` in an incognito browser, then reported successful use of the
app. Before promotion, safe read-only checks found exactly one Auth account and
one joined member, confirmed and Google-linked. The initial single-use invitation
hash matched the private local record, was consumed once, and the join time fell
within its validity window. This is real onboarding evidence, not an automated
Google E2E or a completed repeat-login/password-linking regression test.

On explicit user authorization, that exact member was promoted using the existing
`operator_set_admin` function as `service_role`. Permission checks in PostgreSQL:

- Before promotion: report access denied and member self-promotion denied.
- After promotion: authenticated membership returned admin=true and the report
  queue read succeeded; a nonmember remained denied.
- Nickname and join date were unchanged. Before/after row fingerprints matched for
  all other application tables and Auth users/identities. No fake account or report
  was inserted. Final counts: one member, one administrator.
- A fresh signed-out browser visiting `/admin` reached the GhostPost login screen.
- Consumed invitation plaintext was removed locally; the usage record remains.

The user's signed-in admin page is now screenshot-verified. The user subsequently
reported successful same-account Google re-login with the same nickname, no
invitation prompt and retained administrator access. This completes that manual
re-login check; it does not verify the secondary password login/account-linking
regression. No source code or security policy was weakened and no deployment
occurred. Older verification below is retained as history and should not be read
as the current onboarding status.

Read-only GitHub readiness inspection found no app Git worktree or Vercel linkage.
Known local-secret/key-pattern scanning found zero matches in candidate text source;
env/test/log/private-key exclusions are present, and temporary invitation/management
files are absent. GitHub CLI is unavailable. No repository was initialized and no
files were staged, committed or uploaded. A later push requires owner/target
confirmation, explicit authorization and an actual staged-file secret review.

This is a focused update, not a rebuild. Dependencies and lockfile are unchanged.
The original two migration files match their prior SHA-256 hashes. Feed, posts,
comments, reactions, polls, reports and moderation implementation files are
unchanged. Existing password sign-in and recovery remain available.

### Current automated results

**Authorized hosted follow-up:** the user supplied management access and authorized
GhostPost Supabase configuration. Added the missing `?next=/feed` redirect and
verified it by readback, preserving all prior redirects and password/confirmation
settings. Applied only migration `202610150003` after its dry run. Read-only
before/after fingerprints matched for all nine application tables and the existing
Auth account ID/confirmation/creation fields (1 account, no office members/admins).
No account/role mutations or fixture creation were performed on the hosted project.
The live function contains the office lock and cap, uses the fixed empty search
path, allows authenticated execute but denies anon; all nine tables still have RLS.
All automated checks below were rerun successfully after setup.

Google is still disabled because both client ID and client secret are absent in
the project's Auth configuration. A Supabase management token cannot create the
Google Cloud client. The temporary management-token file was deleted; revoke/rotate
the token shared in chat. A fresh browser-bundle scan found zero occurrences of
the management token, operator secret, or database password. No deployment occurred.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no warnings |
| `npm run typecheck` | Passed |
| `npm test` | **21 passed** (existing rules plus OAuth/routing/SDK contracts) |
| `npm run test:db` | **22 passed**, actual disposable PostgreSQL 17 |
| `npm run build` | Passed |
| `GHOSTPOST_E2E=0 npm run test:e2e` | **8 passed, 8 skipped**, no failed tests |
| `npm audit --omit=dev` | Zero vulnerabilities |
| Browser-bundle operator/database-secret scan | Zero matches; example credentials blank |
| Local app origin | Preserved: `http://localhost:4318` |
| Read-only hosted provider check | Google **disabled**; email enabled and confirmation required |

**No real Google OAuth end-to-end result is claimed.** The focused browser test
executes the real local Server Action, inspects the Supabase Google authorize URL,
and aborts navigation before contacting the provider. It checks Google/scopes,
allowlisted callback, PKCE challenge/verifier cookie, and auth UI. Cancellation and
missing-code tests use the real local callback route. SDK exchange/password tests
use the actual Supabase SSR library with an explicitly mocked in-memory transport;
they demonstrate cookie and routing contracts, not provider acceptance.

The eight skips are seven existing opt-in hosted/member browser workflows plus
the unconfigured-state test (public Supabase configuration is present). The hosted
member suite was deliberately not run: it provisions/deletes hosted test users;
this setup verification used local tests and non-mutating hosted checks to preserve
the real account. Earlier real password/social browser verification is historical
evidence, not re-labelled as a new OAuth pass.

### Cap and privacy evidence

The local SQL suite includes all 15 original policy/social regression tests plus:

- Member 25 admitted; member 26 rejected through another valid invitation.
- Six concurrent last-place requests across separate invitations admit one member;
  only one invitation use is consumed, with no partial profiles.
- Same-account concurrent redemption remains idempotent and keeps one alias.
- Invalid/expired/revoked/exhausted invites remain invalid even at full capacity.
- More than 25 Auth accounts do not consume office places until membership exists.
- Unconfirmed password accounts cannot claim verification/admin status via metadata.
- A trusted confirmed-account fixture containing Google-like identity metadata
  receives a random alias; public payloads expose none of that identity data.
  This is a SQL contract fixture, not evidence from a real Google provider.
- Applying the function replacement to a simulated 26-member office preserves all
  memberships/aliases/roles/content, blocks new admissions and permits existing retries.
- Snapshot-isolated new joins fail closed instead of using a stale capacity count.

The new function uses account → office → invitation lock ordering and performs
count/admission/usage in one transaction. Profile writes/grants, private mappings,
fixed definer search paths and explicit bootstrap remain protected. Callback tests
verify cancellation, missing/duplicate/expired codes, exchange failures, verified
session before membership lookup, nonmember routing, administrator checks and
external-redirect rejection. No Google metadata drives roles or public identity.

### Files changed and purpose

- [Auth actions](src/app/actions/auth.ts), [OAuth helpers](src/lib/oauth.ts),
  [callback](src/app/auth/callback/route.ts), [login page](src/app/(auth)/login/page.tsx):
  Google PKCE initiation, safe callback completion and member-aware destinations.
- [Auth form](src/components/auth-form.tsx): Google-first actions, secondary password
  access, optional email signup and pending/error states; no social UI redesign.
- [Errors](src/lib/errors.ts): exact friendly 25-member rejection.
- [Next configuration](next.config.ts): callback no-referrer/no-store headers and
  suppression of token-bearing auth callback request logging in development.
- [New SQL migration](supabase/migrations/202610150003_member_limit.sql): admission cap
  without altering previously applied SQL or deleting data.
- [Local Supabase config](supabase/config.toml), [environment example](.env.example):
  existing local origin and safe comments; no Google-secret app variable added.
- [OAuth unit tests](tests/unit/oauth.test.ts), [SQL tests](tests/database/policies.test.ts),
  [Google browser contracts](tests/e2e/google.spec.ts), [public tests](tests/e2e/public.spec.ts):
  extend existing tests without replacing the social/policy regressions.
- [README](README.md), [deployment guide](DEPLOYMENT.md), [implementation checklist](IMPLEMENTATION_PLAN.md):
  Google setup, linking caveats, cap semantics, pending authorization and preserved history.

### Explicitly pending

1. Google Cloud External/basic-identity web client and Supabase Google provider setup.
2. Copy the exact Supabase `/auth/v1/callback` into the Google client (different
   redirect leg). The application's `?next=/feed` Supabase allowlist entry is complete.
3. Hosted migration `202610150003`: **completed with explicit authorization**;
   no longer a pending gate. Google provider setup remains the blocker.
4. Actual Google browser login/cancellation/relogin, trusted email confirmation,
   private invite joining, and same-email linking to a confirmed password account.
   Supabase's automatic linking is documented, not manually reimplemented or verified live.
5. Explicit first-admin selection/bootstrap and separate GitHub/Vercel/production
   authorization. **Nothing was deployed, linked or pushed.** Only the authorized
   Supabase redirect configuration and membership-cap migration were changed.

Secondary email/signup/recovery still depend on email delivery; the user previously
reported receiving a default-mail confirmation. Google onboarding does not require
SMTP or purchasing an email domain. Hosting plan eligibility remains separate.

## Historical MVP verification (before the Google/cap migration)

Verified on **2026-10-15**. Application code and Supabase schema are implemented;
this report separates local checks, real hosted integration, and remaining launch work.

## Passed

| Check | Result |
| --- | --- |
| Clean dependency installation | `npm ci --prefer-offline --no-audit` succeeded |
| Lint | `npm run lint` passed, no warnings/errors |
| TypeScript / route types | `npm run typecheck` passed |
| Unit tests | 10 passed |
| Real PostgreSQL 17 authorization/constraint tests | 15 passed |
| Production build | `npm run build` passed; all application routes generated |
| Production dependency audit | `npm audit --omit=dev`: 0 vulnerabilities |
| Hosted migrations | Both versioned migrations applied through Supabase CLI |
| Real Supabase Auth/PostgREST checks | Passed; no mock Auth or fake data adapter |
| Browser suite against the production build and hosted Supabase | 12 passed; 1 intentionally skipped |
| Desktop/mobile layout | 1440 and 390 px inspected; no horizontal overflow |
| Automated accessibility | Axe WCAG 2 A/AA + 2.1 A/AA passed on landing/auth/setup and signed-in desktop/mobile feed |
| Browser-bundle secret scan | No operator secret or database password matches |
| Cleanup | 0 temporary test Auth users, test posts, or test invitations remain |

### Database tests

The harness starts actual PostgreSQL 17 and executes the shipped SQL migrations.
Supabase-specific Auth tables/roles and `auth.uid()` are supplied locally; the
constraints, grants, RLS and PL/pgSQL functions are real, not mocks.

Coverage includes anonymous/nonmember denial, private mapping/invitation protection,
server-assigned stable aliases, role/author spoof prevention, owner-only edits and
deletes, reaction uniqueness/change/removal, comment ownership, atomic polls,
vote uniqueness, cross-poll option rejection, hidden pre-vote results, reporting,
admin-only moderation, cascading deletion, bounded pagination, trending ordering,
expired/revoked/exhausted invitations, concurrent redemption, and concurrent
vote-versus-question-edit serialization.

### Hosted integration and browser tests

The user supplied the dedicated Supabase configuration during implementation.
The initially empty application schema was migrated over verified TLS using the
IPv4 session pooler. Supabase reports PostgreSQL 17.11.

Temporary test users were created with generated signup tokens through the real
Supabase admin Auth API, then confirmed through the real token verification API.
Member actions used their own sessions/public client, not elevated database access.
Tests exercised real PostgREST, RLS, mutation RPCs, and persistence.

The final Playwright run passed:

1. Sign-in, post creation, persistence after reload, edit/delete, changing reactions,
   comment creation/edit/delete with confirmation, reporting, nonadmin denial, sign-out.
2. Poll creation/voting, persistence, and question locking after votes.
3. Administrator-only report queue access.
4. Nonmember routing, invalid invitation rejection, valid office joining, persisted session.
5. Real recovery-token callback, password update, global sign-out, and new-password sign-in.
6. Real responsive feed, accessibility, Latest/Trending navigation and category filters.
7. Administrator dismissal and removal of reported posts, with deletion verified.
8. Landing/auth navigation without hydration errors.
9. Anonymous protection for office/moderation/recovery routes and no-store auth responses.
10. Public desktop/mobile overflow and screenshots.
11. Keyboard navigation and skip link.
12. Public/auth/setup automated WCAG A/AA checks.

The unconfigured-state test was intentionally skipped in this configured run; it
passed in the earlier no-configuration run. This is not presented as 13/13 passing.

Screenshots show explicitly labeled temporary test records, not real employee
content. Those records have been removed from Supabase:

- [Landing](artifacts/screenshots/landing-1440.png)
- [Desktop feed](artifacts/screenshots/feed-1440.png)
- [Mobile feed](artifacts/screenshots/feed-390.png)

## Not yet verified / remaining launch work

- **SMTP delivery and actual signup/recovery emails.** Token-based Auth and recovery
  flows passed, but generated admin tokens bypassed outbound mail. Configure Supabase
  templates/redirects/custom SMTP and test a real inbox before office launch.
- **The intended first administrator.** Temporary test administrators were removed.
  Register/confirm/join the operator's real account and explicitly promote its Auth UUID.
- **Vercel deployment.** No GhostPost deployment or production URL was created.
  Follow [deployment instructions](DEPLOYMENT.md); no other app's Vercel project was changed.
- **Secret rotation.** The operator key was initially entered in the example file.
  It was moved to the ignored, owner-readable local environment, and the example is
  blank again. Rotate the key before production; no secret value is reproduced here.
- No SMTP/load-test/absolute-anonymity claims. Local Docker-based Supabase/seed execution
  was not run because no Docker runtime was available; real hosted integration and
  embedded PostgreSQL were tested instead.

## Dependency caveat

The full audit reports **5 high-severity development dependency entries** caused
by the same upstream `braces` recursion/DoS advisory through `micromatch`, `fast-glob`,
and Next's ESLint plugin/preset (GHSA-vfj7-8cjw-p6xm). The installed compatible upstream
versions have no patched release available in the registry at verification time.
It is a development glob-parser issue, not a production request path. The production
audit is clean. ESLint 9 is retained for plugin-peer compatibility; ESLint 10 produced
invalid peers. Monitor upstream updates rather than force an unrelated Next downgrade.