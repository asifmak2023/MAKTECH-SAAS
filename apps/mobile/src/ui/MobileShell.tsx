import { ReactNode, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Redirect, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, clearSession, getToken } from "../lib/api";
import { clearWorkspace, getCachedWorkspace, loadWorkspace } from "../lib/workspace";
import { useTheme } from "../lib/ThemeContext";
import { fonts } from "../lib/theme";
import BrandMark from "./BrandMark";
import ThemePicker from "./ThemePicker";
import { LoadingBlock } from "./primitives";
import {
  IconBilling,
  IconClients,
  IconClose,
  IconDashboard,
  IconInvoices,
  IconLogout,
  IconMenu,
  IconPlus,
  IconSettings,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/invoices", label: "Invoices", Icon: IconInvoices },
  { href: "/clients", label: "Clients", Icon: IconClients },
  { href: "/invoices/create", label: "New invoice", Icon: IconPlus },
  { href: "/billing", label: "Billing", Icon: IconBilling },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/invoices/create") {
    return pathname === "/invoices/create" || pathname.startsWith("/invoices/create/");
  }
  if (href === "/invoices") {
    return pathname === "/invoices" || (pathname.startsWith("/invoices/") && !pathname.startsWith("/invoices/create"));
  }
  if (href === "/clients") return pathname === "/clients" || pathname.startsWith("/clients/");
  return pathname === href;
}

export default function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const cached = getCachedWorkspace();
  const [ready, setReady] = useState(Boolean(cached));
  const [name, setName] = useState(cached?.name || "");
  const [open, setOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setSignedOut(true);
      return;
    }
    loadWorkspace()
      .then((ws) => {
        setName(ws.name);
        setReady(true);
      })
      .catch(() => {
        clearSession();
        setSignedOut(true);
      });
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (signedOut) return <Redirect href="/login" />;
  if (!ready) return <LoadingBlock />;

  const padX = width < 360 ? 14 : 18;

  function logout() {
    api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearSession();
    clearWorkspace();
    setSignedOut(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 10),
          borderBottomWidth: 0,
          backgroundColor: colors.surface,
          shadowColor: colors.foreground,
          shadowOpacity: 0.08,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      >
        <View
          style={{
            minHeight: 56,
            paddingHorizontal: padX,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Pressable
            onPress={() => router.push("/dashboard")}
            accessibilityRole="button"
            accessibilityLabel="Dashboard"
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}
          >
            <BrandMark size={36} />
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.label,
                fontSize: 12,
                fontWeight: "500",
                letterSpacing: 0.4,
                color: colors.textMuted,
                flexShrink: 1,
              }}
            >
              {name}
            </Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ThemePicker />
            <Pressable
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              accessibilityState={{ expanded: open }}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 0,
                borderRadius: 999,
                backgroundColor: colors.accentSoft,
              }}
            >
              <IconMenu color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: padX,
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom, 24) + 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setOpen(false)} />
          <View
            style={{
              width: Math.min(320, Math.max(260, width * 0.82)),
              backgroundColor: colors.surface,
              borderLeftWidth: 0,
              borderTopLeftRadius: 28,
              borderBottomLeftRadius: 28,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 }}>
              <Text
                style={{
                  fontFamily: fonts.label,
                  fontSize: 12,
                  fontWeight: "500",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: colors.textMuted,
                }}
              >
                Menu
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <IconClose color={colors.foreground} />
              </Pressable>
            </View>
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const color = active ? colors.foreground : colors.textMuted;
              return (
                <Pressable
                  key={item.href}
                  onPress={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    backgroundColor: active ? colors.accentSoft : "transparent",
                    borderRadius: 999,
                    marginHorizontal: 8,
                  }}
                >
                  <item.Icon color={color} />
                  <Text
                    style={{
                    fontFamily: fonts.label,
                    fontSize: 14,
                    fontWeight: "500",
                    letterSpacing: 0.1,
                    color,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
            <View style={{ height: 1, backgroundColor: colors.stroke, marginVertical: 12, marginHorizontal: 16 }} />
            <Pressable
              onPress={logout}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}
            >
              <IconLogout color={colors.textMuted} />
              <Text
                style={{
                  fontFamily: fonts.label,
                  fontSize: 14,
                  fontWeight: "500",
                  letterSpacing: 0.1,
                  color: colors.textMuted,
                }}
              >
                Log out
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
