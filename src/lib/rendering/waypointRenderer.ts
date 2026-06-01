import * as THREE from "three";
import type { Waypoint } from "../../api/waypoints";

/**
 * Waypoint marker information stored with Three.js objects for cleanup
 */
interface WaypointMarkerData {
  geometry: THREE.SphereGeometry;
  material: THREE.Material;
  mesh: THREE.Mesh;
}

/**
 * Rendering context for waypoints
 */
interface WaypointRenderContext {
  group: THREE.Group;
  markers: Map<number, WaypointMarkerData>;
}

/**
 * Coordinate conversion helper
 * Converts lat/lon to scene coordinates using bounding box
 */
function latLonToScene(
  lat: number,
  lon: number,
  bbox: { north: number; south: number; east: number; west: number },
  terrainWidth: number,
  terrainHeight: number
): { x: number; z: number } {
  const x =
    ((lon - bbox.west) / (bbox.east - bbox.west)) * terrainWidth -
    terrainWidth / 2;

  const z =
    ((bbox.north - lat) / (bbox.north - bbox.south)) * terrainHeight -
    terrainHeight / 2;

  return { x, z };
}

/**
 * Sample elevation from heightmap data at pixel coordinates
 */
function sampleElevation(
  pixelX: number,
  pixelY: number,
  heightmapData: Uint8ClampedArray,
  imageDimensions: { width: number; height: number }
): number {
  // Clamp pixel coordinates to image bounds
  const px = Math.max(0, Math.min(imageDimensions.width - 1, pixelX));
  const py = Math.max(0, Math.min(imageDimensions.height - 1, pixelY));

  const pixelIndex = (py * imageDimensions.width + px) * 4;
  const brightness = heightmapData[pixelIndex];
  return brightness * 0.15; // Scale factor matches terrain rendering
}

/**
 * Get material color based on waypoint type
 * Returns color for known types, defaults to teal for unknown types
 */
function getWaypointColor(type: string): number {
  const colorMap: { [key: string]: number } = {
    basecamp: 0x10b981, // emerald
    pos: 0xffffff, // white
    spring: 0x06b6d4, // cyan
    camp: 0x3b82f6, // blue
    summit: 0xf59e0b, // amber
    shelter: 0x8b5cf6, // violet
    viewpoint: 0xec4899, // violet
  };

  return colorMap[type.toLowerCase()] ?? 0x14b8a6; // default teal
}

/**
 * Create a waypointRenderContext with an empty Three.js Group
 */
export function createWaypointGroup(): WaypointRenderContext {
  return {
    group: new THREE.Group(),
    markers: new Map(),
  };
}

/**
 * Render waypoints for a given route
 *
 * @param waypoints - Array of waypoints to render
 * @param context - Waypoint render context (group + markers map)
 * @param bbox - Bounding box for coordinate conversion
 * @param terrainWidth - Width of terrain mesh in scene units
 * @param terrainHeight - Height of terrain mesh in scene units
 * @param heightmapData - Heightmap pixel data (RGBA)
 * @param imageDimensions - Heightmap image dimensions
 */
export function renderWaypoints(
  waypoints: Waypoint[],
  context: WaypointRenderContext,
  bbox: { north: number; south: number; east: number; west: number },
  terrainWidth: number,
  terrainHeight: number,
  heightmapData: Uint8ClampedArray,
  imageDimensions: { width: number; height: number }
): void {
  // Clear existing waypoints before rendering new ones
  clearWaypoints(context);

  waypoints.forEach((waypoint) => {
    // Extract coordinates from GeoJSON Point
    const [lon, lat] = waypoint.geometry.coordinates;

    // Convert geographic coordinates to scene coordinates
    const { x, z } = latLonToScene(lat, lon, bbox, terrainWidth, terrainHeight);

    // Sample elevation from heightmap
    const pixelX = Math.floor(
      ((lon - bbox.west) / (bbox.east - bbox.west)) * imageDimensions.width
    );
    const pixelY = Math.floor(
      ((bbox.north - lat) / (bbox.north - bbox.south)) * imageDimensions.height
    );
    const elevation = sampleElevation(
      pixelX,
      pixelY,
      heightmapData,
      imageDimensions
    );

    // Create sphere geometry and material
    const sphereRadius = 0.35;
    const geometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
    const color = getWaypointColor(waypoint.type);
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.7,
    });

    // Create mesh and position it
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, elevation + 0.5, z); // Place 0.5 units above terrain

    // Add to group
    context.group.add(mesh);

    // Store for cleanup
    context.markers.set(waypoint.id, { geometry, material, mesh });
  });
}

/**
 * Clear all waypoint markers and dispose geometries/materials
 * Prevents memory leaks when switching routes
 *
 * @param context - Waypoint render context
 */
export function clearWaypoints(context: WaypointRenderContext): void {
  context.markers.forEach((markerData) => {
    // Remove mesh from group
    context.group.remove(markerData.mesh);

    // Dispose geometry
    markerData.geometry.dispose();

    // Dispose material
    markerData.material.dispose();
  });

  // Clear the markers map
  context.markers.clear();
}

/**
 * Destroy the waypoint render context completely
 * Call this during cleanup (e.g., component unmount)
 *
 * @param context - Waypoint render context
 */
export function disposeWaypointContext(context: WaypointRenderContext): void {
  clearWaypoints(context);
  // Group will be garbage collected after removal from scene
}
