import "../global.css";
import "~/lib/i18n";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Linking } from "react-native";
import { useEffect, useRef } from "react";
import { loadStoredLanguage } from "~/lib/i18n";
import { PowerSyncContext } from "@powersync/react-native";
import { db, connector } from "~/lib/powersync";
import { useAuth } from "~/hooks/useAuth";
import { supabase } from "~/lib/supabase";
import { WorkspaceProvider } from "~/app/providers/WorkspaceProvider";

function AuthGuard() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const checking = useRef(false);
  const recoveryHandled = useRef(false);

  // Handle password-reset deep links: myfinplan://reset-password#access_token=...&type=recovery
  useEffect(() => {
    const handle = async (url: string) => {
      if (!url.includes("type=recovery") || recoveryHandled.current) return;
      recoveryHandled.current = true;
      const fragment = url.split("#")[1] ?? "";
      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        router.replace("/(auth)/reset-password");
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handle(url); });
    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loading || checking.current) return;

    const inAuth = segments[0] === "(auth)";

    if (!session) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    // Session exists — check workspace membership
    checking.current = true;
    supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        checking.current = false;
        if (!data) {
          // Signed in but no workspace yet
          router.replace("/(auth)/workspace");
        } else if (inAuth) {
          router.replace("/(app)");
        }
      });
  }, [session, loading, segments]);

  // Connect/disconnect PowerSync when auth state changes
  useEffect(() => {
    if (session) {
      db.connect(connector).catch(console.error);
    } else {
      db.disconnect().catch(console.error);
    }
  }, [session]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    loadStoredLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PowerSyncContext.Provider value={db}>
        <WorkspaceProvider>
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }} />
        </WorkspaceProvider>
      </PowerSyncContext.Provider>
    </GestureHandlerRootView>
  );
}
