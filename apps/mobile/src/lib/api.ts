import { Platform } from "react-native";

const TOKEN_KEY = "pral_token";
const TENANT_KEY = "pral_tenant";

let memoryToken: string | null = null;
let memoryTenant: string | null = null;

export function apiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://127.0.0.1:8000";
}

export function setSession(token: string, tenant: string) {
  memoryToken = token;
  memoryTenant = tenant;
}

export function clearSession() {
  memoryToken = null;
  memoryTenant = null;
}

export function getToken() {
  return memoryToken;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (memoryToken) headers.set("Authorization", `Bearer ${memoryToken}`);
  if (memoryTenant) headers.set("X-Tenant", memoryTenant);

  const res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export { TOKEN_KEY, TENANT_KEY };
