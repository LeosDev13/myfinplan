import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TABS: {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: "index",              label: "Home",     icon: "home-outline",       iconActive: "home" },
  { name: "transactions/index", label: "Activity", icon: "swap-vertical-outline", iconActive: "swap-vertical" },
  { name: "budgets/index",      label: "Budgets",  icon: "wallet-outline",        iconActive: "wallet" },
  { name: "metrics/index",      label: "Metrics",  icon: "bar-chart-outline",     iconActive: "bar-chart" },
  { name: "more",               label: "Accounts", icon: "card-outline",          iconActive: "card" },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#1f1f1f",
        backgroundColor: "#141414",
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
        paddingTop: 8,
        paddingHorizontal: 4,
      }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;

        const isFocused = state.index === index;
        const { options } = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
              paddingHorizontal: 4,
              borderRadius: 10,
              backgroundColor: isFocused ? "rgba(16,185,129,0.12)" : "transparent",
            }}
          >
            <Ionicons
              name={isFocused ? tab.iconActive : tab.icon}
              size={22}
              color={isFocused ? "#10b981" : "#888888"}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: isFocused ? "700" : "500",
                color: isFocused ? "#10b981" : "#888888",
                marginTop: 2,
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="transactions/index" options={{ title: "Transactions" }} />
      <Tabs.Screen name="budgets/index" options={{ title: "Budgets" }} />
      <Tabs.Screen name="metrics/index" options={{ title: "Metrics" }} />
      <Tabs.Screen name="more" options={{ title: "Accounts" }} />
    </Tabs>
  );
}
