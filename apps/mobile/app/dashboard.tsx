import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";
import { money } from "../src/lib/status";
import { useTheme } from "../src/lib/ThemeContext";
import { fonts } from "../src/lib/theme";
import MobileShell from "../src/ui/MobileShell";
import { AlertBanner, Button, EmptyState, Eyebrow, Field, PageTitle, StatusChip } from "../src/ui/primitives";

type InvoiceRow = {
  id: number;
  buyer_business_name: string;
  status: string;
  grand_total: number;
  invoice_date: string;
};

type Stats = {
  draft: number;
  pending_approval: number;
  approved: number;
  submitted: number;
  failed: number;
  customers?: number;
  recent: InvoiceRow[];
};

type Onboarding = {
  onboarding: {
    seller_profile_complete: boolean;
    sandbox_configured: boolean;
    sandbox_tested: boolean;
    production_active: boolean;
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvoiceRow[] | null>(null);
  const [onb, setOnb] = useState<Onboarding | null>(null);

  const load = useCallback(() => {
    api<Stats>("/api/dashboard")
      .then(setStats)
      .catch((err) => setError(err.message));
    api<Onboarding>("/api/settings/fbr")
      .then(setOnb)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searching = query.trim().length > 0;
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api<{ data: InvoiceRow[] }>(`/api/invoices?search=${encodeURIComponent(q)}`)
        .then((res) => setResults(res.data || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const list = searching ? results : stats?.recent;
  const cards: Array<[string, number | undefined]> = [
    ["Draft", stats?.draft],
    ["Pending", stats?.pending_approval],
    ["Approved", stats?.approved],
    ["Submitted", stats?.submitted],
    ["Failed", stats?.failed],
    ["Clients", stats?.customers],
  ];

  const pendingSetup =
    onb && !onb.onboarding.sandbox_tested
      ? !onb.onboarding.seller_profile_complete
        ? "Add your seller NTN/CNIC and business name"
        : !onb.onboarding.sandbox_configured
          ? "Add a sandbox token to start validating invoices"
          : "Run the token test and scenario suite"
      : null;

  return (
    <MobileShell>
      <View style={{ marginBottom: 20, gap: 12 }}>
        <Eyebrow>Workspace</Eyebrow>
        <PageTitle>Dashboard</PageTitle>
        <Button label="Create invoice" onPress={() => router.push("/invoices/create")} />
      </View>
      {error ? <AlertBanner tone="err" text={error} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: colors.stroke, marginBottom: 16 }}>
        {cards.map(([label, value]) => (
          <View key={label} style={{ width: "50%", padding: 16, borderColor: colors.stroke, borderWidth: 0.5, backgroundColor: colors.surface }}>
            <Text style={{ fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: colors.textMuted }}>
              {label}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 24, fontWeight: "600", color: colors.foreground }}>
              {value ?? 0}
            </Text>
          </View>
        ))}
      </View>
      {onb && pendingSetup ? (
        <View style={{ marginBottom: 16, borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.accentSoft, padding: 14 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary }}>
            <Text style={{ fontWeight: "600", color: colors.foreground }}>Finish FBR setup. </Text>
            {pendingSetup}.
          </Text>
          <Button label="FBR setup" kind="ghost" onPress={() => router.push("/settings")} style={{ marginTop: 10 }} />
        </View>
      ) : null}
      {onb && !pendingSetup && onb.onboarding.sandbox_tested && !onb.onboarding.production_active ? (
        <View style={{ marginBottom: 16, borderWidth: 1, borderColor: colors.foreground, backgroundColor: colors.surface, padding: 14 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary }}>
            <Text style={{ fontWeight: "600", color: colors.foreground }}>Sandbox verified. </Text>
            Ready to activate production.
          </Text>
          <Button label="Go live" kind="ghost" onPress={() => router.push("/settings")} style={{ marginTop: 10 }} />
        </View>
      ) : null}
      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.stroke }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "500", color: colors.foreground, marginBottom: 8 }}>
            {searching ? "Search results" : "Recent invoices"}
          </Text>
          <Field label="" value={query} onChangeText={setQuery} placeholder="Search all invoices…" />
        </View>
        {searching && results === null ? (
          <Text style={{ padding: 16, fontFamily: fonts.body, color: colors.textMuted }}>Searching…</Text>
        ) : list && list.length > 0 ? (
          list.map((inv) => (
            <Pressable
              key={inv.id}
              onPress={() => router.push(`/invoices/${inv.id}`)}
              style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.stroke, gap: 6 }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: "500", color: colors.foreground }}>
                {inv.buyer_business_name}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>
                #{inv.id} · {inv.invoice_date?.slice(0, 10)}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <StatusChip status={inv.status} />
                <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  PKR {money(inv.grand_total)}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState text={searching ? `No invoices match “${query.trim()}”.` : stats ? "No invoices yet." : "Loading…"} />
        )}
      </View>
    </MobileShell>
  );
}
