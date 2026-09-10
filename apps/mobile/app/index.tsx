import { Redirect, useRootNavigationState } from "expo-router";
import { getToken } from "../src/lib/api";

export default function Home() {
  const navigation = useRootNavigationState();
  if (!navigation?.key) return null;
  return <Redirect href={getToken() ? "/dashboard" : "/login"} />;
}
