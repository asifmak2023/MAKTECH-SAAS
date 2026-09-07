import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";

export default function CreateInvoice() {
  const router = useRouter();
  const [buyer, setBuyer] = useState("");
  const [address, setAddress] = useState("Karachi");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("1000");
  const [error, setError] = useState("");

  async function submit() {
    try {
      const res = await api<{ id: number }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          invoice_type: "Sale Invoice",
          invoice_date: new Date().toISOString().slice(0, 10),
          buyer_business_name: buyer,
          buyer_province: "Sindh",
          buyer_address: address,
          buyer_registration_type: "Registered",
          items: [
            {
              hs_code: "0101.2100",
              product_description: description,
              rate: "18%",
              uom: "Numbers, pieces, units",
              quantity: 1,
              value_sales_excluding_st: Number(value),
              sale_type: "Goods at standard rate (default)",
            },
          ],
        }),
      });
      router.replace(`/invoice/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Text className="mb-2">Buyer</Text>
      <TextInput className="mb-3 rounded border p-3" value={buyer} onChangeText={setBuyer} />
      <Text className="mb-2">Address</Text>
      <TextInput className="mb-3 rounded border p-3" value={address} onChangeText={setAddress} />
      <Text className="mb-2">Item description</Text>
      <TextInput className="mb-3 rounded border p-3" value={description} onChangeText={setDescription} />
      <Text className="mb-2">Value excluding ST</Text>
      <TextInput className="mb-3 rounded border p-3" keyboardType="numeric" value={value} onChangeText={setValue} />
      {error ? <Text className="mb-3 text-rose-600">{error}</Text> : null}
      <Pressable className="rounded-lg bg-win-600 p-3" onPress={submit}>
        <Text className="text-center text-white">Save draft</Text>
      </Pressable>
    </ScrollView>
  );
}
