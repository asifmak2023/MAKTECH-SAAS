import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../../src/lib/api";
import { ClientShow, clientDisplayName, clientTaxNo } from "../../../src/lib/clients";
import { money } from "../../../src/lib/status";
import { useTheme } from "../../../src/lib/ThemeContext";
import { fonts } from "../../../src/lib/theme";
import ConfirmDialog from "../../../src/ui/ConfirmDialog";
import MobileShell from "../../../src/ui/MobileShell";
import { AlertBanner, Button, EmptyState, Eyebrow, LoadingBlock, PageTitle, StatusChip } from "../../../src/ui/primitives";

export default function ClientDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<ClientShow | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const load = useCallback(() => {
    api<ClientShow>(`/api/customers/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive() {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/customers/${data.customer.id}/${data.customer.is_active ? "archive" : "restore"}`, { method: "POST" });
      setConfirmArchive(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <MobileShell>
        <AlertBanner tone="err" text={error} />
      </MobileShell>
    );
  }

  if (!data) {
    return (
      <MobileShell>
        <LoadingBlock label="Loading..." />
      </MobileShell>
    );
  }

  const c = data.customer;
  const meta = [c.name !== clientDisplayName(c) ? c.name : null, c.city, c.province].filter(Boolean).join(" · ") || "—";

  return (
    <MobileShell>
      <Eyebrow>Directory</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 12 }}>
        <PageTitle>{clientDisplayName(c)}</PageTitle>
        <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>{meta}</Text>
      </View>
      <StatusChip status={c.is_active ? "active" : "archived"} />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 16 }}>
        <Button label="Edit" kind="ghost" onPress={() => router.push(`/clients/${c.id}/edit`)} style={{ flex: 1 }} />
        <Button
          label={c.is_active ? "Archive" : "Restore"}
          kind="danger"
          onPress={() => (c.is_active ? setConfirmArchive(true) : toggleActive())}
          disabled={busy}
          style={{ flex: 1 }}
        />
      </View>
      {error ? <AlertBanner tone="err" text={error} /> : null}
      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16, marginBottom: 16, gap: 12 }}>
        {[
          ["Email", c.email],
          ["Phone", c.phone],
          ["Tax no", clientTaxNo(c)],
          ["Registration type", c.registration_type],
          ["Billing address", c.address],
        ].map(([label, value]) => (
          <View key={label}>
            <Text style={{ fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted }}>
              {label}
            </Text>
            <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 15, color: colors.foreground }}>{value || "—"}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground, flexShrink: 1 }}>
          Invoices ({data.customer.invoices_count ?? data.recent_invoices.length})
        </Text>
      </View>
      <Button
        label="New invoice for this client"
        onPress={() => router.push(`/invoices/create?client=${c.id}`)}
        style={{ marginBottom: 12 }}
      />
      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface }}>
        {data.recent_invoices.map((inv) => (
          <Pressable
            key={inv.id}
            onPress={() => router.push(`/invoices/${inv.id}`)}
            style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.stroke, gap: 6 }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: "500", color: colors.foreground }}>
              {inv.fbr_invoice_number || `#${inv.id}`}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>{inv.invoice_date?.slice(0, 10)}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <StatusChip status={inv.status} />
              <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                PKR {money(inv.grand_total)}
              </Text>
            </View>
          </Pressable>
        ))}
        {data.recent_invoices.length === 0 ? <EmptyState text="No invoices for this client yet." /> : null}
      </View>
      <ConfirmDialog
        open={confirmArchive}
        title="Archive client"
        message="Archive this client? They will be hidden from new invoice autofill."
        confirmLabel="Archive"
        onConfirm={toggleActive}
        onClose={() => setConfirmArchive(false)}
      />
    </MobileShell>
  );
}
