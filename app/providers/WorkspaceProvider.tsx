import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/hooks/useAuth";

interface WorkspaceContextValue {
  workspaceId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  loading: true,
  refresh: async () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!session) {
      setWorkspaceId(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    setWorkspaceId(data?.workspace_id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [session]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, loading, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
