"use client";

import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { formatStatus, money } from "@/lib/status";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Plan = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: number;
  annual_price: number | null;
  currency: string;
  invoice_limit: number | null;
  overage_allowed: boolean;
  overage_price: number | null;
  trial_days: number;
};

type Gateway = { code: string; name: string; sandbox?: boolean };

type Catalog = {
  currency: string;
  price_per_invoice: number;
  max_invoice_price: number;
  payment_gateways: Gateway[];
  plans: Plan[];
};

type SubscribeResult = {
  order: { id: number; order_number: string; total_amount: number; status: string };
  subscription?: { id: number; status: string; plan?: { name: string } | null } | null;
  payment?: { id: number; status: string; provider_reference?: string | null } | null;
  gateway?: { code: string; name: string; sandbox: boolean } | null;
  status: string;
  manual: boolean;
  message?: string;
  redirect_url?: string | null;
  instructions?: string[];
};

type CompleteResult = {
  payment: { id: number; status: string };
  order: { id: number; order_number: string; status: string };
  subscription?: { id: number; status: string; plan?: { name: string } | null } | null;
  status: string;
  message?: string;
};

type Phase = "form" | "pending_payment" | "done" | "cancelled";

const pill = (status: string) => (
  <span className="status-sky">{formatStatus(status)}</span>
);

