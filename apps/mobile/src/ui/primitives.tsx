import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../lib/ThemeContext";
import { fonts } from "../lib/theme";
import { formatStatus, statusChip } from "../lib/status";

export function Eyebrow({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: fonts.label,
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 1.98,
        textTransform: "uppercase",
        color: colors.textMuted,
      }}
    >
      {children}
    </Text>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: fonts.body,
        fontSize: 28,
        fontWeight: "500",
        letterSpacing: -0.4,
        color: colors.foreground,
        flexShrink: 1,
      }}
    >
      {children}
    </Text>
  );
}

export function Body({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return (
    <Text style={[{ fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted }, style]}>
      {children}
    </Text>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: fonts.label,
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 1.32,
        textTransform: "uppercase",
        color: colors.textMuted,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  ...rest
}: { label?: string } & TextInputProps) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: colors.stroke,
          backgroundColor: colors.surface,
          color: colors.foreground,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 16,
          fontFamily: fonts.body,
          borderRadius: colors.radius,
        }}
        {...rest}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: colors.stroke,
          backgroundColor: colors.surface,
          padding: 16,
          borderRadius: colors.radius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type BtnKind = "primary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const { colors, dark } = useTheme();
  const busy = Boolean(disabled || loading);
  const bg =
    kind === "primary" ? colors.accent : kind === "danger" ? "transparent" : "transparent";
  const fg =
    kind === "primary" ? colors.onAccent : colors.foreground;
  const border =
    kind === "primary" ? colors.accent : kind === "danger" ? (dark ? "#f5f5f5" : "#000000") : colors.stroke;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          paddingHorizontal: 16,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          borderRadius: colors.radius,
          opacity: busy ? 0.5 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          style={{
            fontFamily: fonts.label,
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: fg,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const { dark, colors, palette } = useTheme();
  const tone = statusChip(status, dark, palette);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: tone.bg,
        borderWidth: 1,
        borderColor: tone.border,
        borderRadius: Math.min(8, colors.radius || 0),
        maxWidth: "100%",
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: tone.dot }} />
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          fontWeight: "500",
          color: tone.fg,
          textTransform: "capitalize",
          flexShrink: 1,
        }}
      >
        {label || formatStatus(status)}
      </Text>
    </View>
  );
}

export function AlertBanner({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "neutral" | "ok" | "info" | "err";
}) {
  const { colors, dark } = useTheme();
  const pal =
    tone === "ok"
      ? { bg: dark ? "rgba(16,185,129,0.16)" : "#ecfdf5", fg: dark ? "#6ee7b7" : "#047857" }
      : tone === "info"
        ? { bg: dark ? "rgba(14,165,233,0.16)" : "#f0f9ff", fg: dark ? "#7dd3fc" : "#0369a1" }
        : tone === "err"
          ? { bg: dark ? "rgba(244,63,94,0.16)" : "#fff1f2", fg: dark ? "#fda4af" : "#be123c" }
          : { bg: colors.accentSoft, fg: colors.foreground };
  return (
    <View style={{ backgroundColor: pal.bg, borderWidth: 1, borderColor: colors.stroke, padding: 12, marginBottom: 12, borderRadius: colors.radius }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.fg }}>{text}</Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 32, paddingHorizontal: 8 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

export function LoadingBlock({ label = "Loading workspace..." }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: colors.page }}>
      <ActivityIndicator color={colors.foreground} />
      <Text style={{ marginTop: 12, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? colors.accent : colors.surface,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.label,
                fontSize: 11,
                fontWeight: "600",
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: active ? colors.onAccent : colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                minHeight: 44,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.stroke,
                backgroundColor: active ? colors.accent : colors.surface,
                borderRadius: colors.radius,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: active ? colors.onAccent : colors.foreground,
                  flexShrink: 1,
                }}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const hairline = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
