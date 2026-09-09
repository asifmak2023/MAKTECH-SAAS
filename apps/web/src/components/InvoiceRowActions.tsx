"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";

export function isInvoiceEditable(status: string) {
  return ["draft", "failed", "rejected"].includes(status);
}

export default function InvoiceRowActions({
  invoice,
  onDeleted,
}: {
  invoice: { id: number; status: string };
  onDeleted?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isInvoiceEditable(invoice.status)) return null;

  async function onDelete() {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center justify-end gap-2">
      <Link href={`/invoices/${invoice.id}/edit`} className="text-xs font-medium uppercase tracking-wider text-black underline underline-offset-2 font-label">
        Edit
      </Link>
      <button
        className="border border-black px-2 py-1 text-xs text-black"
        onClick={onDelete}
        disabled={busy}
      >
        {busy ? "Deleting..." : "Delete"}
      </button>
      {error && <span className="text-xs text-black">{error}</span>}
    </span>
  );
}
