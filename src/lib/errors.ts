/** Turn a raw Supabase/Postgres error into a user friendly message. */
export function friendlyError(err: unknown, fallback: string): string {
  let msg = "";
  if (err instanceof Error) {
    msg = err.message;
  } else if (err && typeof err === "object" && "message" in err) {
    // Supabase throws PostgrestError-shaped plain objects, not Error instances.
    msg = String((err as { message: unknown }).message ?? "");
  } else {
    msg = String(err ?? "");
  }
  if (/foreign key|still referenced|violates foreign key/i.test(msg)) {
    return fallback;
  }
  return msg || fallback;
}
