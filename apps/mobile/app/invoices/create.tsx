import { useLocalSearchParams } from "expo-router";
import MobileShell from "../../src/ui/MobileShell";
import InvoiceForm from "../../src/ui/InvoiceForm";
import { Eyebrow, PageTitle } from "../../src/ui/primitives";
import { View } from "react-native";

export default function CreateInvoicePage() {
  const { client } = useLocalSearchParams<{ client?: string }>();
  return (
    <MobileShell>
      <Eyebrow>Workspace</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 20 }}>
        <PageTitle>Create invoice</PageTitle>
      </View>
      <InvoiceForm prefillClientId={client} />
    </MobileShell>
  );
}
