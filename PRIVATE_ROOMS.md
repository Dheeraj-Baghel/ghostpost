# GhostPost private rooms

## Current status and scope

The current source generalizes GhostPost from one office into private groups for
friends, hobbies, classmates, or other communities. Existing Next.js, Supabase
SSR/PKCE, UI tokens, posts, polls, comments, reactions and reporting are reused.
No dependency upgrades, new providers, WebSockets, uploads or unrelated features.

**Hosted migration 004 applied and clean reset completed with explicit authorization
(2026-10-16). No public deployment.** The room-loading failure after Google login
was the old 001-003 hosted schema, not a Google credential/domain problem. After
approving the upgrade, the user chose to discard all app data and Auth accounts
rather than preserve the old office. Migration 004 was dry-run/applied once through
Supabase CLI; all app rows (including Original group) and the two existing Auth
users/identities/sessions/refresh tokens were then removed. Google configuration
and app credentials stayed unchanged. No backup or test users were created.

Current state: zero rooms, zero memberships, zero moderators. The app is running
at http://localhost:4318/login. Old sessions no longer work; sign in afresh with
the account selected for the first room moderator. Selection and actual real-user
room testing are pending. Creating a room grants moderation only for that room;
there is no automatic global first-user administrator.

The preservation/upgrade procedure below describes the reusable migration, not
this user's subsequent authorized deletion. Do not rerun the reset or reinterpret
the earlier data-preservation notes as a backup of the deleted content.

## User journey

1. Sign in with Google (existing password sign-in/recovery remain available).
2. Arrive at **Your rooms**, including when the account has no memberships.
3. Join by pasting the complete private room key, or create a room with a name.
4. The creator becomes the moderator of that room only. Open **Manage** to
   generate a key and share it privately.
5. Enter a room for its own Latest/Trending feed, posts, polls and comments.
6. Switch rooms through My rooms or the desktop/mobile room selector.
7. An ordinary member can leave with confirmation to free a membership slot.

A key is needed to join, not on every login. Authentication does not grant access
to an existing room. There is no public directory, email-domain restriction or
Supabase dashboard invitation requirement for Google users.

### Limits and identity

- At most **six active memberships per account**, including created rooms and the
  migrated Original group. This is a simultaneous membership cap, not a claim to
  detect one human using multiple Google accounts.
- At most **25 active members per room**, moderators included. This preserves the
  earlier capacity choice as a per-room default; it is not a global 25-account cap.
- A different server-generated ghost nickname in each room, stable across login
  and leave/rejoin. Nicknames do not use Google names, emails or photos.
- Leaving makes membership inactive immediately. Prior posts/comments remain;
  rejoining requires a valid key and available room/account capacity.
- No role transfer, promotion UI, room deletion, user banning or account deletion
  UI in this iteration. Creators cannot leave their own rooms, preventing an
  orphaned moderator role through the normal UI. This limitation is displayed
  before creation. A future lifecycle change should explicitly address transfer,
  retirement and privileged deletion of the last moderator's Auth account.
- A pre-existing room above 25 is preserved; no eviction occurs during migration.
- Pseudonymous to group members, not anonymous to Google, Supabase or the operator.
  Distinct aliases reduce automatic cross-room linking, but self-disclosure,
  writing style or recognizable content can still identify someone.

## Moderator key controls

Only this room's moderator can load key metadata or call key-management RPCs.
A moderator in another room, a global legacy admin, or an ordinary member cannot.
The legacy room retains its existing administrators as its moderators; new rooms
start with one creator-moderator. No client parameter chooses a role.

- **Generate key:** a random 32-character hexadecimal code, shown once.
- **Replace key:** generates a new code and immediately revokes all prior room keys.
- **Save key settings:** edits the label and validity period (1-90 days from now).
- **Renew key:** extends validity of the current non-revoked key, including an
  expired key. A revoked key cannot be resurrected; generate a new one instead.
- **Delete key:** revokes all current room keys, disabling new joins. This is
  revocation, not deletion of invitation accounting or of the room.
- Existing members stay after expiry, replacement or deletion of a key.

Raw codes are generated in PostgreSQL using `gen_random_uuid`, stripped of
hyphens, and stored only as SHA-256 hashes. The plaintext is returned once to the
moderator and held only in the current UI state. It is never placed in URLs,
localStorage or application logs. Lost keys are replaced, not retrieved. There
is deliberately no user-chosen weak password/custom-code field. Editing the code
itself means generating a secure replacement.

Keep keys private: anyone with a valid key and a confirmed account can join while
capacity remains. Revocation is not a way to remove someone already admitted.
The backend retains invitation usage accounting and supports preserved legacy
invitations; generating/replacing a key invalidates all those older keys.

## Database and authorization

### Data preservation

The new transactional migration:

- Adds private rooms and private room memberships (11 RLS-enabled application
  tables in total, versus the original nine).
- Creates **Original group**, ID `00000000-0000-4000-8000-000000000001`.
- Copies every original member's alias, join date and admin role into that room.
- Assigns all existing posts and invitations to Original group. Existing content
  IDs and interaction rows are retained; old post URLs redirect to that room.
- Keeps original private profiles as internal account records for existing
  interaction foreign keys. Its old alias/admin fields are no longer the new
  public identity or a cross-room authorization source.
- Replaces public read policies with room-aware policies and revokes the old
  global read/mutation/bootstrap RPCs to eliminate cross-room back doors.
- Adds explicit room-scoped RPCs. Every mutation checks the authenticated actor,
  membership, object-to-room relationship, ownership and/or moderator role.
- Preserves narrow column grants: moderators do not receive reporter account IDs
  or account-to-alias mappings. All ordinary direct writes remain revoked.
