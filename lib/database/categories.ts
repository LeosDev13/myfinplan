import { useQuery, usePowerSync } from "@powersync/react-native";
import { Category, Subcategory } from "../types";

export interface CategoryWithSubs extends Category {
  subcategories: Subcategory[];
}

// Flat row returned by the JOIN query
interface CategoryJoinRow {
  category_id: string;
  category_name: string;
  category_built_in: number;
  category_created_at: string;
  workspace_id: string;
  sub_id: string | null;
  sub_name: string | null;
  sub_built_in: number | null;
  sub_created_at: string | null;
}

export function useCategoriesWithSubs() {
  const result = useQuery<CategoryJoinRow>(`
    SELECT
      c.id           AS category_id,
      c.name         AS category_name,
      c.is_built_in  AS category_built_in,
      c.created_at   AS category_created_at,
      c.workspace_id AS workspace_id,
      s.id           AS sub_id,
      s.name         AS sub_name,
      s.is_built_in  AS sub_built_in,
      s.created_at   AS sub_created_at
    FROM categories c
    LEFT JOIN subcategories s ON s.category_id = c.id
    ORDER BY c.is_built_in DESC, c.name ASC, s.name ASC
  `);

  // Group flat rows into CategoryWithSubs
  const grouped: CategoryWithSubs[] = [];
  const seen = new Map<string, CategoryWithSubs>();

  for (const row of result.data) {
    if (!seen.has(row.category_id)) {
      const cat: CategoryWithSubs = {
        id: row.category_id,
        workspace_id: row.workspace_id,
        name: row.category_name,
        is_built_in: row.category_built_in,
        created_at: row.category_created_at,
        subcategories: [],
      };
      seen.set(row.category_id, cat);
      grouped.push(cat);
    }
    if (row.sub_id && row.sub_name !== null) {
      seen.get(row.category_id)!.subcategories.push({
        id: row.sub_id,
        category_id: row.category_id,
        name: row.sub_name,
        is_built_in: row.sub_built_in ?? 0,
        created_at: row.sub_created_at ?? "",
      });
    }
  }

  return { ...result, data: grouped };
}

export function useCategoryMutations() {
  const db = usePowerSync();

  const createCategory = async (workspaceId: string, name: string) => {
    const id = crypto.randomUUID();
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
    const id = crypto.randomUUID();
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
