"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";

type Tenant = {
  name: string;
  slug: string;
  seller_ntn_cnic?: string;
  seller_business_name?: string;
  seller_province?: string;
  seller_address?: string;
  seller_email?: string;
  seller_phone?: string;
  auto_submit_on_approval: boolean;
};

type FbrIntegrator = { code: string; name: string; supports_sandbox: boolean; adapter?: string | null };

type FbrShow = {
  integrator: string;
  mode: string;
  configured: boolean;
  row: {
    status: string;
    mode: string;
    config: Record<string, string>;
    last_tested_at?: string | null;
  } | null;
  available_integrators: FbrIntegrator[];
};

function TenantForm({ tenant, onSaved }: { tenant: Tenant; onSaved: (t: Tenant) => void }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const updated = await api<Tenant>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          name: form.get("name"),
          seller_ntn_cnic: form.get("seller_ntn_cnic"),
          seller_business_name: form.get("seller_business_name"),
          seller_province: form.get("seller_province"),
          seller_address: form.get("seller_address"),
          seller_email: form.get("seller_email"),
          seller_phone: form.get("seller_phone"),
          auto_submit_on_approval: form.get("auto_submit_on_approval") === "on",
        }),
      });
      onSaved(updated);
      setMessage("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-4 rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
      <h2 className="text-lg font-semibold">Business profile</h2>
      <div>
        <label>Company name</label>
        <input name="name" defaultValue={tenant.name} />
      </div>
      <div>
        <label>Seller NTN/CNIC</label>
        <input name="seller_ntn_cnic" defaultValue={tenant.seller_ntn_cnic} />
      </div>
      <div>
        <label>Seller business name</label>
        <input name="seller_business_name" defaultValue={tenant.seller_business_name} />
      </div>
      <div>
        <label>Province</label>
        <input name="seller_province" defaultValue={tenant.seller_province} />
      </div>
      <div>
        <label>Address</label>
        <input name="seller_address" defaultValue={tenant.seller_address} />
      </div>
      <div>
        <label>Email</label>
        <input name="seller_email" defaultValue={tenant.seller_email} />
      </div>
      <div>
        <label>Phone</label>
        <input name="seller_phone" defaultValue={tenant.seller_phone} />
      </div>
      <label className="flex items-center gap-2 text-sm normal-case tracking-normal">
        <input type="checkbox" name="auto_submit_on_approval" defaultChecked={tenant.auto_submit_on_approval} className="w-auto" />
        Auto-submit to PRAL after buyer approval
      </label>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="w-fit bg-win-600 text-white">Save</button>
    </form>
  );
}

function FbrSettingsCard() {
  const [data, setData] = useState<FbrShow | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api<FbrShow>("/api/settings/fbr")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  };

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    const pick = (name: string) => {
      const v = String(form.get(name) ?? "").trim();
      if (v) payload[name] = v;
    };
    pick("mode");
    pick("integrator");
    pick("base_url");
    pick("token");
    pick("validate_endpoint");
    pick("submit_endpoint");
    try {
      const res = await api<{ message: string; status: string }>("/api/settings/fbr", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMessage(`${res.message} (${res.status === "configured" ? "ready for sandbox submission" : res.status})`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (!data) {
    return (
      <div className="max-w-2xl rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <p className="text-sm">{error || "Loading FBR settings..."}</p>
      </div>
    );
  }

  const row = data.row;
  const tokenPresent = Boolean(row?.config?.token);
  const mode = data.mode || "sandbox";

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-4 rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">FBR / PRAL integration</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs ${data.configured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
        >
          {data.configured ? "Configured" : "Not configured"}
        </span>
      </div>

      <p className="text-sm text-slate-500">
        Sandbox/production submissions use this account&apos;s FBR Digital Invoicing credentials. Tokens are encrypted at
        rest and never shown again after saving.
      </p>
      {!data.configured && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {mode === "sandbox"
            ? "No sandbox token is set yet — submitting an invoice will fail until you add it here. Failed invoices can be re-submitted afterwards."
            : "No production token is set — set one before submitting invoices in production."}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label>Mode</label>
          <select name="mode" defaultValue={mode}>
            <option value="sandbox">Sandbox (test)</option>
            <option value="production">Production</option>
          </select>
        </div>
        <div>
          <label>Integrator</label>
          <select name="integrator" defaultValue={data.integrator || "pral"}>
            {data.available_integrators.map((i) => (
              <option key={i.code} value={i.code}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label>Base URL</label>
          <input name="base_url" placeholder="https://…" defaultValue={row?.config?.base_url || ""} />
        </div>
        <div className="md:col-span-2">
          <label>API token</label>
          <input name="token" type="password" placeholder={tokenPresent ? "•••••••• (leave blank to keep current)" : "Paste sandbox/production token"} autoComplete="new-password" />
        </div>
        <div>
          <label>Validate endpoint</label>
          <input name="validate_endpoint" placeholder="/pral/api/…/validate" defaultValue={row?.config?.validate_endpoint || ""} />
        </div>
        <div>
          <label>Submit endpoint</label>
          <input name="submit_endpoint" placeholder="/pral/api/…/submit" defaultValue={row?.config?.submit_endpoint || ""} />
        </div>
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="w-fit bg-win-600 text-white">Save FBR settings</button>
    </form>
  );
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Tenant>("/api/settings").then(setTenant).catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      {!tenant ? (
        <p>{error || "Loading..."}</p>
      ) : (
        <div className="space-y-6">
          <TenantForm tenant={tenant} onSaved={setTenant} />
          <FbrSettingsCard />
        </div>
      )}
    </AppShell>
  );
}
