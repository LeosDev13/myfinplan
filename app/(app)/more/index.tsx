import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

interface MenuRowProps {
  label: string;
  onPress: () => void;
}

function MenuRow({ label, onPress }: MenuRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4 bg-card rounded-xl border border-border"
    >
      <Text className="text-base text-foreground">{label}</Text>
      <Text className="text-muted-foreground text-lg">›</Text>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-14 pb-6">
        <Text className="text-2xl font-bold text-foreground">More</Text>
      </View>

      <View className="px-4 gap-3">
        <MenuRow label="Accounts" onPress={() => router.push("/(app)/more/accounts")} />
        <MenuRow label="Categories" onPress={() => router.push("/(app)/more/categories")} />
        <MenuRow label="Settings" onPress={() => router.push("/(app)/more/settings")} />
      </View>


    </View>
  );
}
