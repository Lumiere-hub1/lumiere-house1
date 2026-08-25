import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    return Platform.OS === "web"
      ? await AsyncStorage.getItem(SESSION_TOKEN_KEY)
      : await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("[Auth] Failed to get session token:", error);
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  if (!token || token.length < 20) throw new Error("Refusing to persist an invalid session token.");
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("[Auth] Failed to set session token:", error);
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[Auth] Failed to remove session token:", error);
  }
}

/**
 * User profiles are authoritative on the server. These compatibility exports
 * intentionally do not persist profile JSON on the client.
 */
export async function getUserInfo(): Promise<User | null> {
  return null;
}

export async function setUserInfo(_user: User): Promise<void> {
  return;
}

export async function clearUserInfo(): Promise<void> {
  return;
}
