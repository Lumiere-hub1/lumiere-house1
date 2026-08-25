import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME ?? "manus20240115103045",
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

export function getApiBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, "");
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
  }
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") return `${getApiBaseUrl()}/api/oauth/callback`;
  return Linking.createURL("/oauth/callback", { scheme: env.deepLinkScheme });
};

/** The server creates and persists the one-time OAuth state before returning this URL. */
export async function getLoginUrl(): Promise<string> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error("API base URL is required before starting OAuth.");
  const redirectUri = getRedirectUri();
  const response = await fetch(`${apiBaseUrl}/api/oauth/start?redirect_uri=${encodeURIComponent(redirectUri)}`);
  if (!response.ok) throw new Error("Unable to start OAuth login.");
  const data = (await response.json()) as { loginUrl?: string };
  if (!data.loginUrl) throw new Error("OAuth start response did not include a login URL.");
  return data.loginUrl;
}

export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = await getLoginUrl();
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.href = loginUrl;
    return null;
  }
  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) throw new Error("OAuth login URL cannot be opened on this device.");
  await Linking.openURL(loginUrl);
  return null;
}
