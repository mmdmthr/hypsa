import type { ChangeEvent } from "react";
import { useState } from "react"
import { Search } from "lucide-react"
import MountainCard from "./MountainCard"

// Mountains are fetched server-side in index.astro and passed as a prop.
// This keeps the initial data fetch off the client and improves SEO/performance.

type MountainSearchItem = {
    id: string;
    name: string;
    slug: string;
    elevation: number;
    provinces: {
        name: string;
    } | null;
};

type SearchBarProps = {
    mountains?: MountainSearchItem[];
};

export default function SearchBar({
    mountains = [],
}: SearchBarProps) {
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const limit = 9

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };
    const filtered = mountains.filter((m) => {
        const provinceName = m.provinces?.name?.toLowerCase() ?? ""
        return (
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            provinceName.includes(search.toLowerCase())
        )
    })
    const displayed = filtered.slice(0, page * limit)

    return (
        <>
            {/* Search Input */}
            <div className="relative mb-6 sm:mb-6">
                <Search className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-400 w-5 h-5" />
                <input
                    type="search"
                    placeholder="Cari nama gunung atau provinsi..."
                    value={search}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-200 dark:bg-neutral-900 text-gray-200 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-neutral-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 transition-colors"
                />
            </div>

            {/* Results */}
            <div className="space-y-4">
                {displayed.map((m) => (
                    <MountainCard key={m.id} mountain={m} />
                ))}
            </div>

            {/* Show More */}
            {displayed.length < filtered.length && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        className="w-full sm:w-auto px-5 py-2 bg-teal-800 dark:bg-teal-800 hover:bg-teal-900 dark:hover:bg-teal-900 text-white dark:text-gray-100 rounded-full text-sm sm:text-base transition-colors"
                    >
                        Tampilkan lebih banyak
                    </button>
                </div>
            )}
        </>
    )
}
