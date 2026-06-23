import { Modal } from "@/components/ui/Modal";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import type { LeaseWithRelations } from "@/data/leases";

interface Props {
  open: boolean;
  onClose: () => void;
  lease: LeaseWithRelations;
}

export function LeaseDocumentsModal({ open, onClose, lease }: Props) {
  const tenantName = lease.tenant?.name ?? "Tenant";
  const unitLabel = lease.unit?.label ?? "";
  const propertyName = lease.unit?.property?.name ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lease documents"
      description={[tenantName, unitLabel, propertyName].filter(Boolean).join(" · ")}
      size="lg"
    >
      <DocumentsPanel
        entityType="lease"
        entityId={lease.id}
        orgId={lease.org_id}
      />
    </Modal>
  );
}
