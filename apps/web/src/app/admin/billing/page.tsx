"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Paginated, BillingOrder, BillingPayment, BillingInvoice, fmtWhen, money } from "@/lib/admin";
import { statusStyles, formatStatus } from "@/lib/status";

const card = "rounded-xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]";
const pill = (s: string) => `rounded-full px-2 py-1 text-xs ${statusStyles[s] || "bg-slate-100 text-slate-600"}`;

type Tab = "orders" | "payments" | "invoices";

const orderStatuses = ["", "pending", "payment_processing", "paid", "failed", "cancelled", "expired", "refunded"];
const orderTypes = ["", "subscription", "package", "pay_per_invoice", "overage", "adjustment", "credit", "refund"];
const paymentStatuses = ["", "pending", "processing", "paid", "failed", "cancelled", "expired", "refunded", "partially_refunded"];
const invoiceStatuses = ["", "unpaid", "paid", "partially_refunded", "refunded", "void"];

export default function AdminBillingPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Paginated<BillingOrder> | null>(null);
  const [payments, setPayments] = useState<Paginated<BillingPayment> | null>(null);
  const [invoices, setInvoices] = useState<Paginated<BillingInvoice> | null>(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [orderType, setOrderType] = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [invStatus, setInvStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadTab(t: Tab, os = orderStatus, ot = orderType, ps = payStatus, is_ = invStatus) {
    setError("");
    try {
      if (t === "orders") {
        const q = new URLSearchParams();
        if (os) q.set("status", os);
        if (ot) q.set("type", ot);
        setOrders(await api<Paginated<BillingOrder>>(`/api/admin/billing/orders?${q}`));
      } else if (t === "payments") {
        const q = new URLSearchParams();
        if (ps) q.set("status", ps);
        setPayments(await api<Paginated<BillingPayment>>(`/api/admin/billing/payments?${q}`));
      } else {
        const q = new URLSearchParams();
        if (is_) q.set("status", is_);
        setInvoices(await api<Paginated<BillingInvoice>>(`/api/admin/billing/invoices?${q}`));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing data");
    }
  }

  async function refund(order: BillingOrder) {
    const amount = window.prompt(`Refund amount for ${order.order_number} (max PKR ${money(order.total_amount)}):`, order.total_amount);
    if (amount === null) return;
    const reason = window.prompt("Reason for refund:", "") ?? "";
    try {
      await api(`/api/admin/billing/orders/${order.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), reason }),
      });
      setNotice(`Refund recorded for ${order.order_number}.`);
      loadTab("orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    }
  }

  async function paymentAction(p: BillingPayment, action: "confirm" | "fail") {
    try {
      await api(`/api/admin/billing/payments/${p.id}/${action}`, { method: "POST" });
      setNotice(`Payment ${p.id} ${action}ed.`);
      loadTab("payments");
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action} payment`);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="flex gap-1 rounded-[10px] bg-black/[0.035] p-1 text-sm w-fit">
        {(["orders", "payments", "invoices"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-[7px] px-3 py-1.5 capitalize transition-all ${
              tab === t ? "bg-white font-semibold text-win-700 shadow-sm" : "text-slate-600 hover:bg-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      {tab === "orders" && (
        <>
          <div className="flex flex-wrap gap-3">
            <select value={orderStatus} onChange={(e) => { setOrderStatus(e.target.value); loadTab("orders", e.target.value, orderType); }}>
              {orderStatuses.map((s) => <option key={s} value={s}>{s === "" ? "All statuses" : formatStatus(s)}</option>)}
            </select>
            <select value={orderType} onChange={(e) => { setOrderType(e.target.value); loadTab("orders", orderStatus, e.target.value); }}>
              {orderTypes.map((s) => <option key={s} value={s}>{s === "" ? "All types" : formatStatus(s)}</option>)}
            </select>
          </div>
          <div className={card}>
            {!orders && <p className="text-sm text-slate-500">Loading...</p>}
            {orders && orders.data.length === 0 && <p className="text-sm text-slate-400">No orders found.</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Paid</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders?.data.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-800">{o.order_number}</p>
                      <p className="text-xs text-slate-500">{fmtWhen(o.created_at)}</p>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{o.tenant?.name ?? "—"}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatStatus(o.order_type)}</td>
                    <td className="py-2 pr-3 font-medium">PKR {money(o.total_amount)}</td>
                    <td className="py-2 pr-3 text-slate-600">{o.paid_at ? fmtWhen(o.paid_at) : "—"}</td>
                    <td className="py-2 pr-3"><span className={pill(o.status)}>{formatStatus(o.status)}</span></td>
                    <td className="py-2 text-right">
                      {o.status === "paid" && (
                        <button className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white" onClick={() => refund(o)}>
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders && orders.last_page > 1 && (
              <Pager page={orders.current_page} last={orders.last_page} total={orders.total} onGo={(p) => loadPage(p)} />
            )}
          </div>
        </>
      )}

      {tab === "payments" && (
        <>
          <select value={payStatus} onChange={(e) => { setPayStatus(e.target.value); loadTab("payments", undefined, undefined, e.target.value); }}>
            {paymentStatuses.map((s) => <option key={s} value={s}>{s === "" ? "All statuses" : formatStatus(s)}</option>)}
          </select>
          <div className={card}>
            {!payments && <p className="text-sm text-slate-500">Loading...</p>}
            {payments && payments.data.length === 0 && <p className="text-sm text-slate-400">No payments found.</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Gateway</th>
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments?.data.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 font-medium text-slate-800">{p.gateway_code.toUpperCase()}</td>
                    <td className="py-2 pr-3 text-slate-600">{p.tenant?.name ?? "—"}</td>
                    <td className="py-2 pr-3 text-slate-600">{p.order?.order_number ?? fmtWhen(p.initiated_at)}</td>
                    <td className="py-2 pr-3 font-medium">PKR {money(p.amount)}</td>
                    <td className="py-2 pr-3"><span className={pill(p.status)}>{formatStatus(p.status)}</span></td>
                    <td className="py-2 text-right">
                      {p.status === "processing" && (
                        <button className="mr-1 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => paymentAction(p, "confirm")}>
                          Confirm
                        </button>
                      )}
                      {(p.status === "pending" || p.status === "processing") && (
                        <button className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white" onClick={() => paymentAction(p, "fail")}>
                          Fail
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "invoices" && (
        <>
          <select value={invStatus} onChange={(e) => { setInvStatus(e.target.value); loadTab("invoices", undefined, undefined, undefined, e.target.value); }}>
            {invoiceStatuses.map((s) => <option key={s} value={s}>{s === "" ? "All statuses" : formatStatus(s)}</option>)}
          </select>
          <div className={card}>
            {!invoices && <p className="text-sm text-slate-500">Loading...</p>}
            {invoices && invoices.data.length === 0 && <p className="text-sm text-slate-400">No billing invoices found.</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Issued</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices?.data.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 pr-3 font-medium text-slate-800">{i.invoice_number}</td>
                    <td className="py-2 pr-3 text-slate-600">{i.tenant?.name ?? "—"}</td>
                    <td className="py-2 pr-3 font-medium">PKR {money(i.total_amount)}</td>
                    <td className="py-2 pr-3 text-slate-600">{i.issued_at ? fmtWhen(i.issued_at) : "—"}</td>
                    <td className="py-2"><span className={pill(i.status)}>{formatStatus(i.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  async function loadPage(p: number) {
    const q = new URLSearchParams({ page: String(p) });
    if (orderStatus) q.set("status", orderStatus);
    if (orderType) q.set("type", orderType);
    setOrders(await api<Paginated<BillingOrder>>(`/api/admin/billing/orders?${q}`));
  }
}

function Pager({ page, last, total, onGo }: { page: number; last: number; total: number; onGo: (p: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <button className="rounded-md bg-black/[0.06] px-3 py-1.5 text-slate-700 disabled:opacity-40" disabled={page <= 1} onClick={() => onGo(page - 1)}>Previous</button>
      <span className="text-slate-500">Page {page} of {last} · {total}</span>
      <button className="rounded-md bg-black/[0.06] px-3 py-1.5 text-slate-700 disabled:opacity-40" disabled={page >= last} onClick={() => onGo(page + 1)}>Next</button>
    </div>
  );
}
