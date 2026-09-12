"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Paginated, BillingOrder, BillingPayment, BillingInvoice, fmtWhen, money } from "@/lib/admin";
import { statusStyles, formatStatus } from "@/lib/status";

const card = "card-plain p-4";
const pill = (s: string) => `inline-flex px-2.5 py-1 text-xs font-medium ${statusStyles[s] || "status-sky"}`;

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

  function generateReceipt(order: BillingOrder) {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      alert('Please allow popups to generate receipt');
      return;
    }

    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Order Receipt - ${order.order_number}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #333; }
        .header p { color: #666; margin: 5px 0; }
        .receipt-details { margin: 20px 0; }
        .receipt-details table { width: 100%; border-collapse: collapse; }
        .receipt-details th, .receipt-details td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .receipt-details th { background-color: #f5f5f5; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
        .status { padding: 5px 10px; border-radius: 4px; font-weight: bold; }
        .status.paid { background-color: #d4edda; color: #155724; }
        .status.pending { background-color: #fff3cd; color: #856404; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>ORDER RECEIPT</h1>
        <p>FBR Digital Invoicing System</p>
        <p>${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="receipt-details">
        <table>
            <tr>
                <th>Order Number</th>
                <td>${order.order_number}</td>
            </tr>
            <tr>
                <th>Order Type</th>
                <td>${formatStatus(order.order_type)}</td>
            </tr>
            <tr>
                <th>Tenant</th>
                <td>${order.tenant?.name || 'N/A'}</td>
            </tr>
            <tr>
                <th>Order Date</th>
                <td>${fmtWhen(order.created_at)}</td>
            </tr>
            <tr>
                <th>Status</th>
                <td><span class="status ${order.status}">${formatStatus(order.status)}</span></td>
            </tr>
            <tr>
                <th>Reference</th>
                <td>${order.order_number || 'N/A'}</td>
            </tr>
            <tr class="total-row">
                <th>Total Amount</th>
                <td>PKR ${money(order.total_amount)}</td>
            </tr>
        </table>
    </div>
    
    <div class="footer">
        <p>This is an official receipt from the FBR Digital Invoicing System</p>
        <p>For inquiries, contact support</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>`;

    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow mb-2">Finance</p>
        <h1 className="text-3xl font-medium tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-[#767676]">SaaS subscription and package payments from sellers — not B-to-C invoices.</p>
      </div>

      <div className="flex w-fit gap-1 text-sm">
        {(["orders", "payments", "invoices"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 capitalize ${
              tab === t ? "bg-black text-white" : "bg-white text-[#525252]"
            }`}
          >
            {t === "invoices" ? "SaaS invoices" : t}
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
                      <button className="mr-1 border border-black px-2 py-1 text-xs text-black" onClick={() => generateReceipt(o)}>
                        Receipt
                      </button>
                      {o.status === "paid" && (
                        <button className="border border-black px-2 py-1 text-xs text-black" onClick={() => refund(o)}>
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
                        <button className="mr-1 bg-black px-2 py-1 text-xs text-white" onClick={() => paymentAction(p, "confirm")}>
                          Confirm
                        </button>
                      )}
                      {(p.status === "pending" || p.status === "processing") && (
                        <button className="border border-black px-2 py-1 text-xs text-black" onClick={() => paymentAction(p, "fail")}>
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
            {invoices && invoices.data.length === 0 && <p className="text-sm text-slate-400">No SaaS invoices found.</p>}
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
