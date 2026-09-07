import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { apiBase } from "../../src/lib/api";

type Invoice = {
  seller_business_name: string;
  buyer_business_name: string;
  status: string;
  grand_total: number;
};

export default function Approve() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${apiBase()}/api/public/invoices/${token}`)
      .then((r) => r.json())
      .then((data) => setInvoice(data.invoice));
  }, [token]);

  async function decide(action: "approve" | "reject") {
    const res = await fetch(`${apiBase()}/api/public/invoices/${token}/${action}`, { method: "POST" });
    const data = await res.json();
    setMessage(data.message);
    setInvoice(data.invoice);
  }

  if (!invoice) return <Text className="p-4">Loading...</Text>;

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-xl font-semibold">{invoice.seller_business_name}</Text>
      <Text>Buyer: {invoice.buyer_business_name}</Text>
      <Text>Status: {invoice.status}</Text>
      <Text className="my-3 text-lg">PKR {Number(invoice.grand_total).toFixed(2)}</Text>
      {message ? <Text className="mb-3 text-win-600">{message}</Text> : null}
      {invoice.status === "pending_approval" ? (
        <View className="gap-3">
          <Pressable className="rounded bg-emerald-700 p-3" onPress={() => decide("approve")}>
            <Text className="text-center text-white">Approve</Text>
          </Pressable>
          <Pressable className="rounded bg-rose-600 p-3" onPress={() => decide("reject")}>
            <Text className="text-center text-white">Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
