import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRootNavigationState } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { api, getToken, setSession, webAppUrl } from "../src/lib/api";
import { useTheme } from "../src/lib/ThemeContext";
import { fonts } from "../src/lib/theme";
import { AlertBanner, Button, Field } from "../src/ui/primitives";

export default function Login() {
  const navigation = useRootNavigationState();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(Boolean(getToken()));

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await api<{
        token: string;
        tenant: { slug: string } | null;
        is_platform_admin?: boolean;
        account_kind?: string;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const isAdmin = res.account_kind === "platform_admin" || Boolean(res.is_platform_admin);
      setSession(res.token, isAdmin ? "" : (res.tenant?.slug ?? ""));
      setSignedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!navigation?.key) return null;
  if (signedIn) return <Redirect href="/dashboard" />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.authPage }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: Math.max(insets.bottom, 24),
        paddingHorizontal: 16,
        justifyContent: "center",
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          textAlign: "center",
          fontFamily: fonts.label,
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 1.54,
          textTransform: "uppercase",
          color: colors.textMuted,
          marginBottom: 24,
        }}
      >
        FBR Digital Invoicing System
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.stroke,
          backgroundColor: colors.surface,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Text
          style={{
            textAlign: "center",
            fontFamily: fonts.label,
            fontSize: 20,
            fontWeight: "600",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: colors.foreground,
          }}
        >
          FBR Digital Invoicing System
        </Text>
        <Text
          style={{
            textAlign: "center",
            marginTop: 12,
            marginBottom: 20,
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.textMuted,
          }}
        >
          Sign in to your workspace.
        </Text>
        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Your workspace username"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />
        <View>
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            autoComplete="password"
            onSubmitEditing={submit}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 8, bottom: 26, minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}
          >
            <Text style={{ fontFamily: fonts.label, fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted }}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </Pressable>
        </View>
        {error ? <AlertBanner tone="err" text={error} /> : null}
        <Button label={loading ? "Signing in..." : "Sign in"} onPress={submit} loading={loading} disabled={loading} />
        <Text style={{ marginTop: 20, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 22 }}>
          New seller?{" "}
          <Text
            style={{ color: colors.foreground, textDecorationLine: "underline" }}
            onPress={() => Linking.openURL(`${webAppUrl()}/register`)}
          >
            Create account
          </Text>
          {" · "}
          <Text
            style={{ color: colors.foreground, textDecorationLine: "underline" }}
            onPress={() => Linking.openURL(`${webAppUrl()}/forgot-password`)}
          >
            Forgot your password?
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}
