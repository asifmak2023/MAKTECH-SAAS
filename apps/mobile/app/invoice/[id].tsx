import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyInvoice() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/invoices/${id}`} />;
}