- Preserves privileged Auth-deletion cascades for content; ordinary leaving is
  non-destructive because membership rows are retained as inactive.

No historical migration was edited. Global legacy APIs intentionally stop working
after 004: the old application and old operator/live scripts are not compatible
with this schema. Never mix the old application with the new database.

### Atomic admission and key changes

Create/join/leave acquire an account advisory lock; join/leave then lock the room
row. Join re-reads and locks the hashed invitation after acquiring the room lock.
Key changes use the same room lock. The account cap and room cap are checked inside
the transaction, so different keys, concurrent room creation and joins cannot
claim extra slots. Same-account join retries are idempotent without consuming
another invitation use. Failed joins leave no partial profile/membership/use.
Snapshot-isolated new admissions fail closed; normal PostgREST READ COMMITTED
transactions are supported. Direct privileged SQL must not bypass these RPCs.

Social writes hold a membership share lock until commit so a concurrent leave
cannot revoke membership halfway through a write. Scoped poll edits/votes keep
the original post-then-poll lock ordering. Read payloads remain bounded to 20 items
plus a 21st-row has-more probe; Trending ranks only the current room's posts.

## General preservation upgrade procedure -- historical for this reset

For this project, 004 is already installed and the user's clean-reset request
superseded this preservation procedure. Do not reapply. Future projects/rollouts
still need their own target-specific authorization and backup decisions.

1. Review the new migration and take a verified database backup/snapshot. Inventory
   original members, admins, aliases, content and invitation usage privately.
2. Obtain explicit authorization to apply **004 to the dedicated GhostPost hosted
   project**. Do not reuse old Google-provider or 003 approval as blanket access.
3. Coordinate a maintenance window: stop using the old app while the migration and
   matching new source are rolled forward. The migration revokes old global APIs.
4. With the existing operator-only local configuration and verified TLS, run the
   migration helper's dry run. Verify the target and that only 004 is pending.
5. Apply once through the migration helper after approval. Do not manually rerun
   SQL or reset hosted Supabase. Refresh/check PostgREST schema visibility.
6. Verify Original group, alias/admin preservation, content counts, invitation
   hashes/use counts, new RLS policies and legacy execute revocations.
7. Restart/run the matching app version. Test the actual Google account's room hub
   and Original group, nickname, content and room moderation.
8. With separately authorized disposable accounts, exercise join/create, a second
   room, key rotation, cross-room denial, leave/rejoin and scoped moderation through
   actual Supabase Auth/PostgREST. Clean up only known fixtures.
9. GitHub/Vercel deployment remains a separate authorization gate. No new application
   secrets or provider scopes are needed. Existing `/auth/callback?next=/feed`
   redirects remain valid; the callback now sends users to `/rooms`. Existing
   recovery and confirmation callbacks remain supported.

Commands below are **instructions only, not executed against hosted Supabase**:

```sh
npm run db:migrate -- --dry-run
npm run db:migrate
```

Rollback is not simply swapping back to the old frontend: its APIs are revoked,
and new room data must not be lost. Prefer a reviewed forward fix; a restore must
use the verified backup and account for activity since that backup. Do not delete
room tables or restore broad old RPC grants as a shortcut.

## Verification and test boundaries

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npm run test:e2e -- tests/e2e/public.spec.ts tests/e2e/google.spec.ts
npm run test:rooms
```

- Unit/SDK tests: callback/session verification, safe redirects, room routing,
  validation and retained password flow. SDK transports are explicitly mocked.
- Database tests: 22 historical single-office tests against 001-003, plus 15 current
  room tests applying **all** migrations to disposable real PostgreSQL. Covers
  migration preservation, RLS/grants, all cross-room operations, key lifecycle,
  six-room/25-member races, same-account retries, failed-use accounting, forged
  metadata, ownership, poll locks/uniqueness, bounded feeds and Auth deletion.
  The harness supplies only Supabase Auth schema/roles/`auth.uid()`.
- Public browser tests: actual Next pages and signed-out route protection. Google
  initiation is intercepted before Supabase/Google; real OAuth is not claimed.
- `test:rooms`: an isolated production build on port 4321, temporary PostgreSQL on
  55441, and a test-only HTTP/Auth adapter on 4320. Real pages, Server Actions,
  Supabase SSR cookies, SQL and RLS; **simulated Auth and RPC transport, not GoTrue,
  PostgREST or Google**. No local environment file or hosted credential is copied.
  Exercises create/join, keys, posts/reactions/comments, polls, reports, independent
  room switching, leave denial, desktop/mobile accessibility and hydration.
  The test never adds a mock provider or fake feed to production source.
- Screenshots contain disposable local fixture data and unusable test keys only:
  [desktop hub](artifacts/screenshots/rooms/hub-1440.png),
  [mobile hub](artifacts/screenshots/rooms/hub-390.png),
  [mobile feed](artifacts/screenshots/rooms/feed-390.png),
  [key controls](artifacts/screenshots/rooms/moderation-1440.png).

The historical office browser suite requires a separate legacy opt-in; its old
successes do not verify this release. `test:live`, `db:invite` and `db:admin` stop
before contacting a service unless explicitly invoked for the old schema. Use
room UI controls instead. The development seed now creates a local sample room
and remains forbidden against hosted URLs. No production/sample activity is
inserted by migration or build.

Hosted migration and clean reset are complete. Live PostgREST exposes the new room
RPC and denies anonymous access. A fresh real-Google room onboarding, authenticated
PostgREST social workflows, moderator selection and deployment remain pending.
Prior Google login success is history, not a completed new-account test.
