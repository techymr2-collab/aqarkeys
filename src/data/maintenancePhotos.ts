import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import type { MaintenancePhoto } from "@/lib/database.types";

function key(requestId: string) {
  return ["maintenance-photos", requestId] as const;
}

export function useMaintenancePhotos(requestId: string | undefined) {
  return useQuery({
    queryKey: key(requestId ?? ""),
    enabled: !!requestId,
    queryFn: async (): Promise<MaintenancePhoto[]> => {
      const { data, error } = await supabase
        .from("maintenance_photos")
        .select("*")
        .eq("maintenance_request_id", requestId!)
        .order("created_at")
        .returns<MaintenancePhoto[]>();
      if (error) throw error;
      return data;
    },
  });
}

/** Plain (non-hook) upload — usable right after creating a request, before any component has a stable query to invalidate. */
export async function uploadMaintenancePhotoFile(
  file: File,
  requestId: string,
  orgId: string,
  uploadedBy: string | null,
): Promise<void> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
  const path = `${orgId}/${requestId}/${Date.now()}_${safeName}`;

  const { error: storageErr } = await supabase.storage
    .from("maintenance-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (storageErr) throw storageErr;

  const { error: dbErr } = await supabase.from("maintenance_photos").insert({
    org_id: orgId,
    maintenance_request_id: requestId,
    uploaded_by: uploadedBy,
    file_path: path,
  });
  if (dbErr) {
    await supabase.storage.from("maintenance-photos").remove([path]);
    throw dbErr;
  }
}

export function useUploadMaintenancePhoto(requestId: string, orgId: string) {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      await uploadMaintenancePhotoFile(file, requestId, orgId, profile?.id ?? null);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(requestId) }),
  });
}

export function useDeleteMaintenancePhoto(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const { error: storageErr } = await supabase.storage.from("maintenance-photos").remove([filePath]);
      if (storageErr) throw storageErr;
      const { error } = await supabase.from("maintenance_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(requestId) }),
  });
}

/** Generates a 1-hour signed URL for viewing a stored photo. */
export async function getMaintenancePhotoUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("maintenance-photos")
    .createSignedUrl(filePath, 3600);
  if (error || !data) throw error ?? new Error("Could not generate photo URL");
  return data.signedUrl;
}
