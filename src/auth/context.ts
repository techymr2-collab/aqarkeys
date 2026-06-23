import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/database.types";

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);
