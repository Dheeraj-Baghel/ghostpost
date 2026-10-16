import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function timeAgo(date: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;
  return new Date(date).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Match PostgreSQL's seven-day interaction / age-decay ranking.
export function trendingScore(recentReactions: number, recentComments: number, ageHours: number): number {
  return (1 + recentReactions + 2 * recentComments) / Math.pow(Math.max(0, ageHours) + 2, 1.2);
}

export function safeNext(value: string | null | undefined, fallback = "/feed"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
  // Only app-local destinations, never an arbitrary scheme or protocol-relative URL.
  const path = value.split("?")[0];
  if (!["/rooms", "/feed", "/join", "/admin", "/reset-password"].includes(path) && !/^\/post\/[0-9a-f-]{36}$/.test(path) && !/^\/rooms\/[0-9a-f-]{36}\/(feed|admin|post\/[0-9a-f-]{36})$/.test(path)) return fallback;
  return value;
}
