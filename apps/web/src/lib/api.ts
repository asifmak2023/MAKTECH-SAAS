const TOKEN_KEY = "pral_token";
const TENANT_KEY = "pral_tenant";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getTenantSlug() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TENANT_KEY);
}

export function setSession(token: string, tenantSlug: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TENANT_KEY, tenantSlug);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  const tenant = getTenantSlug();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenant) headers.set("X-Tenant", tenant);

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(" ") : null) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
