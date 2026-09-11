"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ActivityItem, fmtWhen } from "@/lib/admin";
import { formatStatus, statusStyles } from "@/lib/status";

type Dashboard = {
  pral: {
    sandbox_configured: number;
    production_configured: number;
    failed_today: number;
    last_event_at: string | null;
    last_status: string | null;
    sandbox_status: string;
    production_status: string;
  };
  support: { open: number; in_progress: number; active: number };
  errors_today: number;
  finance: { pending_manual_payments: number; open_orders: number };
};

const card = "card-plain p-4";
const pill = (s: string) => `inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[s] || "status-sky"}`;

export default function AdminMonitoringPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/admin/dashboard").then(setData).catch((e) => setError(e.message));
    api<{ items: ActivityItem[] }>("/api/admin/activity?limit=80")
      .then((r) => setActivity(r.items))
      .catch(() => undefined);
  }, []);

  if (error && !data) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading monitoring...</p>;

  const failures = activity.filter((i) => i.type === "fbr" || i.error || i.event.includes("fail") || i.event.includes("error"));

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Health</p>
        <h1 className="text-3xl font-medium tracking-tight">Monitoring</h1>
        <p className="mt-1 text-sm text-[#767676]">PRAL health, submission errors, and platform incidents — not a seller invoice list.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className={card}>
          <p className="text-xs text-slate-500">Sandbox</p>
          <p className="mt-1 text-lg font-semibold">{formatStatus(data.pral.sandbox_status)}</p>
          <p className="text-xs text-slate-500">{data.pral.sandbox_configured} sellers configured</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Production</p>
          <p className="mt-1 text-lg font-semibold">{formatStatus(data.pral.production_status)}</p>
          <p className="text-xs text-slate-500">{data.pral.production_configured} sellers configured</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Failed today</p>
          <p className="mt-1 text-2xl font-semibold text-rose-600">{data.pral.failed_today}</p>
          <p className="text-xs text-slate-500">Last {fmtWhen(data.pral.last_event_at)}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Errors / support</p>
          <p className="mt-1 text-2xl font-semibold">{data.errors_today}</p>
          <p className="text-xs text-slate-500">{data.support.active} active tickets · {data.finance.pending_manual_payments} manual payments</p>
        </div>
      </div>

      <section className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">PRAL and error events</h2>
          <Link className="text-sm text-black underline underline-offset-4" href="/admin/support">Open support</Link>
        </div>
        {failures.length === 0 && <p className="text-sm text-slate-400">No recent failures.</p>}
        <ul className="divide-y divide-slate-100">
          {failures.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-4 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={pill(item.type)}>{item.type}</span>
                  <span className={pill(item.status ?? "failed")}>{formatStatus(item.event)}</span>
                  {item.tenant && (
                    <Link className="font-medium text-black underline underline-offset-4" href={`/admin/tenants/${item.tenant.id}`}>{item.tenant.name}</Link>
                  )}
                </div>
                <p className="mt-1 text-slate-600">{item.message}</p>
                {item.error && <p className="mt-0.5 text-xs text-rose-600">{item.error}</p>}
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">{fmtWhen(item.at)}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
