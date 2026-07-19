import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import MountainCard from "./MountainCard";
import type { MountainListItem } from "../api/mountains";

// Mountains are fetched server-side in index.astro and passed as a prop.
// This keeps the initial data fetch off the client and improves SEO/performance.

type SearchBarProps = {
    mountains?: MountainListItem[];
};

export default function SearchBar({
    mountains = [],
}: SearchBarProps) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const limit = 9;

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);
        requestAnimationFrame(() => inputRef.current?.focus());

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const filtered = mountains.filter((m) => {
        const provinceName = m.provinces?.name?.toLowerCase() ?? "";
        return (
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            provinceName.includes(search.toLowerCase())
        );
    });
    const displayed = filtered.slice(0, page * limit);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex w-full items-center justify-between rounded-full border border-white/30 bg-white/90 px-4 py-3 text-left text-ink shadow-lg shadow-black/10 transition hover:border-surface hover:bg-white/95 dark:border-forest/40 dark:bg-ink/80 dark:text-surface dark:hover:border-sky"
                aria-label="Open mountain search"
                aria-haspopup="dialog"
                aria-controls="mountain-search-dialog"
            >
                <span className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-beige/70 text-ink dark:bg-forest/30 dark:text-surface">
                        <Search className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-ink/80 dark:text-surface/90">
                        Find mountains or provinces...
                    </span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-ink/60 dark:text-surface/70">
                    Search
                </span>
            </button>

            {isOpen && (
                <div
                    id="mountain-search-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Search mountains"
                    className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/70 px-4 py-4 sm:items-center sm:px-6"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="w-full max-w-3xl rounded-[28px] border border-beige/70 bg-surface p-4 shadow-2xl dark:border-forest/40 dark:bg-ink sm:p-6"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center gap-3 rounded-full border border-beige/70 bg-surface px-3 py-2 shadow-sm dark:border-forest/40 dark:bg-ink/80">
                            <Search className="h-5 w-5 text-forest/80 dark:text-sky" />
                            <input
                                ref={inputRef}
                                type="search"
                                placeholder="Find mountains or provinces..."
                                value={search}
                                onChange={handleSearch}
                                className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/60 dark:text-surface dark:placeholder:text-surface/60"
                            />
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-beige/50 dark:text-surface dark:hover:bg-forest/30"
                                aria-label="Close search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                            {displayed.map((m) => (
                                <MountainCard key={m.id} mountain={{
                                    ...m,
                                    imageUrl: `/images/gallery/mountains/${m.slug}.jpeg`,
                                }} />
                            ))}
                        </div>

                        {displayed.length < filtered.length && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    className="w-full rounded-full bg-forest px-5 py-2 text-sm font-semibold text-surface transition hover:bg-forest/90 dark:bg-sky dark:text-ink dark:hover:bg-sky/90 sm:w-auto"
                                >
                                    Tampilkan lebih banyak
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
