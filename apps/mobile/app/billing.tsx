import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../src/lib/api";
import { formatStatus, money } from "../src/lib/status";
import { useTheme } from "../src/lib/ThemeContext";
import { fonts } from "../src/lib/theme";
import MobileShell from "../src/ui/MobileShell";
import { AlertBanner, Button, EmptyState, Eyebrow, LoadingBlock, PageTitle, StatusChip } from "../src/ui/primitives";

type Plan = { id: number; name: string; price: number; invoice_limit: number | null; overage_allowed?: boolean };
type Pkg = { id: number; name: string; price: number; invoice_quantity: number };
type Gateway = { code: string; name: string };

type Summary = {
  tenant: { status: string };
  currency: string;
  billing_mode?: string;
  outstanding_balance: number;
  open_orders?: number;
  subscription: null | {
    id: number;
    plan: string;
    status: string;
    interval?: string;
    price: number;
    next_billing_date: string | null;
  };
  usage: {
    free_credits_remaining: number;
    free_credits_used: number;
    packages: Array<{ id: number; name: string; used: number; purchased: number; remaining?: number }>;
    subscription: null | { plan: string; invoice_limit: number | null; used: number };
    unlimited: boolean;
  };
  payment_gateways: Gateway[];
};

type Catalog = { currency: string; plans: Plan[]; packages: Pkg[]; payment_gateways: Gateway[] };
type Order = {
  id: number;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: number;
  package?: { name: string } | null;
  plan?: { name: string } | null;
};

function UsageBar({ label, used, total, sub, colors }: { label: string; used: number; total: number; sub?: string; colors: { foreground: string; textMuted: string; stroke: string; accent: string } }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: "500", color: colors.foreground, flexShrink: 1 }}>{label}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>
          {used} / {total} used{sub ? ` · ${sub}` : ""}
        </Text>
      </View>
      <View style={{ height: 2, backgroundColor: colors.stroke }}>
        <View style={{ height: 2, width: `${pct}%`, backgroundColor: colors.accent }} />
      </View>
    </View>
  );
}

