import { Image, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";

const logo = require("../../assets/logo.webp");

export default function BrandMark({ size = 36 }: { size?: number }) {
  const { dark, palette } = useTheme();
  const mark = (
    <Image source={logo} accessibilityLabel="FBR" style={{ width: size, height: size }} resizeMode="contain" />
  );

  const glacier = palette === "glacier";
  const asifent = palette === "asifent";
  if (!dark && !asifent && !glacier) return mark;

  const backgroundColor = glacier
    ? "#ffffff"
    : asifent
      ? dark
        ? "#2b2b2b"
        : "#ffffff"
      : "#ffffff";
  const borderColor = glacier ? "rgba(125,211,252,0.35)" : asifent ? "#0067c0" : "transparent";

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="FBR"
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor,
        borderWidth: glacier || asifent ? 1 : 0,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {mark}
    </View>
  );
}
