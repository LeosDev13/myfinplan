import { View, Text } from "react-native";

export default function DashboardScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground text-2xl font-bold">Dashboard</Text>
      <Text className="text-muted-foreground mt-2">Coming in Phase 10</Text>
    </View>
  );
}
