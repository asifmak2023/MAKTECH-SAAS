import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { api, setSession, webAppUrl } from "../src/lib/api";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    try {
      const res = await api<{ token: string; tenant: { slug: string } | null }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setSession(res.token, res.tenant?.slug ?? "");
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-1 text-center text-xl font-bold uppercase tracking-widest">PRAL Digital Invoicing System</Text>
      <Text className="mb-8 text-center text-sm text-neutral-500">Sign in to your workspace.</Text>

      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Username</Text>
      <TextInput
        className="mb-4 border border-neutral-300 px-3 py-3 text-neutral-900"
        value={username}
        onChangeText={setUsername}
        placeholder="Your workspace username"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        placeholderTextColor="#a3a3a3"
      />

      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Password</Text>
      <TextInput
        className="mb-3 border border-neutral-300 px-3 py-3 text-neutral-900"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoComplete="password"
        placeholderTextColor="#a3a3a3"
        onSubmitEditing={submit}
      />

      {error ? <Text className="mb-3 text-sm text-black">{error}</Text> : null}

      <Pressable className="items-center bg-black py-3" onPress={submit}>
        <Text className="text-sm font-semibold uppercase tracking-wider text-white">Sign in</Text>
      </Pressable>

      <View className="mt-6 items-center">
        <Text className="text-sm text-neutral-500">
          New seller?{" "}
          <Text
            className="font-semibold text-neutral-900 underline"
            onPress={() => Linking.openURL(`${webAppUrl()}/register`)}
          >
            Create account
          </Text>
        </Text>
        <Pressable className="mt-3" onPress={() => Linking.openURL(`${webAppUrl()}/forgot-password`)}>
          <Text className="text-sm text-neutral-500 underline">Forgot your password?</Text>
        </Pressable>
      </View>
    </View>
  );
}
