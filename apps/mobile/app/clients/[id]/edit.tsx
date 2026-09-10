import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../../src/lib/api";
import { ClientShow } from "../../../src/lib/clients";
import ClientForm from "../../../src/ui/ClientForm";
import MobileShell from "../../../src/ui/MobileShell";
import { AlertBanner, Eyebrow, LoadingBlock, PageTitle } from "../../../src/ui/primitives";

export default function EditClientPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ClientShow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ClientShow>(`/api/customers/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [id]);

  return (
    <MobileShell>
      <Eyebrow>Directory</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 20 }}>
        <PageTitle>Edit client</PageTitle>
      </View>
      {error ? <AlertBanner tone="err" text={error} /> : null}
      {data ? <ClientForm client={data.customer} /> : <LoadingBlock label="Loading..." />}
    </MobileShell>
  );
}
