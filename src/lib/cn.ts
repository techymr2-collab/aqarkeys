/**
 * Tiny className combiner. Filters falsy values and joins with spaces.
 * Keeps us dependency free for the common conditional-class pattern.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
