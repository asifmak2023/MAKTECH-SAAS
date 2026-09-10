import { useCallback, useEffect, useState } from "react";
import { Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, apiBase, getTenantSlug, getToken } from "../../../src/lib/api";
import { Client, clientDisplayName } from "../../../src/lib/clients";
import { isInvoiceEditable, money } from "../../../src/lib/status";
import { useTheme } from "../../../src/lib/ThemeContext";
import { fonts } from "../../../src/lib/theme";
import ConfirmDialog from "../../../src/ui/ConfirmDialog";
import MobileShell from "../../../src/ui/MobileShell";
import { AlertBanner, Button, Eyebrow, LoadingBlock, PageTitle, StatusChip } from "../../../src/ui/primitives";

type Invoice = {
  id: number;
  buyer_business_name: string;
  invoice_date: string;
  invoice_type: string;
  status: string;
  last_error?: string | null;
  fbr_invoice_number?: string | null;
  grand_total: number;
  subtotal: number;
  sales_tax_total: number;
  approval_token: string;
  customer?: Client | null;
  items?: Array<{
    id: number;
    hs_code: string;
    product_description: string;
    quantity: number;
    rate: string;
    value_sales_excluding_st: number;
    sales_tax_applicable: number;
    total_values: number;
  }>;
};

export default function InvoiceDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    api<Invoice>(`/api/invoices/${id}`).then(setInvoice).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(path: string, success: string) {
    setError("");
    setMessage("");
    try {
      await api(`/api/invoices/${id}/${path}`, { method: "POST" });
      setMessage(success);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function onDelete() {
    setDeleting(true);
    setError("");
    try {
      await api(`/api/invoices/${id}`, { method: "DELETE" });
      router.replace("/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function sharePdf() {
    const url = `${apiBase()}/api/invoices/${id}/pdf`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken() || ""}`,
          "X-Tenant": getTenantSlug() || "",
        },
      });
      if (!res.ok) throw new Error("Could not download PDF");
      await Share.share({ url, message: `Invoice PDF: ${url}` });
    } catch {
      await Share.share({ message: `Invoice PDF: ${url}` });
    }
  }

  if (!invoice) {
    return (
      <MobileShell>
        {error ? <AlertBanner tone="err" text={error} /> : <LoadingBlock label="Loading..." />}
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <View style={{ marginBottom: 16, gap: 8 }}>
        <Eyebrow>Invoice</Eyebrow>
        <PageTitle>{invoice.buyer_business_name}</PageTitle>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>
          {invoice.invoice_type} · {invoice.invoice_date?.slice(0, 10)}
        </Text>
        <StatusChip status={invoice.status} />
      </View>
      {invoice.customer ? (
        <Text style={{ marginBottom: 12, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>
          Client: {clientDisplayName(invoice.customer)}
        </Text>
      ) : null}
      {invoice.fbr_invoice_number ? <AlertBanner tone="ok" text={`FBR invoice number: ${invoice.fbr_invoice_number}`} /> : null}
      {invoice.last_error ? <AlertBanner tone="err" text={invoice.last_error} /> : null}
      {message ? <AlertBanner tone="neutral" text={message} /> : null}
      {error ? <AlertBanner tone="err" text={error} /> : null}

      <View style={{ gap: 10, marginBottom: 16 }}>
        {invoice.status === "draft" ? (
          <Button label="Send for approval" onPress={() => action("send-for-approval", "Sent for buyer approval")} />
        ) : null}
        {invoice.status === "approved" || invoice.status === "failed" ? (
          <Button label="Submit to PRAL" onPress={() => action("submit", "Submitted to PRAL")} />
        ) : null}
        {isInvoiceEditable(invoice.status) ? (
          <>
            <Button label="Edit" kind="ghost" onPress={() => router.push(`/invoices/${invoice.id}/edit`)} />
            <Button label={deleting ? "Deleting..." : "Delete"} kind="danger" onPress={() => setConfirmDelete(true)} disabled={deleting} />
          </>
        ) : null}
        <Button label="Download PDF" kind="ghost" onPress={sharePdf} />
        <Button
          label="Public approval link"
          kind="ghost"
          onPress={() => router.push(`/approve/${invoice.approval_token}`)}
        />
      </View>

      <View style={{ borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surface, padding: 16 }}>
        {(invoice.items || []).map((item) => (
          <View key={item.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.stroke, paddingBottom: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: "500", color: colors.foreground }}>
              {item.product_description}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              HS {item.hs_code} · Qty {item.quantity} · {item.rate}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              Value {money(item.value_sales_excluding_st)} · ST {money(item.sales_tax_applicable)}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 4 }}>
              PKR {money(item.total_values)}
            </Text>
          </View>
        ))}
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary }}>Subtotal: PKR {money(invoice.subtotal)}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary }}>Sales tax: PKR {money(invoice.sales_tax_total)}</Text>
        <Text style={{ marginTop: 4, fontFamily: fonts.body, fontSize: 16, fontWeight: "600", color: colors.foreground }}>
          Grand total: PKR {money(invoice.grand_total)}
        </Text>
      </View>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete invoice"
        message="Delete this invoice? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </MobileShell>
  );
}
