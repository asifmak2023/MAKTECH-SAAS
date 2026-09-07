"use client";

import { useEffect, useState } from "react";
import { formatStatus, money, statusStyles } from "@/lib/status";

type Invoice = {
  id: number;
  seller_business_name: string;
  buyer_business_name: string;
  invoice_date: string;
  status: string;
  grand_total: number;
  last_error?: string | null;
  fbr_invoice_number?: string | null;
  items?: Array<{ product_description: string; quantity: number; total_values: number }>;
};

export default function ApprovalClient({ token }: { token: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/invoices/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setInvoice(data.invoice);
        setCanDecide(Boolean(data.can_decide));
      })
      .catch(() => setError("Invoice not found"));
  }, [token]);

  async function decide(action: "approve" | "reject") {
    setError("");
    const res = await fetch(`/api/public/invoices/${token}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Could not update invoice");
      return;
    }
    setMessage(data.message);
    setInvoice(data.invoice);
    setCanDecide(false);
  }

  if (!invoice) {
    return <div className="p-10">{error || "Loading invoice..."}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-win-600">PRAL Digital Invoicing</p>
        <h1 className="mt-2 text-2xl font-semibold">Invoice from {invoice.seller_business_name}</h1>
        <p className="text-sm text-slate-500">Buyer: {invoice.buyer_business_name}</p>
        <p className="mt-2">
          <span className={`rounded-full px-3 py-1 text-sm ${statusStyles[invoice.status] || ""}`}>
            {formatStatus(invoice.status)}
          </span>
        </p>
        <p className="mt-4 text-lg font-semibold">Amount: PKR {money(invoice.grand_total)}</p>
        {invoice.fbr_invoice_number && <p className="text-sm text-emerald-700">FBR No: {invoice.fbr_invoice_number}</p>}
        <ul className="mt-4 space-y-2 text-sm">
          {(invoice.items || []).map((item, i) => (
            <li key={i} className="flex justify-between border-b py-2">
              <span>
                {item.product_description} × {item.quantity}
              </span>
              <span>PKR {money(item.total_values)}</span>
            </li>
          ))}
        </ul>
        <a className="mt-4 inline-block text-sm text-win-600" href={`/api/public/invoices/${token}/pdf`}>
          Download PDF
        </a>
        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        {canDecide && (
          <div className="mt-6 space-y-3">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rejection note (optional)" />
            <div className="flex gap-3">
              <button className="bg-emerald-700 text-white" onClick={() => decide("approve")}>
                Approve
              </button>
              <button className="bg-rose-600 text-white" onClick={() => decide("reject")}>
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
