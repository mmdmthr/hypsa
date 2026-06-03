import { useState, useCallback, useEffect } from "react";
import MountainViewer from "./MountainViewer";
import WaypointTimeline from "./WaypointTimeline";
import TrailSelector from "./TrailSelector";
import TrailInfoCard from "./TrailInfoCard";
import ElevationProfile from "./ElevationProfile";
import type { Waypoint } from "../api/waypoints";
import { supabase } from "../lib/supabase";

type ProfilePoint = {
  point_index: number;
  distance_m: number;
  elevation_m: number;
  longitude: number;
  latitude: number;
};

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Trail {
  id: string;
  mountain_id: string;
  name: string;
  slug: string;
}

interface BBox {
  north: number;
  south: number;
  west: number;
  east: number;
}

interface MountainPageClientProps {
  slug: string;
  bbox: BBox;
  mountainId: number;
  trails: Trail[];
  hasHeightmap: boolean;
}

export default function MountainPageClient({
  slug,
  bbox,
  mountainId,
  trails,
  hasHeightmap,
}: MountainPageClientProps) {
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(
    trails.length > 0 ? trails[0].id : null
  );
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null);
  const [hoveredWaypointId, setHoveredWaypointId] = useState<number | null>(null);
  const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(false);
  const [profilePoints, setProfilePoints] = useState<ProfilePoint[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hoveredProfilePoint, setHoveredProfilePoint] = useState<ProfilePoint | null>(null);

  const handleTrailChange = useCallback((trailId: string) => {
    setSelectedTrailId(trailId);
    setWaypoints([]);
    setSelectedWaypointId(null);
    setHoveredWaypointId(null);
    setHoveredProfilePoint(null);
  }, []);

  const handleWaypointsLoaded = useCallback((wps: Waypoint[]) => {
    setWaypoints(wps);
    setSelectedWaypointId(null);
  }, []);

  const handleWaypointsLoadingChange = useCallback((loading: boolean) => {
    setIsLoadingWaypoints(loading);
  }, []);

  const handleWaypointMarkerClick = useCallback((id: number) => {
    setSelectedWaypointId(id);
  }, []);

  const handleWaypointTimelineSelect = useCallback((id: number) => {
    setSelectedWaypointId(id);
  }, []);

  const selectedTrail = trails.find((t) => t.id === selectedTrailId) ?? null;

  useEffect(() => {
    if (!selectedTrailId) {
      setProfilePoints([]);
      return;
    }

    let cancelled = false;
    setIsLoadingProfile(true);

    (async () => {
      const { data, error } = await supabase
        .from("trails_geojson")
        .select("geometry")
        .eq("id", selectedTrailId)
        .single();

      if (cancelled) return;

      if (error || !data?.geometry) {
        setProfilePoints([]);
        setIsLoadingProfile(false);
        return;
      }

      const coords: [number, number, number][] = data.geometry.coordinates;
      const points: ProfilePoint[] = [];
      let cumulativeDistance = 0;

      for (let i = 0; i < coords.length; i++) {
        const [lon, lat, ele] = coords[i];
        if (i > 0) {
          const [prevLon, prevLat] = coords[i - 1];
          cumulativeDistance += haversineMeters(prevLat, prevLon, lat, lon);
        }
        points.push({
          point_index: i,
          distance_m: cumulativeDistance,
          elevation_m: ele,
          longitude: lon,
          latitude: lat,
        });
      }

      setProfilePoints(points);
      setIsLoadingProfile(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTrailId]);

  const totalDistanceKm =
    profilePoints.length > 0
      ? (profilePoints[profilePoints.length - 1].distance_m / 1000).toFixed(1)
      : null;

  const elevationGain =
    profilePoints.length > 1
      ? Math.round(
          profilePoints.reduce((gain, point, i) => {
            if (i === 0) return 0;
            const delta = point.elevation_m - profilePoints[i - 1].elevation_m;
            return gain + (delta > 0 ? delta : 0);
          }, 0)
        )
      : null;

  const minElevation =
    profilePoints.length > 0
      ? Math.round(Math.min(...profilePoints.map((p) => p.elevation_m)))
      : null;

  const maxElevation =
    profilePoints.length > 0
      ? Math.round(Math.max(...profilePoints.map((p) => p.elevation_m)))
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: viewer + sidebar */}
      <div className="grid grid-cols-[2fr_380px] gap-6">
        {/* Left column: Viewer */}
        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900"
            style={{ height: "800px" }}
          >
            {hasHeightmap ? (
              <MountainViewer
                slug={slug}
                bbox={bbox}
                selectedTrailId={selectedTrailId}
                selectedWaypointId={selectedWaypointId}
                onWaypointsLoaded={handleWaypointsLoaded}
                onWaypointsLoadingChange={handleWaypointsLoadingChange}
                onWaypointMarkerClick={handleWaypointMarkerClick}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-slate-500 text-sm">
                  Data heightmap tidak tersedia.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <TrailSelector
            trails={trails}
            selectedTrailId={selectedTrailId}
            onTrailChange={handleTrailChange}
          />
          <TrailInfoCard trail={selectedTrail} />
          <WaypointTimeline
            waypoints={waypoints}
            selectedWaypointId={selectedWaypointId}
            hoveredWaypointId={hoveredWaypointId}
            onWaypointSelect={handleWaypointTimelineSelect}
            onWaypointHover={setHoveredWaypointId}
            isLoading={isLoadingWaypoints}
          />
        </div>
      </div>

      {/* Elevation Statistics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5">
        <h2 className="text-slate-100 font-semibold text-base mb-5">
          Elevation Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(
            [
              { label: "Distance", value: totalDistanceKm, unit: "km" },
              { label: "Elevation Gain", value: elevationGain, unit: "m" },
              { label: "Min Elevation", value: minElevation, unit: "m" },
              { label: "Max Elevation", value: maxElevation, unit: "m" },
            ] as const
          ).map(({ label, value, unit }) => (
            <div
              key={label}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-4"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                {label}
              </p>
              {isLoadingProfile ? (
                <p className="text-slate-600 text-sm">—</p>
              ) : value !== null ? (
                <p className="text-teal-400 text-xl font-semibold">
                  {typeof value === "number"
                    ? value.toLocaleString("id-ID")
                    : value}{" "}
                  <span className="text-slate-400 text-sm font-normal">
                    {unit}
                  </span>
                </p>
              ) : (
                <p className="text-slate-600 text-sm">—</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Elevation Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5">
        <h2 className="text-slate-100 font-semibold text-base mb-5">
          Elevation Profile
        </h2>
        {isLoadingProfile ? (
          <div className="h-[360px] flex items-center justify-center">
            <p className="text-slate-500 text-sm">Memuat profil elevasi…</p>
          </div>
        ) : profilePoints.length === 0 ? (
          <div className="h-[360px] flex items-center justify-center">
            <p className="text-slate-500 text-sm italic">
              Tidak ada data elevasi tersedia.
            </p>
          </div>
        ) : (
          <ElevationProfile
            data={profilePoints}
            waypoints={waypoints}
            selectedWaypointId={selectedWaypointId}
            hoveredWaypointId={hoveredWaypointId}
            className="h-[360px]"
            onHover={(point) => setHoveredProfilePoint(point)}
            onWaypointHover={setHoveredWaypointId}
            onWaypointSelect={setSelectedWaypointId}
          />
        )}
      </div>
    </div>
  );
}
