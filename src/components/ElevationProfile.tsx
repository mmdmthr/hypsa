import { useMemo } from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ReferenceDot,
} from "recharts";
import type { Waypoint } from "../api/waypoints";

type ProfilePoint = {
    point_index: number;
    distance_m: number;
    elevation_m: number;
    longitude: number;
    latitude: number;
};

type ProfileWaypoint = {
    waypointId: number;
    name: string;
    type: string;
    elevation: number | null;
    distance_m: number;
    profileIndex: number;
    profileElevation_m: number;
};

type ElevationProfileProps = {
    data: ProfilePoint[];
    waypoints?: Waypoint[];
    selectedWaypointId?: number | null;
    hoveredWaypointId?: number | null;
    onHover?: (point: ProfilePoint | null) => void;
    onWaypointHover?: (id: number | null) => void;
    onWaypointSelect?: (id: number) => void;
    className?: string;
};

function formatDistance(distanceM: number) {
    return (distanceM / 1000).toFixed(1);
}

function getMarkerRadius(type: string, isActive: boolean): number {
    const base: Record<string, number> = {
        basecamp: 4,
        pos: 4,
        spring: 4,
        camp: 5,
        summit: 7,
    };
    const r = base[type?.toLowerCase()] ?? 4;
    return isActive ? r + 2 : r;
}

function WaypointDotLabel({
    viewBox,
    name,
    elevation,
}: {
    viewBox?: { cx: number; cy: number; r?: number };
    name: string;
    elevation: number | null;
}) {
    if (!viewBox) return null;
    const { cx, cy } = viewBox;
    const boxW = 110;
    const boxH = 34;
    const boxX = cx - boxW / 2;
    const boxY = cy - boxH - 10;

    return (
        <g style={{ pointerEvents: "none" }}>
            <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={5}
                fill="rgba(15,23,42,0.9)"
                stroke="#334155"
                strokeWidth={1}
            />
            <text
                x={cx}
                y={boxY + 13}
                textAnchor="middle"
                fill="#f1f5f9"
                fontSize={11}
                fontWeight={600}
            >
                {name}
            </text>
            <text
                x={cx}
                y={boxY + 26}
                textAnchor="middle"
                fill="#2dd4bf"
                fontSize={10}
            >
                {elevation != null
                    ? `${elevation.toLocaleString("id-ID")} mdpl`
                    : "—"}
            </text>
        </g>
    );
}

function CustomTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: any[];
}) {
    if (!active || !payload?.length) {
        return null;
    }

    const point = payload[0].payload;

    return (
        <div className="rounded border bg-background p-2 text-sm shadow">
            <div>
                <strong>
                    {(point.distance_m / 1000).toFixed(2)} km
                </strong>
            </div>

            <div>
                {Math.round(point.elevation_m)} mdpl
            </div>
        </div>
    );
}

export default function ElevationProfile({
    data,
    waypoints,
    selectedWaypointId,
    hoveredWaypointId,
    onHover,
    onWaypointHover,
    onWaypointSelect,
    className = "h-64",
}: ElevationProfileProps) {
    const profileWaypoints = useMemo<ProfileWaypoint[]>(() => {
        if (!waypoints?.length || !data.length) return [];

        return waypoints.map((wp) => {
            let bestIndex = 0;
            let bestDist = Infinity;
            const [wpLon, wpLat] = wp.geometry.coordinates;

            for (let i = 0; i < data.length; i++) {
                const dLat = data[i].latitude - wpLat;
                const dLon = data[i].longitude - wpLon;
                const d = dLat * dLat + dLon * dLon;
                if (d < bestDist) {
                    bestDist = d;
                    bestIndex = i;
                }
            }

            return {
                waypointId: wp.id,
                name: wp.name,
                type: wp.type,
                elevation: wp.elevation,
                distance_m: data[bestIndex].distance_m,
                profileIndex: bestIndex,
                profileElevation_m: data[bestIndex].elevation_m,
            };
        });
    }, [waypoints, data]);

    return (
        <div className={`${className} w-full`}>
            <ResponsiveContainer>
                <AreaChart
                    data={data}
                    margin={{
                        top: 8,
                        right: 12,
                        left: 0,
                        bottom: 0,
                    }}
                    onMouseMove={(state: any) => {
                        const point =
                            state?.activePayload?.[0]?.payload;

                        onHover?.(point ?? null);
                    }}
                    onMouseLeave={() => {
                        onHover?.(null);
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                        dataKey="distance_m"
                        tickFormatter={formatDistance}
                        unit=" km"
                    />

                    <YAxis
                        dataKey="elevation_m"
                        width={60}
                        unit=" m"
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                    />

                    <Area
                        type="monotone"
                        dataKey="elevation_m"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />

                    {profileWaypoints.map((pw) => {
                        const isSelected = selectedWaypointId === pw.waypointId;
                        const isHovered = hoveredWaypointId === pw.waypointId;
                        const isActive = isSelected || isHovered;

                        return (
                            <ReferenceDot
                                key={pw.waypointId}
                                x={pw.distance_m}
                                y={pw.profileElevation_m}
                                r={getMarkerRadius(pw.type, isActive)}
                                fill={
                                    isSelected
                                        ? "#14b8a6"
                                        : isHovered
                                          ? "#5eead4"
                                          : "#94a3b8"
                                }
                                stroke={isActive ? "#0d9488" : "#475569"}
                                strokeWidth={isActive ? 2 : 1}
                                style={{ cursor: "pointer" }}
                                onMouseEnter={() =>
                                    onWaypointHover?.(pw.waypointId)
                                }
                                onMouseLeave={() => onWaypointHover?.(null)}
                                onClick={() =>
                                    onWaypointSelect?.(pw.waypointId)
                                }
                                label={
                                    isActive
                                        ? {
                                              content: (props: any) => (
                                                  <WaypointDotLabel
                                                      viewBox={props.viewBox}
                                                      name={pw.name}
                                                      elevation={pw.elevation}
                                                  />
                                              ),
                                          }
                                        : undefined
                                }
                            />
                        );
                    })}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}