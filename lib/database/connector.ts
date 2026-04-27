import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/react-native";
import { supabase } from "../supabase";

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const batch = await database.getCrudBatch(200);
    if (!batch) return;

    try {
      for (const op of batch.crud) {
        const { table, op: opType, id, opData } = op;

        if (opType === UpdateType.PUT) {
          const { error } = await supabase.from(table).upsert({ id, ...opData });
          if (error) throw error;
        } else if (opType === UpdateType.PATCH) {
          const { error } = await supabase.from(table).update(opData ?? {}).eq("id", id);
          if (error) throw error;
        } else if (opType === UpdateType.DELETE) {
          const { error } = await supabase.from(table).delete().eq("id", id);
          if (error) throw error;
        }
      }
      await batch.complete();
    } catch (e) {
      console.error("PowerSync uploadData error:", e);
      throw e; // rethrow so PowerSync retries
    }
  }
}
