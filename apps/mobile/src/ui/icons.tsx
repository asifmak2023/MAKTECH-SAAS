import { Ionicons } from "@expo/vector-icons";
import { ColorValue } from "react-native";

type IconProps = { size?: number; color?: ColorValue };

export function IconSun({ size = 16, color = "#000" }: IconProps) {
  return <Ionicons name="sunny-outline" size={size} color={color as string} />;
}

export function IconMoon({ size = 16, color = "#000" }: IconProps) {
  return <Ionicons name="moon-outline" size={size} color={color as string} />;
}

export function IconDashboard({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="grid-outline" size={size} color={color as string} />;
}

export function IconInvoices({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="document-text-outline" size={size} color={color as string} />;
}

export function IconClients({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="people-outline" size={size} color={color as string} />;
}

export function IconPlus({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="add" size={size} color={color as string} />;
}

export function IconBilling({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="card-outline" size={size} color={color as string} />;
}

export function IconSettings({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="settings-outline" size={size} color={color as string} />;
}

export function IconLogout({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="log-out-outline" size={size} color={color as string} />;
}

export function IconMenu({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="menu-outline" size={size} color={color as string} />;
}

export function IconClose({ size = 18, color = "#000" }: IconProps) {
  return <Ionicons name="close" size={size} color={color as string} />;
}
