import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { api, getToken } from "../src/lib/api";

type Invoice = {
  id: number;
  buyer_business_name: string;
  status: string;
  grand_total: number;
};

export default function Home() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ data: Invoice[] }>("/api/invoices")
      .then((res) => setInvoices(res.data || []))
      .catch((err) => setError(err.message));
  }, [router]);

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-semibold">Invoices</Text>
        <View className="flex-row items-center gap-3">
          <Link href="/billing" className="rounded bg-slate-200 px-3 py-2 text-slate-700">
            Billing
          </Link>
          <Link href="/create" className="rounded-lg bg-win-600 px-3 py-2 text-white">
            New
          </Link>
        </View>
      </View>
      {error ? <Text className="text-rose-600">{error}</Text> : null}
      {invoices.map((inv) => (
        <Pressable
          key={inv.id}
          className="mb-3 rounded-xl bg-white p-4"
          onPress={() => router.push(`/invoice/${inv.id}`)}
        >
          <Text className="font-semibold">{inv.buyer_business_name}</Text>
          <Text className="text-slate-500">{inv.status}</Text>
          <Text>PKR {Number(inv.grand_total).toFixed(2)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
