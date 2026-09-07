import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, getToken } from "../src/lib/api";

type Plan = { id: number; name: string; price: number; invoice_limit: number | null };
type Pkg = { id: number; name: string; price: number; invoice_quantity: number };
type Gateway = { code: string; name: string };

type Summary = {
  tenant: { status: string };
  currency: string;
  outstanding_balance: number;
  subscription: null | { id: number; plan: string; status: string; price: number; next_billing_date: string | null };
  usage: {
    free_credits_remaining: number;
    free_credits_used: number;
    packages: Array<{ id: number; name: string; used: number; purchased: number }>;
    subscription: null | { plan: string; invoice_limit: number | null; used: number };
    unlimited: boolean;
  };
  payment_gateways: Gateway[];
};

type Catalog = { currency: string; plans: Plan[]; packages: Pkg[]; payment_gateways: Gateway[] };
type Order = { id: number; order_number: string; order_type: string; status: string; total_amount: number; package?: { name: string } | null; plan?: { name: string } | null };

const fmt = (n: number) => Number(n || 0).toFixed(2);
const cap = (s: string) => (s ? s.replaceAll("_", " ") : "");

export default function Billing() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, c, o] = await Promise.all([
      api<Summary>("/api/billing/summary"),
      api<Catalog>("/api/catalog"),
      api<{ data: Order[] }>("/api/billing/orders"),
    ]);
    setSummary(s);
    setCatalog(c);
    setOrders(o.data || []);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load().catch((err) => setNotice(err.message));
  }, [router, load]);

  const gateway = () => {
    const gw = summary?.payment_gateways || catalog?.payment_gateways || [];
    return gw.find((g) => g.code === "mock")?.code || gw[0]?.code || "mock";
  };

  const pay = async (path: string, body: Record<string, unknown>) => {
    setBusy(true);
    setNotice("");
    try {
      const res = await api<{ manual: boolean; message?: string }>(path, { method: "POST", body: JSON.stringify(body) });
      setNotice(res.manual ? `Payment pending — follow the instructions.` : res.message || "Done.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!summary) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  const cur = summary.currency || "PKR";
  const sub = summary.subscription;

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {notice ? <Text className="mb-3 rounded bg-sky-100 p-3 text-sky-800">{notice}</Text> : null}

      <View className="mb-4 rounded-xl bg-white p-4">
        <Text className="text-xs uppercase text-slate-500">Subscription</Text>
        <Text className="text-lg font-semibold">{sub ? `${sub.plan} · ${cap(sub.status)}` : "No active subscription"}</Text>
        {sub ? (
          <Text className="text-slate-500">
            PKR {fmt(sub.price)} {cur}/mo{sub.next_billing_date ? ` · renews ${sub.next_billing_date.slice(0, 10)}` : ""}
          </Text>
        ) : (
          <Text className="text-slate-500">Invoices draw from free credits and packages.</Text>
        )}
        <Text className="mt-2 text-xs text-slate-500">Account: {cap(summary.tenant.status)}</Text>
      </View>

      <View className="mb-4 rounded-xl bg-white p-4">
        <Text className="text-xs uppercase text-slate-500">Outstanding balance</Text>
        <Text className="text-lg font-semibold">PKR {fmt(summary.outstanding_balance)}</Text>
        {summary.outstanding_balance > 0 && (
          <Pressable
            disabled={busy}
            onPress={() => pay("/api/billing/overage/settle", { gateway: gateway() })}
            className="mt-3 rounded-lg bg-win-600 px-3 py-2"
          >
            <Text className="text-center text-sm text-white">{busy ? "Processing..." : `Settle via ${gateway()}`}</Text>
          </Pressable>
        )}
      </View>

      <View className="mb-4 rounded-xl bg-white p-4">
        <Text className="mb-2 text-sm font-semibold">Allowance</Text>
        <Text className="text-slate-600">
          Free credits: {summary.usage.free_credits_remaining} remaining ({summary.usage.free_credits_used} used)
        </Text>
        {summary.usage.subscription ? (
          <Text className="text-slate-600">
            {summary.usage.subscription.plan}: {summary.usage.subscription.used} of {summary.usage.subscription.invoice_limit} used
          </Text>
        ) : null}
        {summary.usage.packages.map((p) => (
          <Text key={p.id} className="text-slate-600">
            {p.name}: {p.used} of {p.purchased} used
          </Text>
        ))}
        {summary.usage.unlimited ? <Text className="text-win-600">Unlimited invoicing on your plan.</Text> : null}
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-sm font-semibold">Plans</Text>
        {(catalog?.plans || []).map((plan) => (
          <View key={plan.id} className="mb-2 rounded-xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-semibold">{plan.name}</Text>
                <Text className="text-slate-500">{plan.invoice_limit ? `${plan.invoice_limit} invoices / month` : "Unlimited invoices"}</Text>
              </View>
              <Text className="font-semibold">
                PKR {fmt(plan.price)}/{cur === "PKR" ? "mo" : ""}
              </Text>
            </View>
            <Pressable
              disabled={busy}
              onPress={() => pay("/api/billing/subscribe", { subscription_plan_id: plan.id, interval: "monthly", gateway: gateway() })}
              className="mt-2 rounded-lg bg-win-600 px-3 py-2"
            >
              <Text className="text-center text-sm text-white">{busy ? "Processing..." : sub?.plan === plan.name ? "Re-subscribe" : "Subscribe"}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-sm font-semibold">Invoice packages</Text>
        {(catalog?.packages || []).map((pkg) => (
          <View key={pkg.id} className="mb-2 rounded-xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-semibold">{pkg.name}</Text>
                <Text className="text-slate-500">{pkg.invoice_quantity} invoice allowance</Text>
              </View>
              <Text className="font-semibold">PKR {fmt(pkg.price)}</Text>
            </View>
            <Pressable
              disabled={busy}
              onPress={() => pay("/api/billing/packages", { usage_package_id: pkg.id, gateway: gateway() })}
              className="mt-2 rounded-lg bg-win-600 px-3 py-2"
            >
              <Text className="text-center text-sm text-white">{busy ? "Processing..." : "Buy package"}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View className="mb-6 rounded-xl bg-white p-4">
        <Text className="mb-2 text-sm font-semibold">Recent orders</Text>
        {orders.length === 0 ? <Text className="text-slate-400">No orders yet.</Text> : null}
        {orders.map((o) => (
          <View key={o.id} className="flex-row items-center justify-between border-t border-slate-100 py-2">
            <View>
              <Text className="text-xs text-slate-600">{o.order_number}</Text>
              <Text className="text-xs text-slate-500">{o.package?.name || o.plan?.name || cap(o.order_type)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs">PKR {fmt(o.total_amount)}</Text>
              <Text className="text-xs text-slate-500">{cap(o.status)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
