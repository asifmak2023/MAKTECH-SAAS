"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { money, fmtWhen, ActivityItem, BillingOrder, BillingPayment } from "@/lib/admin";
import { statusStyles, formatStatus } from "@/lib/status";

type Dashboard = {
  tenants: { total: number; trial: number; active: number; past_due: number; grace: number; suspended: number };
  users: number;
  finance: { gross_revenue: number; paid_payments: number; open_orders: number; unpaid_invoices: number };
  subscriptions: Record<string, number>;
  recent_orders: BillingOrder[];
  recent_payments: BillingPayment[];
};

const card = "rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]";
const pill = (s: string) => `rounded-full px-2 py-1 text-xs ${statusStyles[s] || "bg-slate-100 text-slate-600"}`;

export default function AdminOverviewPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
    api<{ items: ActivityItem[] }>("/api/admin/activity?limit=30")
      .then((r) => setActivity(r.items))
      .catch(() => undefined);
  }, []);

  if (error && !data) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading platform overview...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Platform overview</h1>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Tenants</h2>
        <div className="grid gap-4 md:grid-cols-6">
          {[
            ["Total", data.tenants.total, "text-slate-900"],
            ["Trial", data.tenants.trial, "text-sky-600"],
            ["Active", data.tenants.active, "text-emerald-600"],
            ["Past due", data.tenants.past_due, "text-orange-600"],
            ["Grace", data.tenants.grace, "text-amber-600"],
            ["Suspended", data.tenants.suspended, "text-rose-600"],
          ].map(([label, value, color]) => (
            <div key={label as string} className={card}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className={card}>
            <p className="text-xs text-slate-500">Platform users</p>
            <p className="mt-1 text-2xl font-semibold">{data.users}</p>
          </div>
          <div className={card}>
            <p className="text-xs text-slate-500">Subscriptions by status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(data.subscriptions).length === 0 && <span className="text-sm text-slate-400">No subscriptions yet</span>}
              {Object.entries(data.subscriptions).map(([status, count]) => (
                <span key={status} className={pill(status)}>
                  {formatStatus(status)} · {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Finance</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Gross revenue", `PKR ${money(data.finance.gross_revenue)}`, ""],
            ["Paid payments", String(data.finance.paid_payments), ""],
            ["Open orders", String(data.finance.open_orders), ""],
            ["Unpaid invoices", `PKR ${money(data.finance.unpaid_invoices)}`, ""],
          ].map(([label, value]) => (
            <div key={label} className={card}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Live activity</h2>
        <div className={`${card} max-h-[420px] overflow-y-auto`}>
          {activity.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
          <ul className="divide-y divide-slate-100">
            {activity.map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={pill(item.type)}>{item.type}</span>
                    <span className={pill(item.status ?? item.event.split(".")[0])}>{formatStatus(item.event)}</span>
                    {item.tenant && <span className="font-medium text-slate-700">{item.tenant.name}</span>}
                  </div>
                  <p className="mt-1 truncate text-slate-600">{item.message}</p>
                  {item.error && <p className="mt-0.5 text-xs text-rose-600">{item.error}</p>}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  <div>{fmtWhen(item.at)}</div>
                  {item.order_number && <div className="mt-0.5">{item.order_number}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent orders</h2>
            <Link className="text-sm text-win-600" href="/admin/billing">View billing</Link>
          </div>
          <div className={card}>
            {data.recent_orders.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}
            <ul className="divide-y divide-slate-100">
              {data.recent_orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{o.order_number}</p>
                    <p className="text-xs text-slate-500">{o.tenant?.name} · {formatStatus(o.order_type)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={pill(o.status)}>{formatStatus(o.status)}</span>
                    <span className="text-sm font-medium">{money(o.total_amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent payments</h2>
            <Link className="text-sm text-win-600" href="/admin/billing">View billing</Link>
          </div>
          <div className={card}>
            {data.recent_payments.length === 0 && <p className="text-sm text-slate-400">No payments yet.</p>}
            <ul className="divide-y divide-slate-100">
              {data.recent_payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{p.gateway_code.toUpperCase()}</p>
                    <p className="text-xs text-slate-500">{p.tenant?.name} · {p.order?.order_number || fmtWhen(p.initiated_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={pill(p.status)}>{formatStatus(p.status)}</span>
                    <span className="text-sm font-medium">{money(p.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
