"use client";

import AppShell from "@/components/AppShell";
import { api, getToken } from "@/lib/api";
import { formatStatus, money } from "@/lib/status";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type PaymentRow = {
  id: number;
  status: string;
  gateway_code?: string;
  gateway_name?: string | null;
  provider_reference?: string | null;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  currency?: string | null;
  plan?: { name: string } | null;
  payments?: PaymentRow[];
};

const pill = (status: string) => (
  <span className="inline-block rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-800">{formatStatus(status)}</span>
);

const TERMINAL = new Set(["paid", "cancelled", "refunded", "expired", "failed"]);

function ReturnContent() {
  const router = useRouter();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const orderId = params.get("order");
  const queryPayment = params.get("payment");

  const [order, setOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "info" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setNotice(null);
    try {
      const data = await api<Order>(`/api/billing/orders/${orderId}`);
      setOrder(data);
      if (!TERMINAL.has(data.status)) {
        timer.current = setTimeout(() => setAttempt((n) => n + 1), 4000);
      }
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Could not load the payment status." });
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [orderId, attempt, load]);

  const payment: PaymentRow | undefined =
    order?.payments?.find((p) => queryPayment && String(p.id) === String(queryPayment)) || order?.payments?.[0];

  const status = order?.status;
  const loading = !order && !notice;
  const awaiting = !!status && !TERMINAL.has(status);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payment return</h1>
          <p className="text-sm text-slate-500">
            {orderId ? `Order ${orderId} payment status after being redirected back from the bank.` : "Redirected from the payment provider."}
          </p>
        </div>
        <Link
          href="/billing"
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          Back to billing
        </Link>
      </div>

      {!getToken() ? (
        <div className="max-w-lg rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
          <p className="font-semibold">You need to sign in to view this payment.</p>
          <p className="mt-1 text-sm text-slate-600">
            {payment?.provider_reference ? `Transaction reference: ${payment.provider_reference}. ` : ""}
            Once the payment clears it is applied to your account automatically.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 rounded-md bg-win-600 px-4 py-2 text-sm text-white"
          >
            Sign in
          </button>
        </div>
      ) : loading ? (
        <p className="text-sm text-slate-500">Checking payment status...</p>
      ) : (
        <div className="max-w-lg rounded-xl bg-white border border-black/[0.06] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-12px_rgba(0,0,0,0.14)]">
          {notice && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                notice.kind === "err" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-800"
              }`}
            >
              {notice.text}
            </div>
          )}

          {order && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{payment?.gateway_name || "Raast (P2M)"}</p>
                  <p className="mt-1 text-xs text-slate-500">Order {order.order_number}</p>
                </div>
                {pill(order.status)}
              </div>

              <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
                {order.plan?.name && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Plan</dt>
                    <dd className="font-medium">{order.plan.name}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-medium">
                    {money(order.total_amount)} {order.currency || "PKR"}
                  </dd>
                </div>
                {payment?.provider_reference && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Reference</dt>
                    <dd className="font-mono text-xs">{payment.provider_reference}</dd>
                  </div>
                )}
              </dl>

              {status === "paid" ? (
                <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Payment received. Your plan is now active and your billing account is settled.
                </div>
              ) : awaiting ? (
                <>
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    The bank has not confirmed this payment yet. This page refreshes automatically - your plan
                    activates the moment the Raast webhook confirms it. You can close this page and check again later.
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        setAttempt((n) => n + 1);
                        setTimeout(() => setBusy(false), 1200);
                      }}
                      className="rounded-md bg-win-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {busy ? "Checking..." : "Check again"}
                    </button>
                    <button
                      onClick={() => router.push("/billing")}
                      className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600"
                    >
                      Go to billing
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  This order is {formatStatus(order.status)}. No further action is needed unless you want to start a new
                  payment.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<AppShell>Loading...</AppShell>}>
      <ReturnContent />
    </Suspense>
  );
}
