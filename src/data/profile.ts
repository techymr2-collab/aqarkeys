import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ProfileUpdate {
  full_name: string;
  phone: string | null;
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ProfileUpdate }) => {
      const { error } = await supabase.from("profiles").update(input).eq("id", id);
      if (error) throw error;
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}
