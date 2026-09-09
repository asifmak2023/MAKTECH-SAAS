"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import InvoiceForm from "@/components/InvoiceForm";
import { api } from "@/lib/api";
import { Client } from "@/lib/clients";

type EditItem = {
  hs_code: string;
  product_description: string;
  rate: string;
  uom: string;
  quantity: number;
  value_sales_excluding_st: number;
  sale_type: string;
};

type EditInvoice = {
  id: number;
  invoice_type: string;
  invoice_date: string;
  invoice_ref_no?: string | null;
  scenario_id?: string | null;
  buyer_ntn_cnic?: string | null;
  buyer_business_name?: string | null;
  buyer_province?: string | null;
  buyer_address?: string | null;
  buyer_registration_type?: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  customer?: Client | null;
  status?: string;
  items?: EditItem[];
};

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<EditInvoice | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<EditInvoice>(`/api/invoices/${params.id}`)
      .then(setInvoice)
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (error) {
    return (
      <AppShell>
        <p className="text-sm text-rose-600">{error}</p>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Workspace</p>
          <h1 className="text-3xl font-medium tracking-tight">Edit invoice</h1>
        </div>
        <Link href={`/invoices/${params.id}`} className="btn-ghost">
          Back to invoice
        </Link>
      </div>
      <InvoiceForm invoice={invoice} initialClient={invoice.customer ?? null} />
    </AppShell>
  );
}
