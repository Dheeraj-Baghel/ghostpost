// Single-office MVP limits are mirrored by PostgreSQL constraints.
export const CATEGORIES = ["Confession", "Hot Take", "Funny", "Question", "General"] as const;
export const REACTIONS = ["like", "laugh", "fire", "shocked"] as const;
export const REPORT_REASONS = ["Spam", "Harassment", "Inappropriate content", "Other"] as const;
export const PAGE_SIZE = 20;
export const POST_LIMIT = 1000;
export const COMMENT_LIMIT = 500;
export type Category = (typeof CATEGORIES)[number];
export type Reaction = (typeof REACTIONS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export const CATEGORY_STYLES: Record<Category, string> = {
  Confession: "text-body bg-canvas",
  "Hot Take": "text-body bg-canvas",
  Funny: "text-body bg-canvas",
  Question: "text-body bg-canvas",
  General: "text-body bg-canvas",
};