export default function BillingPage() {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "info" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
    load().catch((err) => setError(err.message));
  }, [load]);

  const gateways = summary?.payment_gateways || catalog?.payment_gateways || [];
  const defaultGateway = gateways.find((g) => g.code === "mock")?.code || gateways[0]?.code || "";
  const currency = summary?.currency || "PKR";

  const pay = async (endpoint: string, payload: Record<string, unknown>, label: string) => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await api<{ manual: boolean; message?: string; status?: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.manual) {
        setNotice({ kind: "info", text: `Payment initiated (${formatStatus(res.status || "")}). ${res.message || ""}` });
      } else {
        setNotice({ kind: "ok", text: res.message || `${label} completed successfully.` });
      }
      await load();
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Request failed." });
    } finally {
      setBusy(null);
    }
  };

  if (!summary) {
    return (
      <MobileShell>
        {error ? <AlertBanner tone="err" text={error} /> : <LoadingBlock label="Loading billing overview..." />}
      </MobileShell>
    );
  }

  const sub = summary.subscription;

  return (
    <MobileShell>
      <Eyebrow>Account</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 8 }}>
        <PageTitle>Billing & subscriptions</PageTitle>
      </View>
      <Text style={{ marginBottom: 16, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>
        Invoices are drawn from free credits first, then packages and your subscription.
      </Text>
      {error ? <AlertBanner tone="err" text={error} /> : null}
      {notice ? <AlertBanner tone={notice.kind} text={notice.text} /> : null}

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 12 }}>
        <Eyebrow>Subscription</Eyebrow>
        {sub ? (
          <>
            <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 18, fontWeight: "600", color: colors.foreground }}>{sub.plan}</Text>
            <View style={{ marginTop: 8 }}>
              <StatusChip status={sub.status} />
            </View>
            <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>
              {money(sub.price)} {currency} / {sub.interval || "month"}
              {sub.next_billing_date ? ` · renews ${sub.next_billing_date.slice(0, 10)}` : ""}
            </Text>
          </>
        ) : (
          <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>
            No active subscription — invoices draw from credits or packages.
          </Text>
        )}
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 12 }}>
        <Eyebrow>Outstanding balance</Eyebrow>
        <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 18, fontWeight: "600", color: colors.foreground }}>
          {money(summary.outstanding_balance)} {currency}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>Overages beyond your allowance</Text>
        {summary.outstanding_balance > 0 ? (
          <Button
            label={busy ? "Processing..." : `Settle via ${defaultGateway || "gateway"}`}
            onPress={() => pay("/api/billing/overage/settle", { gateway: defaultGateway }, "Settling outstanding usage")}
            disabled={!defaultGateway || busy !== null}
            style={{ marginTop: 12 }}
          />
        ) : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <Eyebrow>Status</Eyebrow>
        <View style={{ marginTop: 8 }}>
          <StatusChip status={summary.tenant?.status || ""} />
        </View>
        <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>
          Mode: {summary.billing_mode || "standard"} · {summary.open_orders || 0} open order{(summary.open_orders || 0) === 1 ? "" : "s"}
        </Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>Usage allowance</Text>
        <UsageBar
          label="Free credits"
          used={summary.usage.free_credits_used}
          total={summary.usage.free_credits_used + summary.usage.free_credits_remaining}
          colors={colors}
        />
        {summary.usage.subscription ? (
          <UsageBar
            label={`Subscription (${summary.usage.subscription.plan})`}
            used={summary.usage.subscription.used}
            total={summary.usage.subscription.invoice_limit || 0}
            colors={colors}
          />
        ) : null}
        {(summary.usage.packages || []).map((p) => (
          <UsageBar
            key={p.id}
            label={`${p.name} package`}
            used={p.used}
            total={p.purchased}
            sub={p.remaining != null ? `${p.remaining} remaining` : undefined}
            colors={colors}
          />
        ))}
        {summary.usage.unlimited ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>Unlimited invoicing on your current plan.</Text>
        ) : null}
        {!summary.usage.unlimited && !summary.usage.packages.length && !summary.usage.subscription && summary.usage.free_credits_remaining === 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.foreground }}>
            Allowance exhausted. Buy a package or subscribe to keep submitting.
          </Text>
        ) : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground }}>Plans</Text>
        <Text style={{ marginTop: 4, marginBottom: 12, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>
          Subscribe through the payment gateway (Raast P2M). The plan activates once payment succeeds and replaces your current plan.
        </Text>
        {(catalog?.plans || []).map((plan) => (
          <View key={plan.id} style={{ borderWidth: 1, borderColor: colors.stroke, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: "500", color: colors.foreground }}>{plan.name}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              {plan.invoice_limit ? `${plan.invoice_limit} invoices / month` : "Unlimited invoices"}
              {plan.overage_allowed ? " · overage allowed" : ""}
            </Text>
            <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 15, fontWeight: "600", color: colors.foreground }}>
              {money(plan.price)} {currency}/mo
            </Text>
            <Button
              label={busy ? "Processing..." : sub?.plan === plan.name ? "Re-subscribe" : "Subscribe"}
              onPress={() =>
                pay("/api/billing/subscribe", { subscription_plan_id: plan.id, interval: "monthly", gateway: defaultGateway }, `Subscribing to ${plan.name}`)
              }
              disabled={!defaultGateway || busy !== null}
              style={{ marginTop: 10 }}
            />
          </View>
        ))}
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground }}>Invoice packages</Text>
        <Text style={{ marginTop: 4, marginBottom: 12, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>
          One-time allowances consumed before your subscription allowance.
        </Text>
        {(catalog?.packages || []).map((pkg) => (
          <View key={pkg.id} style={{ borderWidth: 1, borderColor: colors.stroke, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: "500", color: colors.foreground }}>{pkg.name}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{pkg.invoice_quantity} invoice allowance</Text>
            <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 15, fontWeight: "600", color: colors.foreground }}>
              {money(pkg.price)} {currency}
            </Text>
            <Button
              label={busy ? "Processing..." : "Buy package"}
              onPress={() => pay("/api/billing/packages", { usage_package_id: pkg.id, gateway: defaultGateway }, `Buying ${pkg.name}`)}
              disabled={!defaultGateway || busy !== null}
              style={{ marginTop: 10 }}
            />
          </View>
        ))}
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>Recent orders</Text>
        {orders.length === 0 ? <EmptyState text="No orders yet." /> : null}
        {orders.map((o) => (
          <View key={o.id} style={{ borderTopWidth: 1, borderTopColor: colors.stroke, paddingVertical: 12, gap: 4 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.foreground }}>{o.order_number}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>{o.package?.name || o.plan?.name || formatStatus(o.order_type)}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <StatusChip status={o.status} />
              <Text style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                {currency} {money(o.total_amount)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </MobileShell>
  );
}
