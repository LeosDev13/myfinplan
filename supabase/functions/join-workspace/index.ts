import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { joinCode } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Look up workspace by join code (case-insensitive)
    const { data: workspace, error: wsError } = await admin
      .from("workspaces")
      .select("*")
      .eq("join_code", (joinCode as string).trim().toUpperCase())
      .maybeSingle();

    if (wsError) {
      return new Response(JSON.stringify({ error: wsError.message }), { status: 500 });
    }
    if (!workspace) {
      return new Response(JSON.stringify({ error: "Invalid join code" }), { status: 404 });
    }

    // Add member (upsert — safe if already a member)
    await admin.from("workspace_members").upsert(
      { workspace_id: workspace.id, user_id: user.id },
      { onConflict: "workspace_id,user_id" }
    );

    return new Response(
      JSON.stringify({ workspace }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
