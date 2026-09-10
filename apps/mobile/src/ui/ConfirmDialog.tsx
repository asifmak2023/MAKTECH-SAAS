import { Modal, Pressable, Text, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";
import { fonts } from "../lib/theme";
import { Button } from "./primitives";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 24 }}
      >
        <Pressable
          onPress={() => undefined}
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stroke, padding: 20 }}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: 20, fontWeight: "500", color: colors.foreground }}>{title}</Text>
          <Text style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.textMuted }}>
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Button label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button label={confirmLabel} kind="danger" onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
