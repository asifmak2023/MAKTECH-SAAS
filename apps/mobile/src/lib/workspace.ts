import { api, clearSession, getToken } from "./api";

export type Workspace = {
  name: string;
};

let cached: Workspace | null = null;
let inflight: Promise<Workspace> | null = null;

export function getCachedWorkspace() {
  return cached;
}

export function clearWorkspace() {
  cached = null;
  inflight = null;
}

export function loadWorkspace(): Promise<Workspace> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  if (!getToken()) return Promise.reject(new Error("unauthenticated"));
  inflight = api<{
    user: { name: string };
    tenant: { name: string } | null;
    is_platform_admin?: boolean;
    account_kind?: string;
  }>("/api/auth/me")
    .then((res) => {
      if (res.is_platform_admin || res.account_kind === "platform_admin" || !res.tenant) {
        clearSession();
        throw new Error("unauthenticated");
      }
      cached = { name: `${res.user.name} · ${res.tenant.name}` };
      inflight = null;
      return cached;
    })
    .catch((err) => {
      inflight = null;
      cached = null;
      throw err;
    });
  return inflight;
}
