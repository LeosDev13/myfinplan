import { PowerSyncContext } from "@powersync/react-native";
import { useEffect } from "react";
import { db, connector } from "~/lib/powersync";
import { useAuth } from "~/hooks/useAuth";

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      db.connect(connector).catch(console.error);
    } else {
      db.disconnect().catch(console.error);
    }
  }, [session]);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
