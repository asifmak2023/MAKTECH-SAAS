export const statusStyles: Record<string, string> = {
  draft: "status-sky",
  pending_approval: "status-amber",
  approved: "status-emerald",
  submitted: "status-sky",
  failed: "status-rose",
  rejected: "status-rose",
  pending: "status-amber",
  paid: "status-emerald",
  refunded: "status-sky",
  partially_refunded: "status-amber",
  cancelled: "status-sky",
  unpaid: "status-amber",
  active: "status-emerald",
  trial: "status-sky",
  grace_period: "status-amber",
  past_due: "status-rose",
  payment_processing: "status-amber",
  suspended: "status-rose",
  expired: "status-sky",
  open: "status-sky",
  in_progress: "status-amber",
  resolved: "status-emerald",
  archived: "status-sky",
};

export function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function money(value?: number | string | null) {
  return Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
