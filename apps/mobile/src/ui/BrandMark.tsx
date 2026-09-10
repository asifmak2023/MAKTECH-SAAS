import { Image, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";

const logo = require("../../assets/logo.webp");

export default function BrandMark({ size = 36 }: { size?: number }) {
  const { dark } = useTheme();
  const mark = (
    <Image source={logo} accessibilityLabel="FBR" style={{ width: size, height: size }} resizeMode="contain" />
  );
  if (!dark) return mark;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="FBR"
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {mark}
    </View>
  );
}
