"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Client } from "@/lib/clients";
import { PAKISTAN_PROVINCES, provinceOptions } from "@/lib/provinces";

export default function ClientForm({ client }: { client?: Client | null }) {
  const router = useRouter();
  const editing = Boolean(client?.id);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const provinces = provinceOptions(client?.province);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      business_name: form.get("business_name"),
      ntn_cnic: form.get("ntn_cnic"),
      strn: form.get("strn"),
      registration_type: form.get("registration_type"),
      province: form.get("province"),
      city: form.get("city"),
      address: form.get("address"),
      email: form.get("email"),
      phone: form.get("phone"),
      notes: form.get("notes"),
    };
    try {
      const res = await api<{ id: number }>(editing ? `/api/customers/${client!.id}` : "/api/customers", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/clients/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <section className="card-plain grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label>Business name</label>
          <input name="business_name" required defaultValue={client?.business_name || ""} />
        </div>
        <div>
          <label>Contact person</label>
          <input name="name" defaultValue={client?.name || ""} />
        </div>
        <div>
          <label>Email</label>
          <input name="email" type="email" defaultValue={client?.email || ""} />
        </div>
        <div>
          <label>Phone</label>
          <input name="phone" defaultValue={client?.phone || ""} />
        </div>
        <div>
          <label>NTN/CNIC</label>
          <input name="ntn_cnic" defaultValue={client?.ntn_cnic || ""} />
        </div>
        <div>
          <label>STRN</label>
          <input name="strn" defaultValue={client?.strn || ""} />
        </div>
        <div>
          <label>Registration type</label>
          <select name="registration_type" defaultValue={client?.registration_type || "Registered"}>
            <option>Registered</option>
            <option>Unregistered</option>
          </select>
        </div>
        <div>
          <label>Province</label>
          <select name="province" defaultValue={client?.province || PAKISTAN_PROVINCES[0]}>
            {provinces.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label>City</label>
          <input name="city" defaultValue={client?.city || ""} />
        </div>
        <div className="md:col-span-2">
          <label>Billing address</label>
          <input name="address" defaultValue={client?.address || ""} />
        </div>
        <div className="md:col-span-2">
          <label>Notes</label>
          <textarea name="notes" rows={3} defaultValue={client?.notes || ""} />
        </div>
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="bg-black text-white" disabled={loading}>
        {loading ? "Saving..." : editing ? "Save changes" : "Save client"}
      </button>
    </form>
  );
}
