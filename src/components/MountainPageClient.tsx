import { useState, useCallback } from "react";
import MountainViewer from "./MountainViewer";
import WaypointTimeline from "./WaypointTimeline";
import type { Waypoint } from "../api/waypoints";

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
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null);
  const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(false);

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

  return (
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
              mountainId={mountainId}
              trails={trails}
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
        {/* Trail Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5">
          <h2 className="text-slate-100 font-semibold text-base mb-5">
            Trail Information
          </h2>

          {/* Trail selector */}
          <div className="flex flex-col gap-1.5 mb-6">
            <label className="text-xs uppercase tracking-wide text-slate-400 font-medium">
              Trail
            </label>
            <div className="relative">
              <select
                disabled
                className="w-full appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2 cursor-not-allowed opacity-60 focus:outline-none"
              >
                {trails.length > 0 ? (
                  trails.map((trail) => (
                    <option key={trail.slug} value={trail.slug}>
                      {trail.name}
                    </option>
                  ))
                ) : (
                  <option value="">Pilih jalur pendakian</option>
                )}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                ▼
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5 flex flex-col gap-5">
            {(["Distance", "Elevation Gain", "Estimated Time", "Difficulty"] as const).map(
              (label) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                    {label}
                  </p>
                  <p className="text-slate-500 text-sm">—</p>
                </div>
              )
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Description
              </p>
              <p className="text-slate-500 text-sm italic">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Waypoints */}
        <WaypointTimeline
          waypoints={waypoints}
          selectedWaypointId={selectedWaypointId}
          onWaypointSelect={handleWaypointTimelineSelect}
          isLoading={isLoadingWaypoints}
        />
      </div>
    </div>
  );
}
