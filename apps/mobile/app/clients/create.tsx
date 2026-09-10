import { View } from "react-native";
import ClientForm from "../../src/ui/ClientForm";
import MobileShell from "../../src/ui/MobileShell";
import { Eyebrow, PageTitle } from "../../src/ui/primitives";

export default function CreateClientPage() {
  return (
    <MobileShell>
      <Eyebrow>Directory</Eyebrow>
      <View style={{ marginTop: 8, marginBottom: 20 }}>
        <PageTitle>Add client</PageTitle>
      </View>
      <ClientForm />
    </MobileShell>
  );
}
