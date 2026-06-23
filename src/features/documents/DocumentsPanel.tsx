import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ActionIcon } from "@/components/ui/ActionIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileTextIcon, UploadIcon, DownloadIcon, TrashIcon } from "@/components/icons";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  getSignedUrl,
  type EntityType,
} from "@/data/documents";
import { formatDate, formatFileSize } from "@/lib/format";
import { pushToast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";

interface Props {
  entityType: EntityType;
  entityId: string;
  orgId: string;
}

export function DocumentsPanel({ entityType, entityId, orgId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: docs = [], isLoading, isError, refetch } = useDocuments(entityType, entityId);
  const upload = useUploadDocument(entityType, entityId, orgId);
  const remove = useDeleteDocument(entityType, entityId);

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // Reset so the same file can be re-uploaded after deletion
    e.target.value = "";
    for (const file of files) {
      try {
        await upload.mutateAsync(file);
      } catch (err) {
        pushToast(friendlyError(err, `Could not upload ${file.name}.`), "error");
        return;
      }
    }
    pushToast(files.length === 1 ? "File uploaded" : `${files.length} files uploaded`, "success");
  }

  async function handleDownload(filePath: string, name: string) {
    try {
      const url = await getSignedUrl(filePath);
      window.open(url, "_blank", "noopener");
    } catch {
      pushToast(`Could not download ${name}.`, "error");
    }
  }

  async function handleDelete(id: string, filePath: string) {
    try {
      await remove.mutateAsync({ id, filePath });
      pushToast("File deleted", "success");
    } catch (err) {
      pushToast(friendlyError(err, "Could not delete the file."), "error");
    }
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="glass-card overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900/[0.06] px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {isLoading ? "Documents" : `${docs.length} document${docs.length !== 1 ? "s" : ""}`}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Lease agreements, inspection reports, photos and more.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon className="mr-1.5 h-3.5 w-3.5" />
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-0 divide-y divide-slate-900/[0.04]">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <EmptyState
            title="No documents yet"
            description="Upload lease agreements, inspection reports, photos and any property files."
          />
        </div>
      ) : (
        <div className="divide-y divide-slate-900/[0.04]">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <FileTextIcon className="h-5 w-5 text-brand-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{doc.name}</p>
                <p className="text-xs text-slate-500">
                  {doc.file_size != null ? formatFileSize(doc.file_size) : ""}
                  {doc.file_size != null && " · "}
                  {formatDate(doc.created_at.slice(0, 10))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <ActionIcon
                  label="Download"
                  onClick={() => void handleDownload(doc.file_path, doc.name)}
                >
                  <DownloadIcon className="h-4 w-4" />
                </ActionIcon>
                <ActionIcon
                  label="Delete"
                  danger
                  onClick={() => void handleDelete(doc.id, doc.file_path)}
                >
                  <TrashIcon className="h-4 w-4" />
                </ActionIcon>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
