import fs from "fs";
import { XMLParser } from "fast-xml-parser";

// ----------------------
// Parse CLI args
// ----------------------

function getArg(name, required = true) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    if (required) {
      throw new Error(`Missing argument: ${name}`);
    }

    return null;
  }

  return process.argv[index + 1];
}

const file = getArg("--file");
const mountainId = getArg("--mountain-id");
const name = getArg("--name");
const slug = getArg("--slug");
const source = getArg("--source", false) ?? "gpx";
const status = getArg("--status", false) ?? "draft";

// ----------------------
// Read GPX
// ----------------------

const xml = fs.readFileSync(file, "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

const gpx = parser.parse(xml);

if (!gpx?.gpx?.trk?.trkseg) {
  throw new Error("No track segments found in GPX");
}

// Support single or multiple segments
const segments = Array.isArray(gpx.gpx.trk.trkseg)
  ? gpx.gpx.trk.trkseg
  : [gpx.gpx.trk.trkseg];

const points = [];

for (const segment of segments) {
  const trkpts = Array.isArray(segment.trkpt)
    ? segment.trkpt
    : [segment.trkpt];

  for (const point of trkpts) {
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    const ele = Number(point.ele);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new Error("Invalid coordinate found in GPX");
    }

    if (Number.isNaN(ele)) {
      throw new Error(
        `Missing elevation at point ${points.length + 1}`
      );
    }

    points.push({
      lat,
      lon,
      ele,
    });
  }
}

if (points.length < 2) {
  throw new Error("Track contains less than 2 points");
}

// ----------------------
// Build 3D WKT
// ----------------------

const wkt =
  "LINESTRING Z(" +
  points
    .map(
      (p) =>
        `${p.lon} ${p.lat} ${p.ele}`
    )
    .join(",") +
  ")";

// Escape single quotes
const escapedWkt = wkt.replace(/'/g, "''");

// ----------------------
// Generate SQL
// ----------------------

const sql = `
INSERT INTO trails (
    mountain_id,
    name,
    slug,
    source,
    publication_status,
    geom
)
VALUES (
    ${mountainId},
    '${name.replace(/'/g, "''")}',
    '${slug.replace(/'/g, "''")}',
    '${source.replace(/'/g, "''")}',
    '${status.replace(/'/g, "''")}',
    ST_GeomFromText(
        '${escapedWkt}',
        4326
    )
);
`;

const outputFile = `${slug}.sql`;

fs.writeFileSync(outputFile, sql);

console.log(`Generated: ${outputFile}`);
console.log(`Track points: ${points.length}`);
console.log(
  `Elevation range: ${Math.min(
    ...points.map((p) => p.ele)
  )}m - ${Math.max(
    ...points.map((p) => p.ele)
  )}m`
);
console.log("Geometry type: LINESTRING Z");