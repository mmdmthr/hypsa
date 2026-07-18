type RegionCardProps = {
  region: {
    name: string;
    image: string;
    count: number;
  };
};

export default function RegionCard({ region }: RegionCardProps) {
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-forest/10 bg-surface shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-surface/10 dark:bg-ink/80">
      <div className="aspect-[4/3] overflow-hidden bg-beige/50 dark:bg-forest/20">
        <img
          src={region.image}
          alt={region.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
        />
      </div>

      <div className="p-5">
        <h3 className="font-heading text-xl font-semibold text-ink dark:text-surface">
          {region.name}
        </h3>
        <p className="mt-2 text-sm text-ink/70 dark:text-surface/70">
          {region.count} mountains
        </p>
      </div>
    </article>
  );
}
