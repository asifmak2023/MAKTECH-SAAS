import { useEffect, useState } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiBase } from "../../src/lib/api";
import { money } from "../../src/lib/status";
import { useTheme } from "../../src/lib/ThemeContext";
import { fonts } from "../../src/lib/theme";
import { AlertBanner, Button, Eyebrow, Field, LoadingBlock, PageTitle, StatusChip } from "../../src/ui/primitives";

type Invoice = {
  seller_business_name: string;
  buyer_business_name: string;
  invoice_date: string;
  status: string;
  grand_total: number;
  last_error?: string | null;
  fbr_invoice_number?: string | null;
  items?: Array<{ product_description: string; quantity: number; total_values: number }>;
};

export default function Approve() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${apiBase()}/api/public/invoices/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setInvoice(data.invoice);
        setCanDecide(Boolean(data.can_decide));
      })
      .catch(() => setError("Invoice not found"));
  }, [token]);

  async function decide(action: "approve" | "reject") {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/api/public/invoices/${token}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not update invoice");
        return;
      }
      setMessage(data.message);
      setInvoice(data.invoice);
      setCanDecide(false);
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.page, paddingTop: insets.top }}>
        {error ? <AlertBanner tone="err" text={error} /> : <LoadingBlock label="Loading invoice..." />}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: Math.max(insets.bottom, 24),
        paddingHorizontal: 16,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 20 }}>
        <Eyebrow>FBR Digital Invoicing System</Eyebrow>
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <PageTitle>Invoice from {invoice.seller_business_name}</PageTitle>
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>Buyer: {invoice.buyer_business_name}</Text>
        <View style={{ marginTop: 10 }}>
          <StatusChip status={invoice.status} />
        </View>
        <Text style={{ marginTop: 16, fontFamily: fonts.body, fontSize: 18, fontWeight: "600", color: colors.foreground }}>
          Amount: PKR {money(invoice.grand_total)}
        </Text>
        {invoice.fbr_invoice_number ? (
          <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 13, color: colors.foreground }}>FBR No: {invoice.fbr_invoice_number}</Text>
        ) : null}
        <View style={{ marginTop: 16 }}>
          {(invoice.items || []).map((item, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.stroke, paddingVertical: 10 }}>
              <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.foreground }}>
                {item.product_description} × {item.quantity}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.foreground }}>PKR {money(item.total_values)}</Text>
            </View>
          ))}
        </View>
        <Button
          label="Download PDF"
          kind="ghost"
          onPress={() => Share.share({ url: `${apiBase()}/api/public/invoices/${token}/pdf`, message: `Invoice PDF` })}
          style={{ marginTop: 16 }}
        />
        {message ? <AlertBanner tone="ok" text={message} /> : null}
        {error ? <AlertBanner tone="err" text={error} /> : null}
        {canDecide ? (
          <View style={{ marginTop: 8 }}>
            <Field label="" value={note} onChangeText={setNote} placeholder="Rejection note (optional)" multiline />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Approve" onPress={() => decide("approve")} disabled={busy} style={{ flex: 1 }} />
              <Button label="Reject" kind="danger" onPress={() => decide("reject")} disabled={busy} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
