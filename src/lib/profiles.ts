import { supabase } from "./supabase";

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  color: string;
}

export async function searchProfiles(
  query: string,
  excludeIds: string[] = [],
): Promise<Profile[]> {
  if (!supabase || !query.trim() || query.trim().length < 2) return [];

  let q = supabase
    .from("profiles")
    .select("id, display_name, email, color")
    .or(`display_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
    .limit(8);

  if (excludeIds.length > 0) {
    q = q.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data } = await q;
  return data ?? [];
}
