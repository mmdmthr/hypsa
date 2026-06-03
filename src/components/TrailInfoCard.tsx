interface Trail {
  id: number;
  name: string;
  slug: string;
}

interface TrailInfoCardProps {
  trail: Trail | null;
}

export default function TrailInfoCard({ trail: _trail }: TrailInfoCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5">
      <h2 className="text-slate-100 font-semibold text-base mb-5">
        Trail Information
      </h2>
      <div className="flex flex-col gap-5">
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
  );
}
