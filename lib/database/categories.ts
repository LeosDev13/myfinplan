import { useQuery, usePowerSync } from "@powersync/react-native";
import { generateId } from "~/lib/uuid";
import { Category, Subcategory } from "../types";

export interface CategoryWithSubs extends Category {
  subcategories: Subcategory[];
}


export function useCategoriesWithSubs() {
  // Two separate queries so PowerSync independently tracks each table.
  // A JOIN query can miss reactive updates when a subcategory is inserted
  // for the first time into a category that previously had none.
  const catsResult = useQuery<Category>(
    `SELECT id, workspace_id, name, is_built_in, created_at
     FROM categories
     ORDER BY is_built_in DESC, name ASC`
  );

  const subsResult = useQuery<Subcategory>(
    `SELECT id, category_id, name, is_built_in, created_at
     FROM subcategories
     ORDER BY name ASC`
  );

  const grouped: CategoryWithSubs[] = catsResult.data.map((cat) => ({
    ...cat,
    subcategories: subsResult.data.filter((s) => s.category_id === cat.id),
  }));

  return {
    data: grouped,
    isLoading: catsResult.isLoading || subsResult.isLoading,
  };
}

const DEFAULT_CATEGORIES: { name: string; subs: string[] }[] = [
  { name: "Housing",       subs: ["Rent", "Mortgage", "Utilities", "Internet", "Insurance"] },
  { name: "Food & Drink",  subs: ["Groceries", "Restaurants", "Coffee & Bars", "Takeaway"] },
  { name: "Transport",     subs: ["Fuel", "Public Transport", "Parking", "Car Insurance", "Taxi & Ride"] },
  { name: "Health",        subs: ["Pharmacy", "Doctor & Hospital", "Gym & Fitness", "Dental"] },
  { name: "Shopping",      subs: ["Clothing", "Electronics", "Home & Garden"] },
  { name: "Entertainment", subs: ["Streaming", "Cinema & Theatre", "Sports & Hobbies"] },
  { name: "Travel",        subs: ["Flights", "Hotels", "Activities"] },
  { name: "Education",     subs: ["Courses & Tuition", "Books & Stationery"] },
  { name: "Personal Care", subs: ["Haircut", "Beauty & Cosmetics"] },
  { name: "Income",        subs: ["Salary", "Freelance", "Investment Returns", "Benefits"] },
  { name: "Savings",       subs: ["Emergency Fund", "Retirement", "Investments"] },
  { name: "Other",         subs: [] },
];

export function useCategorySeed() {
  const db = usePowerSync();

  const seedDefaults = async (workspaceId: string) => {
    const now = new Date().toISOString();
    for (const cat of DEFAULT_CATEGORIES) {
      const catId = generateId();
      await db.execute(
        `INSERT OR IGNORE INTO categories (id, workspace_id, name, is_built_in, created_at)
         VALUES (?, ?, ?, 1, ?)`,
        [catId, workspaceId, cat.name, now]
      );
      for (const sub of cat.subs) {
        await db.execute(
          `INSERT OR IGNORE INTO subcategories (id, category_id, name, is_built_in, created_at)
           VALUES (?, ?, ?, 1, ?)`,
          [generateId(), catId, sub, now]
        );
      }
    }
  };

  return { seedDefaults };
}

export function useCategoryMutations() {
  const db = usePowerSync();

  const createCategory = async (workspaceId: string, name: string) => {
    const id = generateId();
    await db.execute(
      `INSERT INTO categories (id, workspace_id, name, is_built_in, created_at)
       VALUES (?, ?, ?, 0, ?)`,
      [id, workspaceId, name, new Date().toISOString()]
    );
    return id;
  };

  const deleteCategory = async (id: string, name: string): Promise<"ok" | "has_transactions"> => {
    // Check if any transactions use this category
    const result = await db.execute(
      "SELECT COUNT(*) as count FROM transactions WHERE category = ?",
      [name]
    );
    const count = result.rows?.item(0)?.count ?? 0;
    if (count > 0) return "has_transactions";
    await db.execute("DELETE FROM categories WHERE id = ?", [id]);
    return "ok";
  };

  const createSubcategory = async (categoryId: string, name: string) => {
    const id = generateId();
    await db.execute(
      `INSERT INTO subcategories (id, category_id, name, is_built_in, created_at)
       VALUES (?, ?, ?, 0, ?)`,
      [id, categoryId, name, new Date().toISOString()]
    );
    return id;
  };

  const deleteSubcategory = async (id: string) => {
    await db.execute("DELETE FROM subcategories WHERE id = ?", [id]);
  };

  return { createCategory, deleteCategory, createSubcategory, deleteSubcategory };
}
