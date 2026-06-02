import { supabase } from "../lib/supabase";

// --- Types ---

export interface Waypoint {
  id: number;
  trail_id: number;
  name: string;
  type: string;
  sort_order: number;
  elevation: number | null;
  publication_status: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

// --- API functions ---

/**
 * Fetch all published waypoints for a given trail, sorted by sort_order.
 * Reads from the trail_waypoints_geojson view.
 *
 * @param trailId - The ID of the hiking trail
 * @returns Array of waypoints sorted by sort_order, or empty array on error
 */
export async function getWaypointsByTrail(
  trailId: number
): Promise<Waypoint[]> {
  const { data, error } = await supabase
    .from("trail_waypoints_geojson")
    .select("*")
    .eq("trail_id", trailId)
    .eq("publication_status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(
      `[getWaypointsByTrail] Error fetching waypoints for trail ${trailId}:`,
      error.message
    );
    return [];
  }

  return ((data ?? []) as unknown) as Waypoint[];
}
