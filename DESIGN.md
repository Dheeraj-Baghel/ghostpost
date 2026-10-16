---
name: GhostPost Quiet Editorial
version: alpha
description: Warm neutral, content-first adaptation of the supplied Pinterest reference for a private text-and-poll community.
colors:
  primary: "#e60023"
  primary-pressed: "#cc001f"
  canvas: "#ffffff"
  surface-soft: "#fbfbf9"
  surface-card: "#f6f6f3"
  secondary-bg: "#e5e5e0"
  secondary-pressed: "#c8c8c1"
  surface-dark: "#262622"
  hairline: "#dadad3"
  ink: "#000000"
  body: "#33332e"
  mute: "#62625b"
  error: "#9e0a0a"
  error-pale: "#fbe9e9"
  success-deep: "#103c25"
  success-pale: "#c7f0da"
  focus-outer: "#435ee5"
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 70px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -1.2px
  heading-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -1.2px
  heading-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  button-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1
rounded:
  md: 16px
  lg: 32px
  full: 9999px
spacing:
  sm: 8px
  md: 16px
  xl: 24px
  xxl: 32px
  section: 64px
components:
  marketing-surface:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.body}"
  editorial-dark-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
  divider:
    backgroundColor: "{colors.hairline}"
    height: 1px
  focus-ring:
    backgroundColor: "{colors.focus-outer}"
    size: 2px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 44px
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.secondary-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 44px
  button-secondary-pressed:
    backgroundColor: "{colors.secondary-pressed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  button-disabled:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.mute}"
    rounded: "{rounded.md}"
  filter-chip:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    height: 44px
  filter-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.full}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 44px
  conversation-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  modal-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  error-message:
    backgroundColor: "{colors.error-pale}"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
  success-message:
    backgroundColor: "{colors.success-pale}"
    textColor: "{colors.success-deep}"
    rounded: "{rounded.md}"
---

# GhostPost / quiet editorial UI

## Overview

Adapt the user's supplied Pinterest design.md reference, not Pinterest branding.
GhostPost remains a private text/poll social app: no image uploads, search, or
other functionality is invented to reproduce a photo-first product. The old dark
violet/glow visual direction is superseded by this request.

## Colors

Keep {colors.primary} scarce: primary actions, wordmark and active-tab indicator.
The canvas is {colors.canvas}, body wash {colors.surface-soft}, natural-height
cards {colors.surface-card}. Text hierarchy uses {colors.ink}, {colors.body} and
{colors.mute}, not multiple saturated colors. Dividers use {colors.hairline}.
Focus uses a 2px {colors.focus-outer} outer ring and white separation. Semantic
errors/success use their own accessible colors; red is not decorative.

## Typography

Inter is self-hosted from the official rsms/inter distribution under the bundled
SIL Open Font License. Pin Sans is proprietary and is not used. System sans fonts
are the fallback. No serif or monospace UI. Display headlines follow
{typography.display-xl}, scaling to 36px on narrow screens. Sections follow
{typography.heading-xl}, short posts/modal titles {typography.heading-lg}, body
{typography.body-md}, helper text {typography.body-sm}, metadata {typography.caption}.

## Layout

Max width 1280px with {spacing.xl} desktop gutters. Marketing sections use
{spacing.section} rhythm. Conversation masonry uses {spacing.sm} gutters, one
column below 768px, two at 768px, three at 1100px. Text needs more width than
photographs: do not force four-to-six tiny columns. Natural-height text cards
keep {spacing.xl} padding for readability; the reference's padding-free rule
applies to photos, not this product's text. Reading order is down then across.
Pagination and server-side sorting remain unchanged.

## Elevation & Depth

Flat cards: no shadows, gradients, glow, floating decorative badges or redundant
right-hand panels. Only dialogs have ambient depth over a 50% dark scrim. The
landing page's sample thoughts are clearly labelled illustrative examples, never
pretend real office activity. No employee content is used as a marketing asset.

## Shapes

Use {rounded.md} for standard surfaces and controls, {rounded.lg} for big cards
and modals, {rounded.full} for circular avatars and chips. Actual targets are at
least 44px, increasing the reference's smaller touch examples. Mobile dialogs
anchor to the bottom, rounded at the top, with scroll access and a sticky composer
action area. The mobile navigation drawer uses the same 32px shape vocabulary.

## Components

{components.button-primary} drives the primary action; secondary actions use
{components.button-secondary}. Filter active state is black, not red. Reactions
use native emoji (thumbs-up, smiling face, fire and surprised face) inside neutral/
inverted controls. On a successful selection/change, a 650ms decorative emoji
floats above the button with a brief bounce; removal or a failed save does not
animate. The decorative copy is hidden from assistive technology, never blocks
taps, and is removed after 750ms. Reduced-motion users get the static selected
state without the bounce/pop. Persisted reaction keys and accessible names stay
Like/Laugh/Fire/Shocked. This small content accent is user-requested, not a new
chrome color palette. Home authentication opens over the page in
{components.modal-card}; direct auth URLs still work. Google-first auth, passwords,
invitations, the 25-member limit and moderation authorization are unchanged.

## Do's and Don'ts

- Keep GhostPost's wordmark and private nickname identity, not Pinterest's logo.
- Retain all real server actions; no dummy search, navigation or decorative buttons.
- No dependency upgrades, hosted schema changes, user-data edits or GitHub/deployment.
- Automated live interaction tests create only explicit temporary fixtures and clean
  them afterward. Screenshot captures omit real office posts; the actual feed and
  permissions are not altered to manufacture a preview.
- Check keyboard focus, modal dismissal, overflow and touch targets at 320, 390,
  768 and 1440px. Validate with `npx @google/design.md lint DESIGN.md` and Axe.
