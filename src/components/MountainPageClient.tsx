import { useState, useCallback } from "react";
import MountainViewer from "./MountainViewer";
import WaypointTimeline from "./WaypointTimeline";
import TrailSelector from "./TrailSelector";
import TrailInfoCard from "./TrailInfoCard";
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
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(
    trails.length > 0 ? trails[0].id : null
  );
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null);
  const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(false);

  const handleTrailChange = useCallback((trailId: string) => {
    setSelectedTrailId(trailId);
    setWaypoints([]);
    setSelectedWaypointId(null);
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
          onWaypointSelect={handleWaypointTimelineSelect}
          isLoading={isLoadingWaypoints}
        />
      </div>
    </div>
  );
}
