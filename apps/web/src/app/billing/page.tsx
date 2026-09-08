"use client";

import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { formatStatus, money, statusStyles } from "@/lib/status";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Plan = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  billing_interval: string;
  price: number;
  annual_price: number | null;
  currency: string;
  invoice_limit: number | null;
  overage_allowed: boolean;
  trial_days: number;
};

type Package = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  invoice_quantity: number;
  price: number;
  validity_days: number | null;
};

type Gateway = { code: string; name: string; sandbox?: boolean };

type Summary = {
  tenant: { id: number; slug: string; name: string; status: string; is_active: boolean; currency: string };
  currency: string;
  billing_mode: string;
  free_invoice_credits: number;
  outstanding_balance: number;
  open_orders: number;
  subscription: null | {
    id: number;
    plan: string;
    status: string;
    interval: string;
    price: number;
    invoice_limit: number | null;
    current_period_end: string | null;
    next_billing_date: string | null;
    grace_ends_at: string | null;
    auto_renew: boolean;
  };
  usage: {
    free_credits_remaining: number;
    free_credits_used: number;
    packages: Array<{ id: number; name: string; purchased: number; used: number; remaining: number }>;
    package_used: number;
    subscription: null | { plan: string; status: string; invoice_limit: number | null; used: number; remaining: number | null; period_end: string | null };
    unlimited: boolean;
    overage_allowed: boolean;
  };
  payment_gateways: Gateway[];
};

type Catalog = {
  currency: string;
  price_per_invoice: number;
  free_invoice_allowance: number;
  payment_gateways: Gateway[];
  plans: Plan[];
  packages: Package[];
};

type Order = {
  id: number;
  order_number: string;
  order_type: string;
  description: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  plan?: { name: string } | null;
  package?: { name: string } | null;
};

type OrdersResponse = { data: Order[] };

type CheckoutResult = {
  order: Order;
  status: string;
  manual: boolean;
  message?: string;
  instructions?: string[];
  payment?: { id: number; reference?: string; status: string };
  subscription?: { id: number; status: string };
};

type RecentEvent = {
  id: number;
  invoice_ref_no: string | null;
  status: string;
  usage_source_type: string | null;
  usage_consumed_at: string | null;
};

function pill(status: string) {
  return <span className={`rounded-full px-2 py-1 text-xs ${statusStyles[status] || "bg-slate-100 text-slate-600"}`}>{formatStatus(status)}</span>;
}

