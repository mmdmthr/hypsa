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
    points.push({
      lat: Number(point.lat),
      lon: Number(point.lon),
    });
  }
}

if (points.length < 2) {
  throw new Error("Track contains less than 2 points");
}

// ----------------------
// Build WKT
// ----------------------

const wkt =
  "LINESTRING(" +
  points
    .map((p) => `${p.lon} ${p.lat}`)
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