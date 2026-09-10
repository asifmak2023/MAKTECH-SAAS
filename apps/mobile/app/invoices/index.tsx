import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { isInvoiceEditable, money } from "../../src/lib/status";
import { useTheme } from "../../src/lib/ThemeContext";
import { fonts } from "../../src/lib/theme";
import ConfirmDialog from "../../src/ui/ConfirmDialog";
import MobileShell from "../../src/ui/MobileShell";
import { AlertBanner, Button, EmptyState, Eyebrow, Field, PageTitle, StatusChip } from "../../src/ui/primitives";

type Invoice = {
  id: number;
  buyer_business_name: string;
  status: string;
  grand_total: number;
  invoice_date: string;
};

export default function InvoicesPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null);

  const load = useCallback((q: string) => {
    const url = q.trim() ? `/api/invoices?search=${encodeURIComponent(q.trim())}` : "/api/invoices";
    api<{ data: Invoice[] }>(url)
      .then((res) => setRows(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  async function onDelete() {
    if (!pendingDelete) return;
    try {
      await api(`/api/invoices/${pendingDelete.id}`, { method: "DELETE" });
      setPendingDelete(null);
      load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setPendingDelete(null);
    }
  }

  return (
    <MobileShell>
      <Eyebrow>Ledger</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 16 }}>
        <PageTitle>Invoices</PageTitle>
      </View>
      <Field value={query} onChangeText={setQuery} placeholder="Search buyer, invoice ref or FBR no…" label="" />
      <Button label="Create invoice" onPress={() => router.push("/invoices/create")} style={{ marginBottom: 16 }} />
      {error ? <AlertBanner tone="err" text={error} /> : null}
      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface }}>
        {rows.map((inv) => (
          <View
            key={inv.id}
            style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.stroke, gap: 8 }}
          >
            <Pressable onPress={() => router.push(`/invoices/${inv.id}`)}>
              <Text style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: "500", color: colors.foreground, textDecorationLine: "underline" }}>
                {inv.buyer_business_name}
              </Text>
            </Pressable>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted }}>{inv.invoice_date?.slice(0, 10)}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <StatusChip status={inv.status} />
              <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                PKR {money(inv.grand_total)}
              </Text>
            </View>
            {isInvoiceEditable(inv.status) ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <Button
                  label="Edit"
                  kind="ghost"
                  onPress={() => router.push(`/invoices/${inv.id}/edit`)}
                  style={{ flex: 1 }}
                />
                <Button label="Delete" kind="danger" onPress={() => setPendingDelete(inv)} style={{ flex: 1 }} />
              </View>
            ) : null}
          </View>
        ))}
        {rows.length === 0 ? (
          <EmptyState text={query.trim() ? `No invoices match “${query.trim()}”.` : "No invoices yet."} />
        ) : null}
      </View>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete invoice"
        message="Delete this invoice? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onClose={() => setPendingDelete(null)}
      />
    </MobileShell>
  );
}
