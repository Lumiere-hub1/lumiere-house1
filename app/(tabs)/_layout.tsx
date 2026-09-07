import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";
import { brand } from "@/components/lumiere-ui";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarButton: HapticTab, tabBarActiveTintColor: brand.rose, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 10, fontWeight: "600" }, tabBarStyle: { paddingTop: 7, paddingBottom: bottomPadding, height: 58 + bottomPadding, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 } }}>
    <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <MaterialIcons name="today" size={22} color={color} /> }} />
    <Tabs.Screen name="clients" options={{ title: "Clients", tabBarIcon: ({ color }) => <MaterialIcons name="people-outline" size={22} color={color} /> }} />
    <Tabs.Screen name="content" options={{ title: "Studio", tabBarIcon: ({ color }) => <MaterialIcons name="auto-awesome" size={22} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={22} color={color} /> }} />
    {/* Still real, still fully navigable (linked from Settings) — just no
        longer separate tab-bar destinations, to cut cognitive load per the
        navigation restructure. */}
    <Tabs.Screen name="growth" options={{ href: null }} />
    <Tabs.Screen name="results" options={{ href: null }} />
    <Tabs.Screen name="automate" options={{ href: null }} />
    <Tabs.Screen name="connect" options={{ href: null }} />
  </Tabs>;
}
