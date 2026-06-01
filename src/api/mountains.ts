import { supabase } from "../lib/supabase";

// --- Types ---

export interface Province {
  name: string;
}

export interface Mountain {
  id: number;
  slug: string;
  name: string;
  elevation: number;
  province_id: number;
  island_id: number | null;
  lat: number;
  lng: number;
  min_lat: number | null;
  min_lng: number | null;
  max_lat: number | null;
  max_lng: number | null;
  // Joined relation: Supabase PostgREST returns the related row under the table name
  provinces: Province | null;
}

// Lighter type used on listing pages — only the fields we actually render
export type MountainListItem = Pick<
  Mountain,
  "id" | "slug" | "name" | "elevation" | "lat" | "lng" | "provinces"
>;

// --- Module-level cache ---
// Populated once during build; subsequent calls within the same Node process
// (i.e. every page in getStaticPaths) return the cached array without hitting
// Supabase again.
let mountainsCache: Mountain[] | null = null;

// --- API functions ---

/**
 * Fetch ALL mountains with full fields + province name, ordered alphabetically.
 * Results are cached in-process so the build only executes one Supabase query
 * regardless of how many static pages are generated.
 */
export async function getAllMountains(): Promise<Mountain[]> {
  if (mountainsCache) return mountainsCache;

  const { data, error } = await supabase
    .from("mountains")
    .select("*, provinces(name)")
    .order("name");

  if (error) throw new Error(`Failed to fetch all mountains: ${error.message}`);
  mountainsCache = ((data ?? []) as unknown) as Mountain[];
  return mountainsCache;
}

/**
 * Fetch all mountains (lightweight fields only) ordered alphabetically.
 * Used for the home page listing and search.
 */
export async function getMountains(): Promise<MountainListItem[]> {
  const { data, error } = await supabase
    .from("mountains")
    .select("id, slug, name, elevation, lat, lng, provinces(name)")
    .eq("publication_status", "published")
    .order("name");

  if (error) throw new Error(`Failed to fetch mountains: ${error.message}`);
  // Cast through unknown: Supabase SDK types joined relations as arrays internally,
  // but PostgREST returns a single object for many-to-one (province_id) joins.
  return ((data ?? []) as unknown) as MountainListItem[];
}

/**
 * Fetch only slugs — used in getStaticPaths() to generate all mountain pages
 * without pulling unnecessary data.
 */
export async function getMountainSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from("mountains").select("slug");

  if (error)
    throw new Error(`Failed to fetch mountain slugs: ${error.message}`);
  return (data ?? []).map((row) => row.slug as string);
}

/**
 * Fetch a single mountain with all fields and its province name.
 * Returns null if not found (PGRST116 = no rows).
 */
export async function getMountainBySlug(
  slug: string
): Promise<Mountain | null> {
  const { data, error } = await supabase
    .from("mountains")
    .select("*, provinces(name)")
    .eq("slug", slug)
    .single();

  if (error) {
    // PGRST116 = PostgREST "no rows" — treat as 404, not an exception
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch mountain "${slug}": ${error.message}`);
  }

  return data as unknown as Mountain;
}
