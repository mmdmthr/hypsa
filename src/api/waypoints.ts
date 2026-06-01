import { supabase } from "../lib/supabase";

// --- Types ---

export interface Waypoint {
  id: number;
  route_id: number;
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
 * Fetch all published waypoints for a given route, sorted by sort_order.
 * Reads from the hiking_route_waypoints_geojson view.
 *
 * @param routeId - The ID of the hiking route
 * @returns Array of waypoints sorted by sort_order, or empty array on error
 */
export async function getWaypointsByRoute(
  routeId: number
): Promise<Waypoint[]> {
  const { data, error } = await supabase
    .from("hiking_route_waypoints_geojson")
    .select("*")
    .eq("route_id", routeId)
    .eq("publication_status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(
      `[getWaypointsByRoute] Error fetching waypoints for route ${routeId}:`,
      error.message
    );
    return [];
  }

  return ((data ?? []) as unknown) as Waypoint[];
}
