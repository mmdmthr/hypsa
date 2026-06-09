interface Trail {
  id: number;
  name: string;
}

interface TrailSelectorProps {
  trails: Trail[];
  selectedTrailId: number | null;
  onTrailChange: (trailId: number) => void;
}

export default function TrailSelector({
  trails,
  selectedTrailId,
  onTrailChange,
}: TrailSelectorProps) {
  if (trails.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5">
        <p className="text-slate-500 text-sm">Belum ada jalur pendakian tersedia.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="trail-select"
          className="text-xs uppercase tracking-wide text-slate-400 font-medium"
        >
          Trail
        </label>
        <div className="relative">
          <select
            id="trail-select"
            value={selectedTrailId ?? ""}
            onChange={(e) => onTrailChange(Number(e.target.value))}
            className="w-full appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            {trails.map((trail) => (
              <option key={trail.id} value={trail.id}>
                {trail.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            ▼
          </span>
        </div>
      </div>
    </div>
  );
}
