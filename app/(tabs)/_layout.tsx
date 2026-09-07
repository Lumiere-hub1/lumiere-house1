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
    <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <MaterialIcons name="today" size={22} color={color} /> }} />
    <Tabs.Screen name="growth" options={{ title: "Growth", tabBarIcon: ({ color }) => <MaterialIcons name="trending-up" size={22} color={color} /> }} />
    <Tabs.Screen name="results" options={{ title: "Results", tabBarIcon: ({ color }) => <MaterialIcons name="insights" size={22} color={color} /> }} />
    <Tabs.Screen name="clients" options={{ title: "Client Care", tabBarIcon: ({ color }) => <MaterialIcons name="people-outline" size={22} color={color} /> }} />
    <Tabs.Screen name="content" options={{ title: "Studio", tabBarIcon: ({ color }) => <MaterialIcons name="auto-awesome" size={22} color={color} /> }} />
    <Tabs.Screen name="automate" options={{ title: "Automate", tabBarIcon: ({ color }) => <MaterialIcons name="tune" size={22} color={color} /> }} />
    <Tabs.Screen name="connect" options={{ title: "Connect", tabBarIcon: ({ color }) => <MaterialIcons name="link" size={22} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={22} color={color} /> }} />
  </Tabs>;
}
