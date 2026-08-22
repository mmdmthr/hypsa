import type { Waypoint } from "../api/waypoints";

interface WaypointTimelineProps {
  waypoints: Waypoint[];
  selectedWaypointId: number | null;
  hoveredWaypointId?: number | null;
  onWaypointSelect: (id: number) => void;
  onWaypointHover?: (id: number | null) => void;
  isLoading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  basecamp: "Basecamp",
  pos: "Pos",
  spring: "Mata Air",
  camp: "Camp",
  summit: "Summit",
  shelter: "Shelter",
  viewpoint: "Viewpoint",
};

export default function WaypointTimeline({
  waypoints,
  selectedWaypointId,
  hoveredWaypointId,
  onWaypointSelect,
  onWaypointHover,
  isLoading = false,
}: WaypointTimelineProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5">
      <h2 className="text-slate-100 font-semibold text-base mb-4">Waypoints</h2>

      {isLoading && (
        <p className="text-slate-500 text-sm">Memuat waypoint…</p>
      )}

      {!isLoading && waypoints.length === 0 && (
        <p className="text-slate-500 text-sm italic">
          Tidak ada waypoint tersedia.
        </p>
      )}

      {!isLoading && waypoints.length > 0 && (
        <div className="flex flex-col gap-1 max-h-full overflow-y-auto pr-1">
          {waypoints.map((wp) => {
            const isSelected = selectedWaypointId === wp.id;
            const isHovered = hoveredWaypointId === wp.id;
            return (
              <button
                key={wp.id}
                onClick={() => onWaypointSelect(wp.id)}
                onMouseEnter={() => onWaypointHover?.(wp.id)}
                onMouseLeave={() => onWaypointHover?.(null)}
                className={[
                  "w-full text-left px-3 py-2.5 rounded-lg transition-colors border",
                  isSelected
                    ? "bg-teal-500/20 border-teal-500/50"
                    : isHovered
                      ? "bg-slate-700 border-slate-600"
                      : "bg-slate-800 border-transparent hover:bg-slate-700",
                ].join(" ")}
              >
                <p className="text-slate-100 text-sm font-medium leading-tight">
                  {wp.name}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {TYPE_LABELS[wp.type?.toLowerCase()] ?? wp.type}
                </p>
                {wp.elevation != null && (
                  <p className="text-teal-400 text-xs mt-0.5">
                    {wp.elevation.toLocaleString("id-ID")} mdpl
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
