import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import type { Invitation, UserRole } from "@/lib/database.types";

const KEY = ["invitations"] as const;

/** Pending and accepted invitations for the manager's org. */
export function useInvitations() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Invitation[]> => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export interface InvitationInput {
  email: string;
  role: UserRole;
  owner_id?: string | null;
  tenant_id?: string | null;
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: InvitationInput): Promise<Invitation> => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          org_id: profile.org_id,
          email: input.email,
          role: input.role,
          owner_id: input.owner_id ?? null,
          tenant_id: input.tenant_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface InvitationInfo {
  email: string;
  role: UserRole;
  org_name: string;
  valid: boolean;
}

/** Public lookup of an invitation by token, for the accept page. */
export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: ["invitation", token],
    enabled: !!token,
    retry: false,
    queryFn: async (): Promise<InvitationInfo | null> => {
      const { data, error } = await supabase.rpc("get_invitation", { p_token: token! });
      if (error) throw error;
      const row = data?.[0];
      return row ?? null;
    },
  });
}

export function inviteLink(token: string): string {
  return `${window.location.origin}/accept-invite?token=${token}`;
}
