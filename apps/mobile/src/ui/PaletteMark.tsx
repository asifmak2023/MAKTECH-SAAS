import { View } from "react-native";
import type { PaletteId } from "../lib/theme";

export default function PaletteMark({ id, size = 16 }: { id: PaletteId; size?: number }) {
  const gap = Math.max(1, Math.round(size * 0.08));
  const inner = (size - gap) / 2;

  if (id === "asifent") {
    return (
      <View style={{ width: size, height: size, flexDirection: "row", flexWrap: "wrap", gap }}>
        <View style={{ width: inner, height: inner, borderRadius: 2, backgroundColor: "#0067c0" }} />
        <View style={{ width: inner, height: inner, borderRadius: 2, backgroundColor: "#4c9aff" }} />
        <View style={{ width: inner, height: inner, borderRadius: 2, backgroundColor: "#4c9aff" }} />
        <View style={{ width: inner, height: inner, borderRadius: 2, backgroundColor: "#0059a6" }} />
      </View>
    );
  }

  if (id === "editorial") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 3,
          backgroundColor: "#005da7",
          padding: Math.max(3, size * 0.18),
          justifyContent: "space-between",
        }}
      >
        <View style={{ height: 2, backgroundColor: "#ffffff" }} />
        <View style={{ height: 1.5, width: "75%", backgroundColor: "#d4e3ff" }} />
        <View style={{ height: 1.5, width: "58%", backgroundColor: "#d4e3ff" }} />
      </View>
    );
  }

  if (id === "glacier") {
    const diamond = size * 0.42;
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          backgroundColor: "#0a0e1a",
          borderWidth: 1,
          borderColor: "#7dd3fc",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: diamond,
            height: diamond,
            backgroundColor: "#7dd3fc",
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size * 0.42, height: size * 0.42, backgroundColor: "#ffffff" }} />
    </View>
  );
}
