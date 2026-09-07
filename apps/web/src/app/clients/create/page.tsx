"use client";

import AppShell from "@/components/AppShell";
import ClientForm from "@/components/ClientForm";

export default function CreateClientPage() {
  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold">Add client</h1>
      <ClientForm />
    </AppShell>
  );
}
