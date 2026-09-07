"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { fmtWhen } from "@/lib/admin";

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

type Environment = {
  mode: string;
  status: string;
  configured: boolean;
  tested: boolean;
  failed: boolean;
  has_token: boolean;
  config: Record<string, string>;
  last_tested_at?: string | null;
};

type FbrShow = {
  active_mode: string;
  integrator: string;
  environments: Record<string, Environment>;
  onboarding: {
    seller_profile_complete: boolean;
    sandbox_configured: boolean;
    sandbox_tested: boolean;
    sandbox_suite_passed: boolean;
    production_configured: boolean;
    production_active: boolean;
    can_activate_production: boolean;
  };
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
  const [error, setError] = useState("");

  useEffect(() => {
    api<FbrShow>("/api/settings/fbr")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, []);

  if (!data) {
    return (
      <div className="max-w-2xl rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
        <p className="text-sm">{error || "Loading FBR settings..."}</p>
      </div>
    );
  }

  const sandbox = data.environments.sandbox;
  const production = data.environments.production;
  const ob = data.onboarding;

  const badge = (done: boolean) =>
    done
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";

  return (
    <div className="grid max-w-2xl gap-4 rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">FBR / PRAL integration</h2>
        <Link href="/settings/fbr" className="rounded-md bg-win-600 px-3 py-1.5 text-sm text-white">
          Open FBR setup
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        Configure a sandbox token, test it, then activate production from the guided setup. Tokens are encrypted at rest
        and never shown again after saving.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">Sandbox</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${badge(sandbox?.configured)}`}>
              {sandbox?.configured ? "Configured" : "Not configured"}
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>Token test: {sandbox?.tested ? "passed" : "not run"}</li>
            <li>Scenario suite: {ob.sandbox_suite_passed ? "passed" : "not run"}</li>
            {sandbox?.last_tested_at && <li className="text-xs text-slate-400">Last tested {fmtWhen(sandbox.last_tested_at)}</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">Production</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${badge(production?.configured)}`}>
              {production?.configured ? "Configured" : "Not configured"}
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>
              Active environment:{" "}
              <span className={ob.production_active ? "font-medium text-emerald-700" : "text-slate-500"}>
                {ob.production_active ? "yes" : "no"}
              </span>
            </li>
            <li>Production token test: {production?.tested ? "passed" : "not run"}</li>
            {production?.last_tested_at && <li className="text-xs text-slate-400">Last tested {fmtWhen(production.last_tested_at)}</li>}
          </ul>
        </div>
      </div>
    </div>
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
