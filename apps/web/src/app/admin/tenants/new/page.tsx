"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/PasswordField";
import { api } from "@/lib/api";
import { PlanBrief } from "@/lib/admin";
import { PAKISTAN_PROVINCES } from "@/lib/provinces";

const card = "card-plain p-4";

export default function AddSellerPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanBrief[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<PlanBrief[]>("/api/admin/catalog/plans").then(setPlans).catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const planId = String(f.get("subscription_plan_id") ?? "");
    const payload: Record<string, unknown> = {
      tenant_name: f.get("tenant_name"),
      tenant_slug: f.get("tenant_slug") || undefined,
      legal_name: f.get("legal_name") || undefined,
      seller_ntn_cnic: f.get("seller_ntn_cnic") || undefined,
      seller_business_name: f.get("seller_business_name") || undefined,
      seller_province: f.get("seller_province") || undefined,
      seller_address: f.get("seller_address") || undefined,
      city: f.get("city") || undefined,
      seller_email: f.get("seller_email") || undefined,
      seller_phone: f.get("seller_phone") || undefined,
      billing_email: f.get("billing_email") || undefined,
      registration_type: f.get("registration_type") || undefined,
      trial_days: f.get("trial_days") ? Number(f.get("trial_days")) : undefined,
      free_invoice_credits: f.get("free_invoice_credits") ? Number(f.get("free_invoice_credits")) : undefined,
      owner: {
        name: f.get("owner_name"),
        email: f.get("owner_email"),
        password: f.get("owner_password") || undefined,
        phone: f.get("owner_phone") || undefined,
      },
      billing_interval: f.get("billing_interval") || "monthly",
    };
    if (planId) payload.subscription_plan_id = Number(planId);

    try {
      const created = await api<{ id: number }>("/api/admin/tenants", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.replace(`/admin/tenants/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create seller");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link className="text-sm text-black underline underline-offset-4" href="/admin/tenants">← All sellers</Link>
        <p className="eyebrow mt-4 mb-2">Directory</p>
        <h1 className="text-3xl font-medium tracking-tight">Add seller</h1>
        <p className="mt-1 text-sm text-[#767676]">Create a SaaS tenant and owner login. This is not a buyer/client of a seller.</p>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <form onSubmit={onSubmit} className={`${card} space-y-6`}>
        <section className="grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Company</h2>
          <div>
            <label htmlFor="tenant_name">Company name</label>
            <input id="tenant_name" name="tenant_name" required />
          </div>
          <div>
            <label htmlFor="tenant_slug">Username</label>
            <input id="tenant_slug" name="tenant_slug" placeholder="acme-traders" />
          </div>
          <div>
            <label htmlFor="legal_name">Legal name</label>
            <input id="legal_name" name="legal_name" />
          </div>
          <div>
            <label htmlFor="registration_type">Registration type</label>
            <input id="registration_type" name="registration_type" placeholder="Registered / Unregistered" />
          </div>
          <div>
            <label htmlFor="seller_ntn_cnic">NTN / CNIC</label>
            <input id="seller_ntn_cnic" name="seller_ntn_cnic" />
          </div>
          <div>
            <label htmlFor="seller_business_name">Business name</label>
            <input id="seller_business_name" name="seller_business_name" />
          </div>
          <div>
            <label htmlFor="seller_province">Province</label>
            <select id="seller_province" name="seller_province" defaultValue="">
              <option value="">Select province</option>
              {PAKISTAN_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="seller_address">Address</label>
            <input id="seller_address" name="seller_address" />
          </div>
          <div>
            <label htmlFor="seller_email">Seller email</label>
            <input id="seller_email" name="seller_email" type="email" />
          </div>
          <div>
            <label htmlFor="seller_phone">Seller phone</label>
            <input id="seller_phone" name="seller_phone" />
          </div>
          <div>
            <label htmlFor="billing_email">Billing email</label>
            <input id="billing_email" name="billing_email" type="email" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Owner login</h2>
          <div>
            <label htmlFor="owner_name">Name</label>
            <input id="owner_name" name="owner_name" required />
          </div>
          <div>
            <label htmlFor="owner_email">Email</label>
            <input id="owner_email" name="owner_email" type="email" required />
          </div>
          <PasswordField id="owner_password" name="owner_password" optionalHint="Leave blank to auto-generate" />
          <div>
            <label htmlFor="owner_phone">Phone</label>
            <input id="owner_phone" name="owner_phone" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Plan & credits</h2>
          <div>
            <label htmlFor="subscription_plan_id">Subscription plan</label>
            <select id="subscription_plan_id" name="subscription_plan_id" defaultValue="">
              <option value="">None yet</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · PKR {p.price}/{p.billing_interval}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="billing_interval">Interval</label>
            <select id="billing_interval" name="billing_interval" defaultValue="monthly">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label htmlFor="trial_days">Trial days</label>
            <input id="trial_days" name="trial_days" type="number" min={0} max={365} placeholder="0" />
          </div>
          <div>
            <label htmlFor="free_invoice_credits">Free invoice credits</label>
            <input id="free_invoice_credits" name="free_invoice_credits" type="number" min={0} placeholder="0" />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="bg-black text-white" disabled={saving}>
            {saving ? "Creating..." : "Create seller"}
          </button>
        </div>
      </form>
    </div>
  );
}
