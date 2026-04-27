import { PowerSyncDatabase } from "@powersync/react-native";
import { AppSchema } from "./database/schema";
import { SupabaseConnector } from "./database/connector";

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: "myfinplan.db" },
});

export const connector = new SupabaseConnector();
