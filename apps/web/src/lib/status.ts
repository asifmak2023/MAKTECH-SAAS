export const statusStyles: Record<string, string> = {
  draft: "border border-[#e5e5e5] bg-[#f5f5f5] text-[#262626]",
  pending_approval: "status-amber",
  approved: "status-emerald",
  submitted: "status-sky",
  failed: "status-rose",
  rejected: "status-rose",
  pending: "status-amber",
  paid: "bg-black text-white",
  refunded: "border border-[#e5e5e5] bg-[#f5f5f5] text-[#767676]",
  partially_refunded: "border border-black bg-white text-black",
  cancelled: "border border-[#e5e5e5] bg-[#f5f5f5] text-[#767676]",
  unpaid: "border border-black bg-white text-black",
  active: "bg-black text-white",
  trial: "border border-black bg-white text-black",
  grace_period: "border border-[#e5e5e5] bg-white text-[#262626]",
  past_due: "border border-black bg-white text-black",
  payment_processing: "border border-black bg-white text-black",
  suspended: "border border-black bg-white text-black",
  expired: "border border-[#e5e5e5] bg-[#f5f5f5] text-[#767676]",
  open: "border border-black bg-white text-black",
  in_progress: "border border-[#e5e5e5] bg-white text-[#262626]",
  resolved: "bg-black text-white",
  archived: "border border-[#e5e5e5] bg-[#f5f5f5] text-[#767676]",
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
