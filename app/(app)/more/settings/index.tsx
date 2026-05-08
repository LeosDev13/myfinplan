import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/hooks/useAuth";

// ─── sub-components ─────────────────────────────────────────────────────────

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

function SettingsRow({
  label,
  value,
  onPress,
  destructive = false,
  showChevron = true,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#141414",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 2,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "500",
          color: destructive ? "#ef4444" : "#ffffff",
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {value && (
          <Text style={{ color: "#525252", fontSize: 14 }}>{value}</Text>
        )}
        {onPress && showChevron && (
          <Ionicons name="chevron-forward" size={16} color="#525252" />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();

  const email = session?.user?.email ?? "—";

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <SectionHeader label="Account" />
        <View style={{ borderRadius: 12, overflow: "hidden" }}>
          <SettingsRow label="Email" value={email} showChevron={false} />
        </View>

        {/* App */}
        <SectionHeader label="App" />
        <View style={{ borderRadius: 12, overflow: "hidden" }}>
          <SettingsRow label="Version" value="1.0.0" showChevron={false} />
        </View>

        {/* Danger zone */}
        <SectionHeader label="Account Actions" />
        <View style={{ borderRadius: 12, overflow: "hidden" }}>
          <SettingsRow
            label="Sign out"
            destructive
            showChevron={false}
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </View>
  );
}
