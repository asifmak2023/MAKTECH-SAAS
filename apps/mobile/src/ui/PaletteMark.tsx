import { View } from "react-native";
import type { PaletteId } from "../lib/theme";

export default function PaletteMark({ id, size = 16 }: { id: PaletteId; size?: number }) {
  const inner = Math.round(size * 0.5);

  if (id === "asifent") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: "#D1E4FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: inner, height: inner, borderRadius: 999, backgroundColor: "#0061A4" }} />
      </View>
    );
  }

  if (id === "editorial") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: "#D4E3FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: inner, height: inner, borderRadius: 999, backgroundColor: "#005FAF" }} />
      </View>
    );
  }

  if (id === "glacier") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: "#0A0E1A",
          borderWidth: 1,
          borderColor: "#7DD3FC",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: inner, height: inner, borderRadius: 999, backgroundColor: "#7DD3FC" }} />
      </View>
    );
  }

  const marks: Record<string, { bg: string; fg: string }> = {
    mehndi: { bg: "#FFDEA3", fg: "#7A5900" },
    karachi: { bg: "#6FF7F6", fg: "#006A6A" },
    rosewood: { bg: "#FFDADA", fg: "#9C4146" },
    indigo: { bg: "#DEE0FF", fg: "#4355B9" },
  };
  const mark = marks[id];
  if (mark) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: mark.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: inner, height: inner, borderRadius: 999, backgroundColor: mark.fg }} />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: "#E6E1E5",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: inner, height: inner, borderRadius: 999, backgroundColor: "#1C1B1F" }} />
    </View>
  );
}
