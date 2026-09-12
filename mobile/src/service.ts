import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, processLock } from "@supabase/supabase-js";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
export const preview = !apiUrl || !url || !key;
const storage = {
  getItem: (k: string) =>
    Platform.OS === "web"
      ? Promise.resolve(sessionStorage.getItem(k))
      : SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) =>
    Platform.OS === "web"
      ? Promise.resolve(sessionStorage.setItem(k, v))
      : SecureStore.setItemAsync(k, v),
  removeItem: (k: string) =>
    Platform.OS === "web"
      ? Promise.resolve(sessionStorage.removeItem(k))
      : SecureStore.deleteItemAsync(k),
};
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      })
    : null;
if (Platform.OS !== "web")
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase?.auth.startAutoRefresh();
    else supabase?.auth.stopAutoRefresh();
  });
export class ApiError extends Error {}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  requestKey?: string,
): Promise<T> {
  if (!apiUrl) throw new ApiError("SERVICE_UNAVAILABLE");
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${apiUrl}/api/mobile/${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(data.session
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : {}),
        ...(requestKey ? { "Idempotency-Key": requestKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.code || "SERVICE_UNAVAILABLE");
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
