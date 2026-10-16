# GhostPost implementation checklist

## Current authorized rollout: clean start (2026-10-16)

The user superseded data preservation, explicitly choosing deletion of application
data AND existing Supabase Auth users/sessions. Google provider settings stay intact.
Moderator identity selection and real-user testing must follow, not happen silently.

- [x] Diagnose missing hosted room schema with read-only checks.
- [x] Obtain migration/reset scope authorization; stop local app during transition.
- [x] Dry-run and apply only 004 with tracked Supabase CLI.
- [x] Remove all app rows and both existing Auth users; verify empty sessions,
  refresh tokens, identities, memberships and roles. No backup/sample accounts.
- [x] Verify RLS, RPC grants, live anonymous PostgREST denial and unchanged Google settings.
- [x] Restart localhost:4318; verify login, signed-out protection and intercepted Google initiation.
- [ ] User selects the first room's intended moderator Google account.
- [ ] Fresh real Google onboarding, first room creation and moderator verification.
- [ ] Real-user room interaction/access tests after moderator selection.
- [ ] GitHub/deployment authorization (still on hold).

Build a lean, persistent private-room social app (supersedes the single office). Preserve the existing
workspace apps. No mock feed fallback, no secret keys in browser code, and no
claim of anonymity from the operator.

- [x] Inspect the repository and agree on an isolated Next.js application.
- [x] Scaffold TypeScript, App Router, Tailwind, accessible components, and lockfile.
- [x] Add versioned Supabase schema, private identity mapping, RLS, and atomic RPCs.
- [x] Add explicit invitation/admin bootstrap and guarded development seed scripts.
- [x] Implement SSR authentication, confirmation/recovery, and office joining.
- [x] Implement persistent paginated Latest/Trending feeds and post ownership actions.
- [x] Implement reactions, comments, polls, and reporting.
- [x] Implement administrator-only moderation.
- [x] Verify business rules and database authorization using real PostgreSQL.
- [x] Run lint, TypeScript, unit tests, browser smoke tests, and production build.
- [x] Document local setup, Supabase configuration, Vercel deployment, and limitations.

## Emoji reactions (focused UI update)

- [x] Replace outline reaction icons with thumbs-up/smile/fire/surprised emoji.
- [x] Add a brief success-only pop, removal/error handling, timer cleanup and reduced-motion support.
- [x] Verify actual component in an isolated browser: keyboard, counts/toggle/change,
  duplicate blocking, animation, failures, 320px fit and accessibility; focused ESLint passed.
- [x] Local whole-app/database regression after private-room migration/harness
  integration: lint/types/build, unit/SQL/public browsers and local room browsers.
  No hosted changes made by either task; real-Google room verification is pending.

## Private rooms migration (current work)

User request: general-purpose private groups instead of one office. Each person
may belong to at most six rooms. Preserve 25 members per room as the existing
capacity default. Each creator is that room's moderator and alone manages its
join key (generate/replace/revoke/renew). Room membership and moderation must be
isolated in PostgreSQL; public identity is a stable pseudonym per room.
Preserve all existing content and identities in a migrated legacy room. Preserve
Google/password login and the current design. No hosted migration, provider
changes, Git upload or deployment is authorized by this local implementation.

- [x] Inspect current SQL, auth, routes, components and regression harness.
- [x] Add a data-preserving room migration, scoped RPCs/RLS and atomic limits.
- [x] Add room hub, create/join/switch/leave and moderator key controls.
- [x] Scope feeds and all interactions to a room; generalize office-specific copy.
- [x] Verify cross-room authorization, key lifecycle, limits, races and regressions.
- [x] Run lint/types/unit/database/browser tests and production build; document gates.
- [x] Obtain explicit authorization and apply 004 to hosted Supabase; later clean-reset instruction supersedes preservation for this project.
- [ ] Verify actual Google/Auth/PostgREST rooms against the upgraded hosted schema.

Local results: 21 unit tests, 37 PostgreSQL tests (22 historical / 15 room),
9 public browser checks (1 skipped), 10 local room-browser workflow groups,
lint/types/build passed. Room browsers use real SQL/RLS with simulated Auth/HTTP,
not hosted Supabase or Google. See PRIVATE_ROOMS.md. Creators cannot leave their
own rooms yet; role transfer, room deletion and banning are outside this scope.

## User-requested editorial UI refresh (supersedes dark/violet style)

- [x] Capture supplied Pinterest-inspired tokens and GhostPost adaptations in DESIGN.md.
- [x] Replace dark/glow styling with cream/black/red, Inter, flat cards and 16/32px geometry.
- [x] Redesign landing, auth overlays, header/mobile drawer, text/poll masonry and filters.
- [x] Restyle composer, comments, poll results, reporting, moderation, loading/error states.
- [x] Preserve existing Auth/actions/SQL, private aliases, member cap and real office data.
- [x] Verify 320/390/768/1440px, keyboard/modal behavior, and automated WCAG A/AA.
- [x] Run design.md lint (0 errors/warnings), lint/types, 21 unit tests, 22 PostgreSQL tests, production build.
- [x] Run real Supabase API/browser regression: 16 passed, 1 skipped; remove all temporary fixtures and confirm original data unchanged.
- [ ] User reviews the visual refresh before resuming private GitHub setup.

