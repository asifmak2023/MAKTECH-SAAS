import { Platform } from "react-native";

const TOKEN_KEY = "pral_token";
const TENANT_KEY = "pral_tenant";

let memoryToken: string | null = null;
let memoryTenant: string | null = null;
let hydrated = false;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (!canUseStorage()) return;
  memoryToken = window.localStorage.getItem(TOKEN_KEY);
  memoryTenant = window.localStorage.getItem(TENANT_KEY);
}

export function apiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://127.0.0.1:8000";
}

export function webAppUrl() {
  if (process.env.EXPO_PUBLIC_WEB_URL) {
    return process.env.EXPO_PUBLIC_WEB_URL.replace(/\/$/, "");
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }
  return "http://localhost:3000";
}

export function setSession(token: string, tenant: string) {
  hydrate();
  memoryToken = token;
  memoryTenant = tenant;
  if (canUseStorage()) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(TENANT_KEY, tenant);
  }
}

export function clearSession() {
  hydrate();
  memoryToken = null;
  memoryTenant = null;
  if (canUseStorage()) {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(TENANT_KEY);
  }
}

export function getToken() {
  hydrate();
  return memoryToken;
}

export function getTenantSlug() {
  hydrate();
  return memoryTenant;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  hydrate();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (memoryToken) headers.set("Authorization", `Bearer ${memoryToken}`);
  if (memoryTenant) headers.set("X-Tenant", memoryTenant);

  const res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 180) || `Request failed (${res.status})`);
    }
  }
  if (!res.ok) {
    const message =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(" ") : null) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export { TOKEN_KEY, TENANT_KEY };