function UsageBar({ label, used, total, sub }: { label: string; used: number; total: number; sub?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {used} / {total} used{sub ? ` · ${sub}` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-400" : "bg-win-600"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "info" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, c, o, u] = await Promise.all([
      api<Summary>("/api/billing/summary"),
      api<Catalog>("/api/catalog"),
      api<OrdersResponse>("/api/billing/orders"),
      api<{ recent_events: RecentEvent[] }>("/api/billing/usage"),
    ]);
    setSummary(s);
    setCatalog(c);
    setOrders(o.data);
    setEvents(u.recent_events);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  const pay = useCallback(
    async (endpoint: string, payload: Record<string, unknown>, label: string) => {
      setBusy(label);
      setNotice(null);
      try {
        const res = await api<CheckoutResult>(endpoint, { method: "POST", body: JSON.stringify(payload) });
        if (res.manual) {
          setNotice({
            kind: "info",
            text: `Payment initiated (${formatStatus(res.status)}). ${res.message || ""}`,
          });
        } else {
          setNotice({ kind: "ok", text: res.message || `${label} completed successfully.` });
        }
        await load();
      } catch (err) {
        setNotice({ kind: "err", text: err instanceof Error ? err.message : "Request failed." });
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const gatewayFor = (over: Gateway[]) => {
    if (!over.length) return "";
    const mock = over.find((g) => g.code === "mock");
    return mock?.code || over[0].code;
  };

  const defaultGateway = gatewayFor(summary?.payment_gateways || []);
  const currency = summary?.currency || "PKR";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Billing &amp; subscriptions</h1>
        <p className="text-sm text-slate-500">Invoices are drawn from free credits first, then packages and your subscription.</p>
      </div>

      {(error || notice) && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            notice?.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : notice?.kind === "info"
                ? "bg-sky-50 text-sky-800"
                : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice?.text || error}
        </div>
      )}

      {!summary ? (
        <p className="text-sm text-slate-500">Loading billing overview...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
            <p className="text-xs uppercase text-slate-500">Subscription</p>
            {summary.subscription ? (
              <>
                <p className="mt-1 text-lg font-semibold capitalize">{summary.subscription.plan}</p>
                <div className="mt-1">{pill(summary.subscription.status)}</div>
                <p className="mt-2 text-xs text-slate-500">
                  {money(summary.subscription.price)} {currency} / {summary.subscription.interval}
                  {summary.subscription.next_billing_date ? ` · renews ${summary.subscription.next_billing_date?.slice(0, 10)}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">No active subscription — invoices draw from credits or packages.</p>
            )}
          </div>
          <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
            <p className="text-xs uppercase text-slate-500">Outstanding balance</p>
            <p className="mt-1 text-lg font-semibold">{money(summary.outstanding_balance)} {currency}</p>
            <p className="text-xs text-slate-500">Overages beyond your allowance</p>
            {summary.outstanding_balance > 0 && (
              <button
                disabled={!defaultGateway || busy !== null}
                onClick={() => pay("/api/billing/overage/settle", { gateway: defaultGateway }, "Settling outstanding usage")}
                className="mt-3 w-full rounded-md bg-win-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? "Processing..." : `Settle via ${defaultGateway || "gateway"}`}
              </button>
            )}
          </div>
          <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
            <p className="text-xs uppercase text-slate-500">Status</p>
            <div className="mt-1">{pill(summary.tenant?.status || "")}</div>
            <p className="mt-2 text-xs text-slate-500">
              Mode: {summary.billing_mode} · {summary.open_orders} open order{summary.open_orders === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}

      {summary && (
        <div className="mt-6 rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
          <h2 className="mb-4 font-semibold">Usage allowance</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <UsageBar label="Free credits" used={summary.usage.free_credits_used} total={summary.usage.free_credits_used + summary.usage.free_credits_remaining} />
            {summary.usage.subscription && (
              <UsageBar
                label={`Subscription (${summary.usage.subscription.plan})`}
                used={summary.usage.subscription.used}
                total={summary.usage.subscription.invoice_limit || 0}
              />
            )}
            {(summary.usage.packages || []).map((p) => (
              <UsageBar key={p.id} label={`${p.name} package`} used={p.used} total={p.purchased} sub={`${p.remaining} remaining`} />
            ))}
            {summary.usage.unlimited && <p className="text-sm text-slate-500">Unlimited invoicing on your current plan.</p>}
            {!summary.usage.unlimited && !summary.usage.packages.length && !summary.usage.subscription && summary.usage.free_credits_remaining === 0 && (
              <p className="text-sm text-amber-700">Allowance exhausted. Buy a package or subscribe to keep submitting.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
          <h2 className="mb-1 font-semibold">Plans</h2>
          <p className="mb-3 text-xs text-slate-500">Subscribe through the payment gateway (Raast P2M). The plan activates once payment succeeds and replaces your current plan.</p>
          <div className="space-y-3">
            {(catalog?.plans || []).map((plan) => (
              <div key={plan.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-slate-500">
                      {plan.invoice_limit ? `${plan.invoice_limit} invoices / month` : "Unlimited invoices"}
                      {plan.overage_allowed ? " · overage allowed" : ""}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {money(plan.price)} {currency}/mo
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/billing/subscribe?plan=${plan.id}`)}
                  className="mt-3 rounded-md bg-win-600 px-3 py-1.5 text-xs text-white"
                >
                  {summary?.subscription?.plan === plan.name ? "Re-subscribe" : "Subscribe"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
          <h2 className="mb-1 font-semibold">Invoice packages</h2>
          <p className="mb-3 text-xs text-slate-500">One-time allowances consumed before your subscription allowance.</p>
          <div className="space-y-3">
            {(catalog?.packages || []).map((pkg) => (
              <div key={pkg.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{pkg.name}</p>
                    <p className="text-xs text-slate-500">{pkg.invoice_quantity} invoice allowance</p>
                  </div>
                  <p className="font-semibold">
                    {money(pkg.price)} {currency}
                  </p>
                </div>
                <button
                  disabled={!defaultGateway || busy !== null}
                  onClick={() => pay("/api/billing/packages", { usage_package_id: pkg.id, gateway: defaultGateway }, `Buying ${pkg.name}`)}
                  className="mt-3 rounded-md bg-win-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                >
                  {busy ? "Processing..." : "Buy package"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
          <h2 className="mb-3 font-semibold">Recent orders</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1">Order</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-slate-400">
                    No orders yet.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="py-2 text-xs text-slate-600">{order.order_number}</td>
                  <td className="text-xs capitalize">
                    {order.package?.name || order.plan?.name || formatStatus(order.order_type)}
                  </td>
                  <td>{pill(order.status)}</td>
                  <td className="text-right text-xs">{money(order.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
          <h2 className="mb-3 font-semibold">Recent usage</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1">Invoice</th>
                <th>Drawn from</th>
                <th className="text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-slate-400">
                    No usage recorded yet.
                  </td>
                </tr>
              )}
              {events.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="py-2 text-xs text-slate-600">{e.invoice_ref_no || `#${e.id}`}</td>
                  <td className="text-xs capitalize">{formatStatus(e.usage_source_type || "free_credit")}</td>
                  <td className="text-right text-xs text-slate-500">{e.usage_consumed_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
