import type { MountainListItem } from "../api/mountains";

type MountainCardMountain = MountainListItem & {
  imageUrl?: string | null;
  description?: string | null;
};

type MountainCardProps = {
  mountain: MountainCardMountain;
};

export default function MountainCard({ mountain }: MountainCardProps) {
  const provinceName = mountain.provinces?.name ?? "Province belum tersedia";
  const elevation = Number(mountain.elevation).toLocaleString("id-ID");
  const description =
    mountain.description?.trim() ||
    "Deskripsi singkat belum tersedia dari sumber data.";
  const imageUrl = mountain.imageUrl?.trim();

  return (
    <a
      href={`/mountains/${mountain.slug}`}
      className="group block overflow-hidden rounded-[1.75rem] border border-forest/10 bg-surface shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-surface/10 dark:bg-ink/80"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-beige/50 dark:bg-forest/20">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={mountain.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-ink/70 dark:text-surface/70">
              Image is not available in the current data payload.
            </p>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="text-xs uppercase tracking-[0.24em] text-forest/70 dark:text-beige/70">
          Mountain
        </div>
        <h3 className="mt-2 font-heading text-xl font-semibold text-ink dark:text-surface">
          {mountain.name}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/80 dark:text-surface/80">
          <span className="font-semibold text-forest dark:text-beige">
            {elevation} mdpl
          </span>
          <span>•</span>
          <span>{provinceName}</span>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-7 text-ink/70 dark:text-surface/70">
          {description}
        </p>
      </div>
    </a>
  );
}