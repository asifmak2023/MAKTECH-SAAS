"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { TenantDetail, FbrIntegrationRow, PlanBrief, fmtWhen, fmtDate } from "@/lib/admin";
import { statusStyles, formatStatus, money } from "@/lib/status";
import { provinceOptions } from "@/lib/provinces";

const card = "card-plain p-4";
const pill = (s: string) => `inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[s] || "status-sky"}`;
const statuses = ["pending", "trial", "active", "past_due", "grace_period", "suspended", "cancelled"];

export default function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [t, setT] = useState<TenantDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<PlanBrief[]>([]);

  async function reload() {
    try {
      const res = await api<TenantDetail>(`/api/admin/tenants/${id}`);
      setT(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tenant");
    }
  }

  useEffect(() => {
    reload();
    api<PlanBrief[]>("/api/admin/catalog/plans").then(setPlans).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(path: string, payload: object, okMessage: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/admin/tenants/${id}${path}`, { method: "POST", body: JSON.stringify(payload) });
      setNotice(okMessage);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !t) return <p className="text-sm text-rose-600">{error}</p>;
  if (!t) return <p className="text-sm text-slate-500">Loading tenant...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-black underline underline-offset-4" href="/admin/tenants">← All sellers</Link>
          <p className="eyebrow mt-4 mb-2">Directory</p>
          <h1 className="text-3xl font-medium tracking-tight">{t.name} <span className="text-[#767676]">/{t.slug}</span></h1>
          {t.legal_name && <p className="text-sm text-slate-500">{t.legal_name} · seller profile (no invoices or clients)</p>}
        </div>
        <span className={pill(t.status)}>{formatStatus(t.status)}</span>
      </div>

      {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <section className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Status & subscription</h2>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act("/status", { status: f.get("status"), note: f.get("note") || undefined }, "Status updated.");
            }}
          >
            <div>
              <label>Change status</label>
              <select name="status" defaultValue={t.status}>
                {statuses.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Note</label>
              <input name="note" placeholder="optional" />
            </div>
            <button className="bg-black text-white" disabled={saving}>Apply</button>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Active subscription</p>
            <p className="mt-1 font-medium text-slate-800">
              {t.activeSubscription
                ? `${t.activeSubscription.plan?.name ?? "Plan"} · ${formatStatus(t.activeSubscription.status)}`
                : "None"}
            </p>
            {t.activeSubscription && (
              <p className="text-xs text-slate-500">
                {t.activeSubscription.billing_interval} · PKR {money(t.activeSubscription.price)} · {t.activeSubscription.invoice_limit ?? "∞"} invoices · renews {fmtDate(t.activeSubscription.next_billing_date)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">PRAL</p>
            <p className="mt-1 font-medium text-slate-800">{t.fbr_mode || "sandbox"} · {t.integrator || "pral"}</p>
            <p className="text-xs text-slate-500">
              Sandbox {t.pral?.sandbox.status ?? "unconfigured"} · Production {t.pral?.production.status ?? "unconfigured"}
            </p>
            <p className="text-xs text-slate-500">Auto-submit on buyer approval: {t.auto_submit_on_approval ? "on" : "off"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Usage summary</p>
            <p className="mt-1 font-medium text-slate-800">
              {t.invoices_count} invoices · {t.customers_count} clients · {t.products_count} products
            </p>
            <p className="text-xs text-slate-500">
              {t.usage
                ? `${t.usage.free_credits_remaining} free credits left · ${t.usage.subscription ? `${t.usage.subscription.used}/${t.usage.subscription.invoice_limit ?? "∞"} plan invoices` : "no plan usage"}`
                : `${t.billing_orders_count} SaaS orders · ${t.payments_count} payments`}
            </p>
          </div>
        </div>

        <form
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            act("/subscription", {
              subscription_plan_id: Number(f.get("subscription_plan_id")),
              billing_interval: f.get("billing_interval") || "monthly",
            }, "Subscription assigned.");
          }}
        >
          <div>
            <label>Assign plan</label>
            <select name="subscription_plan_id" required defaultValue={t.activeSubscription?.subscription_plan_id ?? ""}>
              <option value="">Select plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · PKR {p.price}/{p.billing_interval}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Interval</label>
            <select name="billing_interval" defaultValue={t.activeSubscription?.billing_interval ?? "monthly"}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button className="bg-black text-white" disabled={saving}>Assign</button>
        </form>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Owner</p>
            {t.owner ? (
              <p className="mt-1 text-sm text-slate-700">{t.owner.name} <span className="text-slate-400">· {t.owner.email}</span></p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">None</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Contacts</p>
            <p className="mt-1 text-sm text-slate-700">{t.seller_email || "—"} · {t.seller_phone || ""}</p>
            <p className="text-xs text-slate-500">Billing: {t.billing_email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Users</p>
            <p className="mt-1 text-sm text-slate-700">
              {t.users.map((u) => `${u.name} (${u.role})`).join(", ") || "—"}
            </p>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Seller profile</h2>
        <p className="mb-3 text-xs text-slate-500">Platform operators edit the seller account, not their buyers or invoices.</p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {
              legal_name: f.get("legal_name"),
              seller_ntn_cnic: f.get("seller_ntn_cnic"),
              seller_business_name: f.get("seller_business_name"),
              seller_province: f.get("seller_province"),
              seller_address: f.get("seller_address"),
              city: f.get("city"),
              seller_email: f.get("seller_email"),
              seller_phone: f.get("seller_phone"),
              billing_email: f.get("billing_email"),
              registration_type: f.get("registration_type"),
              auto_submit_on_approval: f.get("auto_submit_on_approval") === "on",
            };
            Object.keys(body).forEach((k) => {
              const v = body[k];
              if (typeof v === "string" && v.trim() === "") body[k] = null;
            });
            act2(body);
          }}
        >
          <div><label>Legal name</label><input name="legal_name" defaultValue={t.legal_name ?? ""} /></div>
          <div><label>Registration type</label><input name="registration_type" defaultValue={t.registration_type ?? ""} /></div>
          <div><label>Seller NTN / CNIC</label><input name="seller_ntn_cnic" defaultValue={t.seller_ntn_cnic ?? ""} /></div>
          <div><label>Business name</label><input name="seller_business_name" defaultValue={t.seller_business_name ?? ""} /></div>
          <div>
            <label>Province</label>
            <select name="seller_province" defaultValue={t.seller_province ?? ""}>
              <option value="">Select province</option>
              {provinceOptions(t.seller_province).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div><label>City</label><input name="city" defaultValue={t.city ?? ""} /></div>
          <div className="md:col-span-2"><label>Address</label><input name="seller_address" defaultValue={t.seller_address ?? ""} /></div>
          <div><label>Seller email</label><input name="seller_email" type="email" defaultValue={t.seller_email ?? ""} /></div>
          <div><label>Seller phone</label><input name="seller_phone" defaultValue={t.seller_phone ?? ""} /></div>
          <div><label>Billing email</label><input name="billing_email" type="email" defaultValue={t.billing_email ?? ""} /></div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="auto_submit_on_approval" defaultChecked={t.auto_submit_on_approval} />
              Auto-submit on buyer approval
            </label>
          </div>
          <div className="flex items-end justify-end md:col-span-2">
            <button className="bg-black text-white" disabled={saving}>Save profile</button>
          </div>
        </form>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Free invoice credits</h2>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act("/credits", { quantity: Number(f.get("quantity")), description: f.get("description") || undefined }, "Credits adjusted.");
            }}
          >
            <div>
              <label>Quantity (negative to deduct)</label>
              <input name="quantity" type="number" step="1" required placeholder="e.g. 10 or -5" />
            </div>
            <div>
              <label>Reason</label>
              <input name="description" placeholder="optional" />
            </div>
            <button className="bg-black text-white" disabled={saving}>Adjust</button>
          </form>
        </div>
        <p className="mt-2 text-sm text-slate-500">Current free invoice credits (billing credits account) are managed by the tenant&apos;s billing subscription.</p>
      </section>

      <FbrOverrideSection id={id} rows={t.fbr_integrations ?? []} onSaved={reload} />

      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Subscription history</h2>
        {t.subscriptions.length === 0 && <p className="text-sm text-slate-400">No subscriptions yet.</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 font-medium">Plan</th>
              <th className="pb-2 font-medium">Interval</th>
              <th className="pb-2 font-medium">Price</th>
              <th className="pb-2 font-medium">Period end</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {t.subscriptions.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-3 text-slate-700">{s.plan?.name ?? "—"}</td>
                <td className="py-2 pr-3 text-slate-600">{s.billing_interval}</td>
                <td className="py-2 pr-3 text-slate-600">PKR {money(s.price)}</td>
                <td className="py-2 pr-3 text-slate-600">{fmtDate(s.current_period_end)}</td>
                <td className="py-2"><span className={pill(s.status)}>{formatStatus(s.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );

  async function act2(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/admin/tenants/${id}`, { method: "PUT", body: JSON.stringify(body) });
      setNotice("Profile updated.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }
}

function FbrOverrideSection({
  id,
  rows,
  onSaved,
}: {
  id: string;
  rows: FbrIntegrationRow[];
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const modes: Array<"sandbox" | "production"> = ["sandbox", "production"];
  const rowFor = (mode: string) => (rows ?? []).find((r) => r.mode === mode);

  async function save(mode: string, f: FormData) {
    setBusy(mode);
    setMsg("");
    setErr("");
    const body: Record<string, unknown> = {
      mode,
      integrator: "pral",
      base_url: f.get("base_url") || null,
      validate_endpoint: f.get("validate_endpoint") || null,
      submit_endpoint: f.get("submit_endpoint") || null,
    };
    const token = String(f.get("token") ?? "");
    if (token && token !== "••••••••") body.token = token;
    try {
      await api(`/api/admin/tenants/${id}/fbr`, { method: "PUT", body: JSON.stringify(body) });
      setMsg(`${mode} credentials updated.`);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save credentials");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={card}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">FBR credentials (admin override)</h2>
      {msg && <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      <div className="grid gap-6 md:grid-cols-2">
        {modes.map((mode) => {
          const row = rowFor(mode);
          return (
            <form
              key={mode}
              className="rounded-lg border border-slate-200 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                save(mode, new FormData(e.currentTarget));
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold capitalize text-slate-800">{mode}</h3>
                {row && <span className={pill(row.status)}>{formatStatus(row.status)}</span>}
              </div>
              <div className="space-y-3">
                <div>
                  <label>Base URL</label>
                  <input name="base_url" defaultValue={row?.config?.base_url ?? ""} placeholder="https://gw.fbr.gov.pk" />
                </div>
                <div>
                  <label>Validate endpoint</label>
                  <input name="validate_endpoint" defaultValue={row?.config?.validate_endpoint ?? ""} />
                </div>
                <div>
                  <label>Submit endpoint</label>
                  <input name="submit_endpoint" defaultValue={row?.config?.submit_endpoint ?? ""} />
                </div>
                <div>
                  <label>Token {row?.config?.token && "(blank keeps current)"}</label>
                  <input name="token" type="password" placeholder={row?.config?.token ? "••••••••" : "Paste token"} />
                  <p className="mt-1 text-xs text-slate-400">A key can be bound to one account only — assigning a token already used by another tenant is rejected.</p>
                </div>
                <button className="btn-primary w-full" disabled={busy === mode}>
                  {busy === mode ? "Saving..." : `Save ${mode} credentials`}
                </button>
                {row?.last_tested_at && (
                  <p className="text-xs text-slate-400">Last tested {fmtWhen(row.last_tested_at)}</p>
                )}
              </div>
            </form>
          );
        })}
      </div>
    </section>
  );
}
