import type { UserRole } from "@/lib/database.types";

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "manager":
      return "/manager";
    case "owner":
      return "/owner";
    case "tenant":
      return "/tenant";
  }
}
