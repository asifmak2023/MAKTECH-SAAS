import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/ThemeContext";
import { fonts, paletteMeta } from "../lib/theme";
import { IconClose } from "./icons";
import PaletteMark from "./PaletteMark";

export default function ThemePicker() {
  const { colors, palette, setPalette, theme, setTheme, palettes } = useTheme();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const current = paletteMeta(palette);
  const canToggleMode = current.modes.length > 1;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Appearance: ${current.label}`}
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
        <PaletteMark id={palette} size={16} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setOpen(false)} />
          <View
            style={{
              width: "100%",
              maxWidth: Math.min(width, 430),
              alignSelf: "flex-end",
              backgroundColor: colors.surface,
              borderTopWidth: 0,
              borderLeftWidth: 0,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
              paddingHorizontal: 16,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
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
                Appearance
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close appearance"
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <IconClose color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {palettes.map((item) => {
              const active = item.id === palette;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setPalette(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 8,
                    backgroundColor: active ? colors.accentSoft : "transparent",
                    borderRadius: 999,
                  }}
                >
                  <PaletteMark id={item.id} size={18} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontFamily: fonts.label,
                        fontSize: 13,
                        fontWeight: "500",
                        letterSpacing: 0.15,
                        color: colors.foreground,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>{item.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
            </ScrollView>
            {canToggleMode ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable
                  onPress={() => setTheme("light")}
                  accessibilityRole="button"
                  accessibilityState={{ selected: theme !== "dark" }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme !== "dark" ? colors.accent : colors.stroke,
                    backgroundColor: theme !== "dark" ? colors.accent : "transparent",
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.label,
                        fontSize: 12,
                        fontWeight: "500",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        color: theme !== "dark" ? colors.onAccent : colors.foreground,
                    }}
                  >
                    Light
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTheme("dark")}
                  accessibilityRole="button"
                  accessibilityState={{ selected: theme === "dark" }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? colors.accent : colors.stroke,
                    backgroundColor: theme === "dark" ? colors.accent : "transparent",
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.label,
                        fontSize: 12,
                        fontWeight: "500",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        color: theme === "dark" ? colors.onAccent : colors.foreground,
                    }}
                  >
                    Dark
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
