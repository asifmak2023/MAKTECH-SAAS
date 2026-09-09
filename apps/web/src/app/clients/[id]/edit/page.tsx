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
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Directory</p>
          <h1 className="text-3xl font-medium tracking-tight">Edit client</h1>
        </div>
        <Link href={`/clients/${client.id}`} className="btn-ghost">
          Back to client
        </Link>
      </div>
      <ClientForm client={client} />
    </AppShell>
  );
}