The following authentication migration notes are retained; the UI work changes
presentation only. No dependency upgrades or Git/deployment operations occurred.

## Google migration history

Current scope supersedes SMTP-first onboarding for new Google users. Preserve
all accounts, aliases and social functionality; do not upgrade dependencies or
change other apps. No hosted migration, provider dashboard edits, Git operations,
Vercel linking or deployment without explicit authorization for that operation.

- [x] Inspect existing auth/session/join flow and official OAuth/linking guidance.
- [x] Add Google-first login/signup and safe callback routing; retain password sign-in/recovery.
- [x] Add a new SQL migration (never edit applied migrations) with a global 25-member admission lock.
- [x] Test member 25/26, cross-invitation races, idempotent retries, failed-use accounting and existing policies locally.
- [x] Test OAuth initiation/callback contracts and relevant UI/regressions; run lint/types/build.
- [x] Update setup, migration authorization gate, verification and SMTP-secondary documentation.
- [x] Authorized hosted migration application and data-preservation verification; add Google-return redirect while preserving existing Auth settings.
- [x] Google Cloud web OAuth client created (user-reported); Google provider enablement independently verified.
- [ ] Actual Google browser login/linking verification after provider configuration.

Current results: 21 unit/SDK-contract tests, 22 real local PostgreSQL tests,
8 browser checks passed (8 explicitly skipped), lint/types/build passed. Google
is now enabled. The user reached authenticated `/join` and joined successfully;
the confirmed Google-linked member is verified. Repeat-login/linking regression
remains pending; no automated real-Google E2E claim is made.
The user subsequently granted scoped Supabase setup authorization. Migration
202610150003 is now applied and the Google-return redirect verified; existing
application records, password login, and confirmation settings were preserved.
That migration did not mutate users. In a later explicitly authorized bootstrap,
the sole verified joined member was promoted via the existing operator function;
all other data and the nickname were unchanged. The temporary management-token file
was removed; the user must revoke/rotate the chat-shared token. Dependency/lockfile
and old SQL hashes are unchanged. Git/Vercel/deployment remain on hold.
See VERIFICATION.md for test boundaries and DEPLOYMENT.md for remaining Google setup.

## Decisions

- Single office, stable server-generated ghost nickname per account.
- Private profiles hold auth IDs and admin roles; member-visible content exposes
  only nicknames. Ordinary members cannot enumerate mappings or report records.
- PostgreSQL enforces uniqueness, ownership, membership, and moderation permissions.
- Member requests use their own Supabase session, never a service-role client.
- Latest and Trending are bounded server-side queries. Polls have 2-4 options.
- Production never automatically receives development seed data.

## Verification log

The user supplied Supabase configuration during implementation. Credentials were
moved out of the example into the ignored local environment. The database URI was
normalized and a verified-TLS IPv4 session-pooler connection established. Both
migrations were applied through Supabase CLI to an initially empty application schema.

Final regression passed: clean install, lint, typecheck, 10 unit tests, 15 real
PostgreSQL policy/constraint tests, production build, real Supabase Auth/PostgREST,
and 12 browser tests (1 unconfigured-state test intentionally skipped). Accessibility
and mobile layout checks passed. Production audit: zero vulnerabilities. The
development-only upstream lint-tool advisory is documented in VERIFICATION.md.

Temporary test accounts/content/invitations were removed and cleanup verified.
Outbound SMTP/email delivery, Vercel deployment, and the intended operator's
first-admin onboarding remain launch steps, not claimed by token/API tests.

## Production follow-up after secret rotation

- [x] Inspect environment variable consumers without displaying credentials.
- [x] Validate the current local operator key and verified-TLS database access.
- [x] Preserve the already-working local configuration; confirm `0600` permissions,
  blank example secrets, and absence of a stale legacy-key override.
- [x] Re-run lint, types, unit/SQL tests, build, live API/browser tests, and cleanup.
- [x] Add explicit upload exclusions and document sequential release gates.
- [x] SMTP settings saved in Supabase (user-reported; sender/DNS and delivery not independently verified).
- [x] Start GhostPost on free port 4318; update only the non-secret local site URL and verify login page.
- [x] Set matching Supabase Auth Site URL and redirect allowlist; Google callback entry verified.
- [ ] Test real confirmation and recovery emails with correct redirects.
- [x] Verify invitation redemption and explicitly promote the sole confirmed joined account; validate DB admin access and signed-out route protection.
- [x] User screenshot confirms signed-in `/admin` opens with the moderation queue.
- [x] Same-account Google re-login, unchanged nickname, no repeated invitation, and retained admin access (user-reported).
- [x] Read-only GitHub preflight: no Git worktree/Vercel link, secret exclusions present, candidate-source scan clean.
- [ ] User: create an empty private `ghostpost` GitHub repository and share its URL (current manual step).
- [ ] Review a private GitHub repository, staged files, and secret scan before push.
- [ ] Prepare exact production domain, Supabase redirects, and Vercel environment.
- [ ] Deploy only after required settings are ready and the user gives go-ahead.
