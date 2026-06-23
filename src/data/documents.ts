import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import type { Document } from "@/lib/database.types";

export type { Document };

export type EntityType = "property" | "lease";

function key(entityType: EntityType, entityId: string) {
  return ["documents", entityType, entityId] as const;
}

export function useDocuments(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: key(entityType, entityId ?? ""),
    enabled: !!entityId,
    queryFn: async (): Promise<Document[]> => {
      const col = entityType === "property" ? "property_id" : "lease_id";
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq(col, entityId!)
        .order("created_at", { ascending: false })
        .returns<Document[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadDocument(entityType: EntityType, entityId: string, orgId: string) {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
      const path = `${orgId}/${entityType}/${entityId}/${Date.now()}_${safeName}`;

      const { error: storageErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (storageErr) throw storageErr;

      const col = entityType === "property" ? "property_id" : "lease_id";
      const row: Partial<Document> = {
        org_id: orgId,
        uploaded_by: profile?.id ?? null,
        name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
      };
      row[col] = entityId;
      const { error: dbErr } = await supabase.from("documents").insert(row);
      if (dbErr) {
        await supabase.storage.from("documents").remove([path]);
        throw dbErr;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(entityType, entityId) }),
  });
}

export function useDeleteDocument(entityType: EntityType, entityId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const { error: storageErr } = await supabase.storage
        .from("documents")
        .remove([filePath]);
      if (storageErr) throw storageErr;
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(entityType, entityId) }),
  });
}

/** Generate a 1-hour signed download URL for a stored file. */
export async function getSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600);
  if (error || !data) throw error ?? new Error("Could not generate download URL");
  return data.signedUrl;
}
