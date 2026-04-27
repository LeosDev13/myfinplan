import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef } from "react";
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
