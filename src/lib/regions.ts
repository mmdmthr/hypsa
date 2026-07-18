import type { MountainListItem } from "../api/mountains";

export interface RegionDefinition {
  name: string;
  image: string;
}

export const regionDefinitions: RegionDefinition[] = [
  {
    name: "Sumatra",
    image: "/images/regions/sumatra.svg",
  },
  {
    name: "Java",
    image: "/images/regions/java.svg",
  },
  {
    name: "Bali & Nusa Tenggara",
    image: "/images/regions/bali-nusa-tenggara.svg",
  },
  {
    name: "Kalimantan",
    image: "/images/regions/kalimantan.svg",
  },
  {
    name: "Sulawesi",
    image: "/images/regions/sulawesi.svg",
  },
  {
    name: "Maluku",
    image: "/images/regions/maluku.svg",
  },
  {
    name: "Papua",
    image: "/images/regions/papua.svg",
  },
];

// Proposed province-to-region mapping for review before using it for counts.
export const provinceToRegion: Record<string, string> = {
  Aceh: "Sumatra",
  "Sumatra Utara": "Sumatra",
  "Sumatra Barat": "Sumatra",
  Riau: "Sumatra",
  "Kepulauan Riau": "Sumatra",
  Jambi: "Sumatra",
  Bengkulu: "Sumatra",
  "Sumatra Selatan": "Sumatra",
  Lampung: "Sumatra",
  "Bangka Belitung": "Sumatra",
  Jakarta: "Java",
  "Jawa Barat": "Java",
  "Jawa Tengah": "Java",
  "Jawa Timur": "Java",
  Banten: "Java",
  "Daerah Istimewa Yogyakarta": "Java",
  Bali: "Bali & Nusa Tenggara",
  "Nusa Tenggara Barat": "Bali & Nusa Tenggara",
  "Nusa Tenggara Timur": "Bali & Nusa Tenggara",
  "Kalimantan Barat": "Kalimantan",
  "Kalimantan Tengah": "Kalimantan",
  "Kalimantan Selatan": "Kalimantan",
  "Kalimantan Timur": "Kalimantan",
  "Kalimantan Utara": "Kalimantan",
  "Sulawesi Utara": "Sulawesi",
  "Sulawesi Tengah": "Sulawesi",
  "Sulawesi Selatan": "Sulawesi",
  "Sulawesi Tenggara": "Sulawesi",
  "Sulawesi Barat": "Sulawesi",
  Gorontalo: "Sulawesi",
  Maluku: "Maluku",
  "Maluku Utara": "Maluku",
  Papua: "Papua",
  "Papua Barat": "Papua",
  "Papua Tengah": "Papua",
  "Papua Pegunungan": "Papua",
  "Papua Selatan": "Papua",
  "Papua Barat Daya": "Papua",
};

export function getRegionCards(mountains: MountainListItem[]) {
  const counts = new Map<string, number>();

  mountains.forEach((mountain) => {
    const provinceName = mountain.provinces?.name?.trim();
    const regionName = provinceName ? provinceToRegion[provinceName] : undefined;

    if (!regionName) return;

    counts.set(regionName, (counts.get(regionName) ?? 0) + 1);
  });

  return regionDefinitions.map((region) => ({
    name: region.name,
    image: region.image,
    count: counts.get(region.name) ?? 0,
  }));
}
