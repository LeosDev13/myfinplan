import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, ActionSheetIOS, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/hooks/useAuth";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { setLanguage, SUPPORTED_LANGUAGES } from "~/lib/i18n";

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
  loading = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress || loading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#141414",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 2,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "500", color: destructive ? "#ef4444" : "#ffffff" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {loading && <ActivityIndicator size="small" color="#525252" />}
        {value && !loading && <Text style={{ color: "#525252", fontSize: 14 }}>{value}</Text>}
        {onPress && showChevron && !loading && <Ionicons name="chevron-forward" size={16} color="#525252" />}
      </View>
    </TouchableOpacity>
  );
}

async function deleteAllWorkspaceData(workspaceId: string, userId: string) {
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id")
    .eq("workspace_id", workspaceId);

  if (budgets?.length) {
    const budgetIds = budgets.map((b) => b.id);
    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select("id")
      .in("budget_id", budgetIds);

    if (budgetItems?.length) {
      const itemIds = budgetItems.map((i) => i.id);
      const { error: e1 } = await supabase.from("budget_item_transactions").delete().in("budget_item_id", itemIds);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("budget_items").delete().in("budget_id", budgetIds);
      if (e2) throw e2;
    }
    const { error: e3 } = await supabase.from("budgets").delete().in("id", budgetIds);
    if (e3) throw e3;
  }

  const { error: eTx }  = await supabase.from("transactions").delete().eq("workspace_id", workspaceId);
  if (eTx) throw eTx;
  const { error: eAcc } = await supabase.from("accounts").delete().eq("workspace_id", workspaceId);
  if (eAcc) throw eAcc;

  const { data: cats } = await supabase.from("categories").select("id").eq("workspace_id", workspaceId);
  if (cats?.length) {
    const { error: eSub } = await supabase.from("subcategories").delete().in("category_id", cats.map((c) => c.id));
    if (eSub) throw eSub;
  }
  const { error: eCat } = await supabase.from("categories").delete().eq("workspace_id", workspaceId);
  if (eCat) throw eCat;

  const { error: eMem } = await supabase.from("workspace_members").delete().eq("user_id", userId);
  if (eMem) throw eMem;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { workspaceId } = useWorkspace();
  const { t, i18n } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const email = session?.user?.email ?? "—";

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label ??
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language.split("-")[0])?.label ??
    "English";

  const handleLanguage = () => {
    const options = SUPPORTED_LANGUAGES.map((l) => l.label);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, t("common.cancel")],
          cancelButtonIndex: options.length,
          title: t("settings.language"),
          userInterfaceStyle: "dark",
        },
        (index) => {
          if (index < options.length) {
            setLanguage(SUPPORTED_LANGUAGES[index].code);
          }
        }
      );
    } else {
      Alert.alert(
        t("settings.language"),
        undefined,
        [
          ...SUPPORTED_LANGUAGES.map((l) => ({
            text: l.label,
            onPress: () => setLanguage(l.code),
          })),
          { text: t("common.cancel"), style: "cancel" as const },
        ]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t("settings.signOutConfirm.title"),
      t("settings.signOutConfirm.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("settings.signOut"), style: "destructive", onPress: () => supabase.auth.signOut() },
      ]
    );
  };

  const performDeletion = async () => {
    if (!session) return;
    setDeleting(true);
    try {
      if (workspaceId) {
        await deleteAllWorkspaceData(workspaceId, session.user.id);
      }
      await supabase.auth.signOut();
    } catch {
      setDeleting(false);
      Alert.alert(t("settings.deleteAccount.errorTitle"), t("settings.deleteAccount.errorMessage"));
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("settings.deleteAccount.alertTitle"),
      t("settings.deleteAccount.alertMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () =>
            Alert.alert(
              t("settings.deleteAccount.confirmTitle"),
              t("settings.deleteAccount.confirmMessage"),
              [
                { text: t("common.cancel"), style: "cancel" },
                { text: t("settings.deleteAccount.confirm"), style: "destructive", onPress: performDeletion },
              ]
            ),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
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
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader label={t("settings.account")} />
        <View style={{ borderRadius: 12, overflow: "hidden" }}>
          <SettingsRow label="Email" value={email} showChevron={false} />
        </View>

        <SectionHeader label={t("settings.preferences")} />
        <View style={{ borderRadius: 12, overflow: "hidden" }}>
          <SettingsRow
            label={t("settings.language")}
            value={currentLangLabel}
            onPress={handleLanguage}
          />
          <SettingsRow
            label={t("settings.appVersion")}
            value="1.0.0"
            showChevron={false}
          />
        </View>

        <SectionHeader label={t("settings.danger")} />
        <View style={{ borderRadius: 12, overflow: "hidden", gap: 2 }}>
          <SettingsRow
            label={t("settings.signOut")}
            destructive
            showChevron={false}
            onPress={handleSignOut}
          />
          <SettingsRow
            label={deleting ? t("settings.deleteAccount.deleting") : t("settings.deleteAccount.label")}
            destructive
            showChevron={false}
            loading={deleting}
            onPress={handleDeleteAccount}
          />
        </View>
      </ScrollView>
    </View>
  );
}
