import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f766e" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "PRAL Invoicing" }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="billing" options={{ title: "Billing" }} />
        <Stack.Screen name="create" options={{ title: "New invoice" }} />
        <Stack.Screen name="invoice/[id]" options={{ title: "Invoice" }} />
        <Stack.Screen name="approve/[token]" options={{ title: "Approve invoice" }} />
      </Stack>
    </>
  );
}