export default function SubscribePage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [gatewayCode, setGatewayCode] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "info" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (plan) setPlanId(Number(plan));
  }, []);

  const load = useCallback(async () => {
    try {
      const c = await api<Catalog>("/api/catalog");
      setCatalog(c);
      setGatewayCode((prev) => {
        if (prev) return prev;
        const list = c.payment_gateways || [];
        if (list.some((g) => g.code === "raast")) return "raast";
        return list[0]?.code || "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the plan catalogue.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const plans = catalog?.plans || [];
  const gateways = catalog?.payment_gateways || [];
  const currency = catalog?.currency || "PKR";
  const plan = plans.find((p) => p.id === planId) || plans[0] || null;
  const amount = plan ? (interval === "yearly" && plan.annual_price !== null ? plan.annual_price : plan.price) : 0;
  const gateway = gateways.find((g) => g.code === gatewayCode);

  const subscribe = useCallback(async () => {
    if (!plan || !gatewayCode) return;
    setBusy("Starting checkout");
    setNotice(null);
    try {
      const res = await api<SubscribeResult>("/api/billing/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription_plan_id: plan.id, interval, gateway: gatewayCode, auto_renew: true }),
      });
      if (res.redirect_url && !res.gateway?.sandbox) {
        window.location.assign(res.redirect_url);
        return;
      }
      setResult(res);
      setPhase(res.status === "paid" ? "done" : "pending_payment");
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Checkout failed." });
    } finally {
      setBusy(null);
    }
  }, [plan, interval, gatewayCode]);

  const completePayment = useCallback(async () => {
    if (!result?.payment) return;
    setBusy("Confirming payment");
    setNotice(null);
    try {
      const res = await api<CompleteResult>(`/api/billing/payments/${result.payment.id}/complete`, { method: "POST" });
      setResult((prev) => (prev ? { ...prev, status: "paid", payment: res.payment, subscription: res.subscription } : prev));
      setNotice({ kind: "ok", text: res.message || "Payment successful. Your subscription is now active." });
      setPhase("done");
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Payment could not be confirmed." });
    } finally {
      setBusy(null);
    }
  }, [result]);

  const cancelOrder = useCallback(async () => {
    if (!result?.order) return;
    setBusy("Cancelling");
    setNotice(null);
    try {
      await api(`/api/billing/orders/${result.order.id}/cancel`, { method: "POST" });
      setNotice({ kind: "info", text: "Order cancelled. No payment was taken." });
      setPhase("cancelled");
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Could not cancel the order." });
    } finally {
      setBusy(null);
    }
  }, [result]);

  if (error) {
    return (
      <AppShell>
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Account</p>
          <h1 className="text-3xl font-medium tracking-tight">Subscribe to a plan</h1>
          <p className="mt-1 text-sm text-[#767676]">Choose a plan, pay through the selected gateway, and it activates once payment succeeds.</p>
        </div>
        <button
          onClick={() => router.push("/billing")}
          className="btn-ghost"
        >
          Back to billing
        </button>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            notice.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : notice.kind === "info"
                ? "bg-sky-50 text-sky-800"
                : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {!catalog ? (
        <p className="text-sm text-slate-500">Loading plans...</p>
      ) : phase === "done" ? (
        <div className="card-plain max-w-lg p-6">
          <p className="text-lg font-semibold text-emerald-700">Subscription active</p>
          <p className="mt-1 text-sm text-slate-600">
            {result?.subscription?.plan?.name || plan?.name || "Your plan"} is now active
            {result?.order?.order_number ? ` (order ${result.order.order_number})` : ""}.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.push("/billing")}
              className="btn-primary"
            >
              Go to billing
            </button>
            <button
              onClick={() => {
                setPhase("form");
                setResult(null);
              }}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600"
            >
              Subscribe again
            </button>
          </div>
        </div>
      ) : phase === "cancelled" ? (
        <div className="card-plain max-w-lg p-6">
          <p className="text-lg font-semibold text-slate-700">Order cancelled</p>
          <p className="mt-1 text-sm text-slate-600">No payment was taken and your current plan is unchanged.</p>
          <button
            onClick={() => {
              setPhase("form");
              setResult(null);
            }}
            className="btn-primary mt-4"
          >
            Back to plans
          </button>
        </div>
      ) : phase === "pending_payment" && result ? (
        <div className="card-plain max-w-lg p-6">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{result.gateway?.name || gateway?.name || gatewayCode}</p>
            {pill(result.order.status)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Order {result.order.order_number}</p>

          <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-medium">{plan?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-medium">
                {money(result.order.total_amount)} {currency}
              </dd>
            </div>
            {result.payment?.provider_reference && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-mono text-xs">{result.payment.provider_reference}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {gateway?.sandbox
              ? `This is a sandbox ${gateway?.name || "gateway"} checkout. No real money moves — confirm the payment to simulate a successful transaction.`
              : result.message || "Follow the payment instructions. Your plan activates once the payment clears."}
          </div>

          <div className="mt-5 flex gap-2">
            {result.redirect_url && !gateway?.sandbox ? (
              <button
                disabled={busy !== null}
                onClick={() => window.location.assign(result.redirect_url as string)}
                className="bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                Continue to {result.gateway?.name || gateway?.name || "payment"}
              </button>
            ) : (
              <button
                disabled={busy !== null}
                onClick={completePayment}
                className="bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {busy ? "Processing..." : `Confirm payment of ${money(result.order.total_amount)} ${currency}`}
              </button>
            )}
            <button
              disabled={busy !== null}
              onClick={cancelOrder}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 disabled:opacity-50"
            >
              Cancel order
            </button>
          </div>
        </div>
      ) : (
        <div className="card-plain max-w-2xl p-6">
          <p className="mb-3 text-xs text-slate-500">Select the plan you want (replaces your current plan once paid):</p>
          <div className="space-y-2">
            {plans.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                  plan?.id === p.id ? "border-black bg-[#f5f5f5]" : "border-[#e5e5e5]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="plan"
                    checked={plan?.id === p.id}
                    onChange={() => setPlanId(p.id)}
                    className="accent-black"
                  />
                  <span>
                    <span className="block font-medium">{p.name}</span>
                    <span className="block text-xs text-slate-500">
                      {p.invoice_limit ? `${p.invoice_limit} invoices / month` : "Unlimited invoices"}
                      {p.overage_allowed && p.overage_price !== null ? ` · overage PKR ${money(p.overage_price)}/invoice` : ""}
                    </span>
                  </span>
                </span>
                <span className="font-semibold">
                  {money(interval === "yearly" && p.annual_price !== null ? p.annual_price : p.price)} {currency}
                  {interval === "yearly" ? "/yr" : "/mo"}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-1 text-xs uppercase text-slate-500">Billing interval</p>
            <div className="inline-flex overflow-hidden border border-[#e5e5e5]">
              {(["monthly", "yearly"] as const).map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider font-label ${
                    interval === iv ? "bg-black text-white" : "bg-white text-[#525252]"
                  }`}
                >
                  {iv}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1 text-xs uppercase text-slate-500">Pay with</p>
            {gateways.length === 0 ? (
              <p className="text-sm text-rose-600">No payment gateway is enabled. Ask the platform admin to enable Raast.</p>
            ) : (
              <div className="space-y-2">
                {gateways.map((g) => (
                  <label
                    key={g.code}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                      gatewayCode === g.code ? "border-black bg-[#f5f5f5]" : "border-[#e5e5e5]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="gateway"
                        checked={gatewayCode === g.code}
                        onChange={() => setGatewayCode(g.code)}
                        className="accent-black"
                      />
                      <span className="font-medium">{g.name}</span>
                      {g.sandbox && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">sandbox</span>}
                    </span>
                    {g.code === "raast" && <span className="text-xs text-slate-400">Raast P2M</span>}
                    {g.code === "jazzcash" && <span className="text-xs text-slate-400">hosted checkout</span>}
                    {g.code === "easypaisa" && <span className="text-xs text-slate-400">hosted checkout</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Total due today</span>
            <span className="text-lg font-semibold">
              {money(amount)} {currency}
            </span>
          </div>

          <button
            disabled={busy !== null || !plan || !gatewayCode}
            onClick={subscribe}
            className="btn-primary mt-4 w-full"
          >
            {busy ? "Processing..." : `Pay ${money(amount)} ${currency} via ${gateway?.name || "gateway"}`}
          </button>
        </div>
      )}
    </AppShell>
  );
}
