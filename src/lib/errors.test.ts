import { describe, it, expect } from "vitest";
import { friendlyError } from "@/lib/errors";

describe("friendlyError", () => {
  it("returns the message from a real Error", () => {
    expect(friendlyError(new Error("boom"), "fallback")).toBe("boom");
  });

  // Regression: Supabase throws PostgrestError-shaped plain objects, not Error
  // instances. The helper must read `.message`, not stringify to [object Object].
  it("reads .message off Supabase-style plain error objects", () => {
    const err = { code: "23503", message: "some database failure", details: null };
    expect(friendlyError(err, "fallback")).toBe("some database failure");
  });

  it("maps foreign-key violations (object form) to the friendly fallback", () => {
    const err = {
      code: "23503",
      message:
        'update or delete on table "tenants" violates foreign key constraint "leases_tenant_id_fkey"',
    };
    expect(friendlyError(err, "This tenant has a lease and cannot be deleted.")).toBe(
      "This tenant has a lease and cannot be deleted.",
    );
  });

  it("maps foreign-key violations (Error form) to the fallback", () => {
    const err = new Error("violates foreign key constraint on units");
    expect(friendlyError(err, "cannot delete")).toBe("cannot delete");
  });

  it("never returns [object Object]", () => {
    expect(friendlyError({ message: "x" }, "fb")).not.toBe("[object Object]");
  });

  it("falls back for null/empty input", () => {
    expect(friendlyError(null, "fb")).toBe("fb");
    expect(friendlyError(undefined, "fb")).toBe("fb");
  });

  it("passes through a plain string", () => {
    expect(friendlyError("plain text error", "fb")).toBe("plain text error");
  });
});
