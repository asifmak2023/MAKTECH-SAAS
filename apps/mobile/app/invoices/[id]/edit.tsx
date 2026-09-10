import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../../src/lib/api";
import InvoiceForm, { InvoiceData } from "../../../src/ui/InvoiceForm";
import MobileShell from "../../../src/ui/MobileShell";
import { AlertBanner, Eyebrow, LoadingBlock, PageTitle } from "../../../src/ui/primitives";
import { View } from "react-native";

export default function EditInvoicePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<InvoiceData>(`/api/invoices/${id}`).then(setInvoice).catch((err) => setError(err.message));
  }, [id]);

  return (
    <MobileShell>
      <Eyebrow>Workspace</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 20 }}>
        <PageTitle>Edit invoice</PageTitle>
      </View>
      {error ? <AlertBanner tone="err" text={error} /> : null}
      {invoice ? <InvoiceForm invoice={invoice} /> : <LoadingBlock label="Loading..." />}
    </MobileShell>
  );
}
