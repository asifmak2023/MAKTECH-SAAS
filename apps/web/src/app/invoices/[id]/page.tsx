"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ErrorDialog, { DialogState } from "@/components/ErrorDialog";
import { api, getToken, getTenantSlug } from "@/lib/api";
import { Client, clientDisplayName } from "@/lib/clients";
import { formatStatus, money, statusStyles } from "@/lib/status";

type Invoice = {
  id: number;
  buyer_business_name: string;
  buyer_ntn_cnic?: string;
  buyer_email?: string;
  invoice_date: string;
  invoice_type: string;
  status: string;
  last_error?: string | null;
  fbr_invoice_number?: string | null;
  grand_total: number;
  subtotal: number;
  sales_tax_total: number;
  approval_token: string;
  customer?: Client | null;
  items?: Array<{
    id: number;
    hs_code: string;
    product_description: string;
    quantity: number;
    rate: string;
    value_sales_excluding_st: number;
    sales_tax_applicable: number;
    total_values: number;
  }>;
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const load = useCallback(() => {
    api<Invoice>(`/api/invoices/${params.id}`).then(setInvoice).catch((err) => setError(err.message));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(path: string, success: string) {
    setError("");
    setMessage("");
    try {
      await api(`/api/invoices/${params.id}/${path}`, { method: "POST" });
      setMessage(success);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      if (path === "submit") {
        setDialog({
          title: "PRAL submission failed",
          message: msg,
          detail: invoice?.last_error ?? undefined,
          retryLabel: "Retry submission",
          onRetry: () => action("submit", "Submitted to PRAL"),
        });
      } else {
        setError(msg);
      }
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    setDeleting(true);
    setError("");
    try {
      await api(`/api/invoices/${params.id}`, { method: "DELETE" });
      router.push("/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (!invoice) {
    return (
      <AppShell>
        <p>{error || "Loading..."}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Invoice</p>
          <h1 className="text-3xl font-medium tracking-tight">{invoice.buyer_business_name}</h1>
          <p className="mt-1 text-sm text-[#767676]">{invoice.invoice_type} · {invoice.invoice_date?.slice(0, 10)}</p>
        </div>
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[invoice.status] || "border border-[#e5e5e5] bg-[#f5f5f5] text-[#262626]"}`}>
          {formatStatus(invoice.status)}
        </span>
      </div>

      {invoice.customer && (
        <p className="mb-4 text-sm text-[#767676]">
          Client:{" "}
          <Link href={`/clients/${invoice.customer.id}`} className="font-medium text-black underline underline-offset-4">
            {clientDisplayName(invoice.customer)}
          </Link>
        </p>
      )}

      {invoice.fbr_invoice_number && (
        <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
          FBR invoice number: {invoice.fbr_invoice_number}
        </p>
      )}
      {invoice.last_error && <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{invoice.last_error}</p>}
      {message && <p className="mb-4 rounded-md border border-[#e5e5e5] bg-[#f5f5f5] p-3 text-sm text-black">{message}</p>}
      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      <div className="mb-6 flex flex-wrap gap-3">
        {invoice.status === "draft" && (
          <button className="bg-black text-white" onClick={() => action("send-for-approval", "Sent for buyer approval")}>
            Send for approval
          </button>
        )}
        {(invoice.status === "approved" || invoice.status === "failed") && (
          <button className="bg-black text-white" onClick={() => action("submit", "Submitted to PRAL")}>
            Submit to PRAL
          </button>
        )}
        {["draft", "failed", "rejected"].includes(invoice.status) && (
          <>
            <Link className="btn-ghost" href={`/invoices/${invoice.id}/edit`}>
              Edit
            </Link>
            <button
              className="border border-black px-4 py-2 text-black"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </>
        )}
        <a
          className="btn-ghost"
          href={`/api/invoices/${invoice.id}/pdf`}
          onClick={(e) => {
            e.preventDefault();
            fetch(`/api/invoices/${invoice.id}/pdf`, {
              headers: {
                Authorization: `Bearer ${getToken()}`,
                "X-Tenant": getTenantSlug() || "",
              },
            })
              .then((r) => r.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
              });
          }}
        >
          Download PDF
        </a>
        <Link className="btn-ghost" href={`/approve/${invoice.approval_token}`}>
          Public approval link
        </Link>
      </div>

      <div className="border border-[#e5e5e5] bg-white p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">HS</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th className="text-right">Value</th>
              <th className="text-right">ST</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-2">{item.hs_code}</td>
                <td>{item.product_description}</td>
                <td>{item.quantity}</td>
                <td>{item.rate}</td>
                <td className="text-right">{money(item.value_sales_excluding_st)}</td>
                <td className="text-right">{money(item.sales_tax_applicable)}</td>
                <td className="text-right">{money(item.total_values)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-right text-sm">
          <p>Subtotal: PKR {money(invoice.subtotal)}</p>
          <p>Sales tax: PKR {money(invoice.sales_tax_total)}</p>
          <p className="font-semibold">Grand total: PKR {money(invoice.grand_total)}</p>
        </div>
      </div>

      <ErrorDialog
        state={dialog}
        onClose={() => setDialog(null)}
      />
    </AppShell>
  );
}
