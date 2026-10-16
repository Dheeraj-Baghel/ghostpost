import { z } from "zod";
import { CATEGORIES, COMMENT_LIMIT, POST_LIMIT, REACTIONS, REPORT_REASONS } from "./constants";

export const contentSchema = z.string().trim().min(1, "Write something first.").max(POST_LIMIT, `Keep it under ${POST_LIMIT} characters.`);
export const commentSchema = z.string().trim().min(1, "Your comment is empty.").max(COMMENT_LIMIT, `Keep comments under ${COMMENT_LIMIT} characters.`);
export const categorySchema = z.enum(CATEGORIES);
export const idSchema = z.uuid("This item could not be found.");
export const optionSchema = z.string().trim().min(1, "Every option needs an answer.").max(120, "Options must be 120 characters or fewer.");
export const optionsSchema = z.array(optionSchema).min(2, "Add at least two options.").max(4, "Four options is the maximum.").refine(options => new Set(options.map(v => v.toLowerCase())).size === options.length, "Use different answers for each option.");
export const postSchema = z.object({ content: contentSchema, category: categorySchema, options: optionsSchema.optional() });
export const reactionSchema = z.enum(REACTIONS).nullable();
export const reportSchema = z.enum(REPORT_REASONS);
export const emailSchema = z.email("Enter a valid email address.").max(254);
export const passwordSchema = z.string().min(10, "Use at least 10 characters.").max(128, "Use no more than 128 characters.");
export const inviteSchema = z.string().trim().min(12, "Enter the complete invitation code.").max(128, "That code looks too long.");

export function firstError(result: { error: z.ZodError }): string { return result.error.issues[0]?.message ?? "Please check your input."; }
