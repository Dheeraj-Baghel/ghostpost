// Shared values belong outside a client boundary: Server Components must not
// stringify a client-module reference when composing Tailwind class names.
export const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] px-5 py-3 text-sm font-bold transition-colors disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed";
export const primaryClass = `${buttonClass} bg-accent text-white hover:bg-accent-pressed active:bg-accent-pressed`;
export const secondaryClass = `${buttonClass} bg-elevated text-ink hover:bg-[#d6d6d0] active:bg-[#c8c8c1]`;
export const inputClass = "w-full min-h-11 rounded-[16px] border border-[#91918c] bg-canvas px-4 py-3 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:bg-surface disabled:text-muted";