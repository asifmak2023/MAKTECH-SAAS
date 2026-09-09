"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import InvoiceForm from "@/components/InvoiceForm";

function CreateInvoiceView() {
  const search = useSearchParams();
  const clientParam = search.get("client");

  return (
    <AppShell>
      <div className="mb-8">
        <p className="eyebrow mb-2">Workspace</p>
        <h1 className="text-3xl font-medium tracking-tight">Create invoice</h1>
      </div>
      <InvoiceForm prefillClientId={clientParam} />
    </AppShell>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<AppShell><p className="text-sm text-slate-500">Loading...</p></AppShell>}>
      <CreateInvoiceView />
    </Suspense>
  );
}
