"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ClientForm from "@/components/ClientForm";
import { api } from "@/lib/api";
import { Client, ClientShow } from "@/lib/clients";

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ClientShow>(`/api/customers/${params.id}`)
      .then((res) => setClient(res.customer))
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [params.id]);

  if (error) {
    return (
      <AppShell>
        <p className="text-sm text-rose-600">{error}</p>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <p>Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit client</h1>
        <Link href={`/clients/${client.id}`} className="rounded-md bg-slate-100 px-4 py-2 text-sm">
          Back to client
        </Link>
      </div>
      <ClientForm client={client} />
    </AppShell>
  );
}
