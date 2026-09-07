export const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
  submitted: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  rejected: "bg-orange-100 text-orange-800",
  // Billing / subscription statuses
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-slate-200 text-slate-600",
  partially_refunded: "bg-orange-100 text-orange-800",
  cancelled: "bg-slate-100 text-slate-500",
  unpaid: "bg-rose-100 text-rose-800",
  active: "bg-emerald-100 text-emerald-800",
  trial: "bg-sky-100 text-sky-800",
  grace_period: "bg-amber-100 text-amber-800",
  past_due: "bg-orange-100 text-orange-800",
  payment_processing: "bg-sky-100 text-sky-800",
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
