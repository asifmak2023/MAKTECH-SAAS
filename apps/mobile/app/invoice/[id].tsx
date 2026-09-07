import { useEffect, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api, apiBase } from "../../src/lib/api";

type Invoice = {
  id: number;
  buyer_business_name: string;
  status: string;
  grand_total: number;
  fbr_invoice_number?: string | null;
  last_error?: string | null;
};

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [message, setMessage] = useState("");

  function load() {
    api<Invoice>(`/api/invoices/${id}`).then(setInvoice);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function send() {
    await api(`/api/invoices/${id}/send-for-approval`, { method: "POST" });
    setMessage("Sent for approval");
    load();
  }

  async function submitPral() {
    await api(`/api/invoices/${id}/submit`, { method: "POST" });
    setMessage("Submitted to PRAL");
    load();
  }

  async function sharePdf() {
    const url = `${apiBase()}/api/invoices/${id}/pdf`;
    await Share.share({ url, message: `Invoice PDF: ${url}` });
  }

  if (!invoice) return <Text className="p-4">Loading...</Text>;

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-xl font-semibold">{invoice.buyer_business_name}</Text>
      <Text className="mb-2 text-slate-500">{invoice.status}</Text>
      <Text className="mb-4">PKR {Number(invoice.grand_total).toFixed(2)}</Text>
      {invoice.fbr_invoice_number ? <Text>FBR: {invoice.fbr_invoice_number}</Text> : null}
      {invoice.last_error ? <Text className="text-rose-600">{invoice.last_error}</Text> : null}
      {message ? <Text className="text-win-600">{message}</Text> : null}
      {invoice.status === "draft" ? (
        <Pressable className="mb-3 rounded-lg bg-win-600 p-3" onPress={send}>
          <Text className="text-center text-white">Send for approval</Text>
        </Pressable>
      ) : null}
      {invoice.status === "approved" || invoice.status === "failed" ? (
        <Pressable className="mb-3 rounded-lg bg-win-600 p-3" onPress={submitPral}>
          <Text className="text-center text-white">Submit to PRAL</Text>
        </Pressable>
      ) : null}
      <Pressable className="rounded bg-slate-200 p-3" onPress={sharePdf}>
        <Text className="text-center">Share PDF</Text>
      </Pressable>
    </View>
  );
}
