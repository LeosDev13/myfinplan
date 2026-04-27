import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILT_IN_CATEGORIES = [
  { name: "Food & Drink", subcategories: ["Groceries", "Restaurants", "Coffee", "Alcohol"] },
  { name: "Transport", subcategories: ["Fuel", "Public Transit", "Taxi/Ride-share", "Parking"] },
  { name: "Housing", subcategories: ["Rent", "Utilities", "Maintenance", "Insurance"] },
  { name: "Health", subcategories: ["Doctor", "Pharmacy", "Gym", "Dental"] },
  { name: "Entertainment", subcategories: ["Streaming", "Events", "Hobbies", "Games"] },
  { name: "Shopping", subcategories: ["Clothing", "Electronics", "Home", "Beauty"] },
  { name: "Income", subcategories: ["Salary", "Freelance", "Bonus", "Other Income"] },
  { name: "Savings", subcategories: ["Emergency Fund", "Investments", "Pension"] },
  { name: "Travel", subcategories: ["Flights", "Hotels", "Activities", "Food Abroad"] },
  { name: "Education", subcategories: ["Courses", "Books", "Software"] },
  { name: "Gifts & Donations", subcategories: ["Gifts", "Charity"] },
  { name: "Other", subcategories: ["Miscellaneous"] },
];

// No ambiguous chars: 0, O, 1, I
const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateJoinCode(): string {
  return Array.from(
    { length: 6 },
    () => JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)]
  ).join("");
}

Deno.serve(async (req) => {
  try {
    const { workspaceName } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get calling user from their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // All further ops use service role to bypass RLS
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Generate unique join code
    let joinCode = generateJoinCode();
    for (let attempt = 0; attempt < 10; attempt++) {
      const { data } = await admin
        .from("workspaces")
        .select("id")
        .eq("join_code", joinCode)
        .maybeSingle();
      if (!data) break;
      joinCode = generateJoinCode();
    }

    // Create workspace
    const { data: workspace, error: wsError } = await admin
      .from("workspaces")
      .insert({ name: workspaceName, join_code: joinCode })
      .select()
      .single();

    if (wsError) {
      return new Response(JSON.stringify({ error: wsError.message }), { status: 500 });
    }

    // Add user as member
    await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
    });

    // Seed built-in categories
    for (const cat of BUILT_IN_CATEGORIES) {
      const { data: category } = await admin
        .from("categories")
        .insert({
          workspace_id: workspace.id,
          name: cat.name,
          is_built_in: true,
        })
        .select()
        .single();

      if (category) {
        await admin.from("subcategories").insert(
          cat.subcategories.map((name) => ({
            category_id: category.id,
            name,
            is_built_in: true,
          }))
        );
      }
    }

    return new Response(
      JSON.stringify({ workspace, joinCode }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
