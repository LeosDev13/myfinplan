import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type IoniconName = keyof typeof Ionicons.glyphMap;

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        color: "#525252",
        fontSize: 10,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 24,
        paddingHorizontal: 4,
      }}
    >
      {label}
    </Text>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#141414",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 2,
        gap: 14,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: "#1f1f1f",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color="#888888" />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: "#ffffff" }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="#525252" />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          {t("more.title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader label={t("more.sectionManage")} />
        <View style={{ borderRadius: 12, overflow: "hidden" }}>
          <MenuRow
            icon="card-outline"
            label={t("more.accounts")}
            onPress={() => router.push("/(app)/more/accounts")}
          />
          <MenuRow
            icon="pricetag-outline"
            label={t("more.categories")}
            onPress={() => router.push("/(app)/more/categories")}
          />
        </View>

        <SectionHeader label={t("more.sectionApp")} />
        <View style={{ borderRadius: 12, overflow: "hidden" }}>
          <MenuRow
            icon="settings-outline"
            label={t("more.settings")}
            onPress={() => router.push("/(app)/more/settings")}
          />
        </View>
      </ScrollView>
    </View>
  );
}
