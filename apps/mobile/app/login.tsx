import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { api, setSession } from "../src/lib/api";

export default function Login() {
  const router = useRouter();
  const [tenant, setTenant] = useState("maktech");
  const [email, setEmail] = useState("admin@maktech.local");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");

  async function submit() {
    try {
      const res = await api<{ token: string; tenant: { slug: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, tenant }),
      });
      setSession(res.token, res.tenant.slug);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="mb-4 text-2xl font-semibold">Sign in</Text>
      <TextInput className="mb-3 rounded border border-slate-300 p-3" value={tenant} onChangeText={setTenant} placeholder="Tenant" />
      <TextInput className="mb-3 rounded border border-slate-300 p-3" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput className="mb-3 rounded border border-slate-300 p-3" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text className="mb-3 text-rose-600">{error}</Text> : null}
      <Pressable className="rounded-lg bg-win-600 p-3" onPress={submit}>
        <Text className="text-center text-white">Continue</Text>
      </Pressable>
    </View>
  );
}
