"use client";

import AppShell from "@/components/AppShell";
import ClientForm from "@/components/ClientForm";

export default function CreateClientPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="eyebrow mb-2">Directory</p>
        <h1 className="text-3xl font-medium tracking-tight">Add client</h1>
      </div>
      <ClientForm />
    </AppShell>
  );
}
