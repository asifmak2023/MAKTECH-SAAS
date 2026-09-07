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
      <h1 className="mb-6 text-2xl font-semibold">Create invoice</h1>
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
