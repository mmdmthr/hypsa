import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type ProfilePoint = {
  point_index: number;
  distance_m: number;
  elevation_m: number;
  longitude: number;
  latitude: number;
};

type ElevationProfileProps = {
  data: ProfilePoint[];
  onHover?: (point: ProfilePoint | null) => void;
};

function formatDistance(distanceM: number) {
  return (distanceM / 1000).toFixed(1);
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
  onHover,
}: ElevationProfileProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 8,
            right: 12,
            left: 0,
            bottom: 0,
          }}
          onMouseMove={(state) => {
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

          <Line
            type="monotone"
            dataKey="elevation_m"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}