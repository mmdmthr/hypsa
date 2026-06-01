import { useEffect, useRef, useState } from "react";

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { supabase } from "../lib/supabase";
import { getWaypointsByRoute } from "../api/waypoints";

export default function MountainViewer({ slug, bbox, mountainId, routes }) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [allRoutes, setAllRoutes] = useState(routes || []);
  const [selectedRouteSlug, setSelectedRouteSlug] = useState(
    routes && routes.length > 0 ? routes[0].slug : null
  );

    // Waypoints state
    const [waypoints, setWaypoints] = useState([]);
    const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(false);
    const [waypointsError, setWaypointsError] = useState(null);

  // Refs to preserve scene objects across re-renders
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const terrainTextureRef = useRef(null);
  const heightmapDataRef = useRef(null);
  const imageDimensionsRef = useRef(null);
  const routeLineRef = useRef(null);

  const imagePath = `/heightmaps/${slug}_heightmap.png`;
  const texturePath = `/textures/${slug}_satellite.jpg`;

  // Fetch routes on client side if not provided from server
  useEffect(() => {
    if (allRoutes.length > 0) return; // Already have routes from server
    
    if (!mountainId) {
      console.warn("[MountainViewer] No mountainId provided, cannot fetch routes");
      return;
    }

    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from("hiking_routes_geojson")
          .select("id, mountain_id, name, slug")
          .eq("mountain_id", mountainId)
          .order("name");

        if (error) {
          console.error("[MountainViewer] Route fetch error:", error.message);
        } else if (data) {
          console.log(`[MountainViewer] Fetched ${data.length} routes for mountain ${mountainId}`);
          setAllRoutes(data);
          if (data.length > 0 && !selectedRouteSlug) {
            setSelectedRouteSlug(data[0].slug);
          }
        }
      } catch (err) {
        console.error("[MountainViewer] Route fetch exception:", err);
      }
    };

    fetchRoutes();
  }, [mountainId]);

  function latLonToScene(lat, lon, bbox, terrainWidth, terrainHeight) {
    const x =
      ((lon - bbox.west) /
        (bbox.east - bbox.west))
      * terrainWidth
      - terrainWidth / 2;

    const z =
      ((bbox.north - lat) /
        (bbox.north - bbox.south))
      * terrainHeight
      - terrainHeight / 2;

    return { x, z };
  }

  // Initialize terrain and scene (runs once)
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe5e7eb);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    camera.position.set(0, 20, 120);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    // Store refs for later use
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // Load heightmap and create terrain
    const img = new Image();
    img.src = imagePath;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // Store heightmap data for route height sampling
      heightmapDataRef.current = data;
      imageDimensionsRef.current = { width: img.width, height: img.height };

      const aspect = img.width / img.height;
      const terrainWidth = 200;
      const terrainHeight = terrainWidth / aspect;

      const geometry = new THREE.PlaneGeometry(
        terrainWidth,
        terrainHeight,
        img.width - 1,
        img.height - 1
      );

      geometry.rotateX(-Math.PI / 2);

      const vertices = geometry.attributes.position;

      for (let z = 0; z < img.height; z++) {
        for (let x = 0; x < img.width; x++) {
          const pixelIndex = (z * img.width + x) * 4;
          const brightness = data[pixelIndex];
          const height = brightness * 0.15;

          const vertexIndex = z * img.width + x;
          vertices.setY(vertexIndex, height);
        }
      }

      vertices.needsUpdate = true;
      geometry.computeVertexNormals();

      const textureLoader = new THREE.TextureLoader();
      const terrainTexture = textureLoader.load(texturePath);
      terrainTextureRef.current = terrainTexture;

      const material = new THREE.MeshStandardMaterial({
        map: terrainTexture,
      });

      const terrain = new THREE.Mesh(geometry, material);
      scene.add(terrain);

      // Load the initial route if available
      if (selectedRouteSlug) {
        loadRouteData(selectedRouteSlug, terrainWidth, terrainHeight);
      } else {
        setIsLoading(false);
      }

      animate();
    };

    img.onerror = () => {
      console.warn("[MountainViewer] Failed to load heightmap");
      setIsLoading(false);
    };

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [imagePath, texturePath]); // Only depends on heightmap and texture paths

  // Load route data and render it
  async function loadRouteData(routeSlug, terrainWidth, terrainHeight) {
    if (!routeSlug || !mountainId) return;

    setIsLoadingRoute(true);

    try {
      const { data: routeData, error } = await supabase
        .from("hiking_routes_geojson")
        .select("*")
        .eq("mountain_id", mountainId)
        .eq("slug", routeSlug)
        .single();

      if (error || !routeData) {
        console.warn("[MountainViewer] Could not load route:", error);
        setIsLoadingRoute(false);
        return;
      }

      const geometry = routeData.geometry;

      if (!geometry || geometry.type !== "LineString") {
        console.warn("[MountainViewer] Invalid geometry type");
        setIsLoadingRoute(false);
        return;
      }

      // Remove previous route line
      if (routeLineRef.current && sceneRef.current) {
        sceneRef.current.remove(routeLineRef.current);
        routeLineRef.current = null;
      }

      // Generate new route line
      const points = [];
      const heightmapData = heightmapDataRef.current;
      const imageDimensions = imageDimensionsRef.current;

      geometry.coordinates.forEach((coord) => {
        const lon = coord[0];
        const lat = coord[1];

        const { x, z } = latLonToScene(
          lat,
          lon,
          bbox,
          terrainWidth,
          terrainHeight
        );

        // Sample height from heightmap
        const px = Math.floor(
          ((lon - bbox.west) / (bbox.east - bbox.west)) * imageDimensions.width
        );

        const pz = Math.floor(
          ((bbox.north - lat) / (bbox.north - bbox.south)) * imageDimensions.height
        );

        const pixelIndex = (pz * imageDimensions.width + px) * 4;
        const brightness = heightmapData[pixelIndex];
        const y = brightness * 0.15;

        points.push(new THREE.Vector3(x, y + 0.15, z));
      });

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      sceneRef.current.add(line);
      routeLineRef.current = line;

      setIsLoadingRoute(false);
      if (isLoading) {
        setIsLoading(false);
      }
    } catch (err) {
      console.warn("[MountainViewer] Error loading route:", err);
      setIsLoadingRoute(false);
    }
  }

  // Handle route change
  useEffect(() => {
    if (!sceneRef.current) return; // Scene not yet initialized

    if (selectedRouteSlug && mountainId) {
      const terrainWidth = 200;
      const aspect = imageDimensionsRef.current
        ? imageDimensionsRef.current.width / imageDimensionsRef.current.height
        : 1;
      const terrainHeight = terrainWidth / aspect;

      loadRouteData(selectedRouteSlug, terrainWidth, terrainHeight);
    }
  }, [selectedRouteSlug]);

  // Load waypoints when selected route changes
  useEffect(() => {
    // Find the selected route object to get its ID
    const selectedRoute = allRoutes.find((route) => route.slug === selectedRouteSlug);

    if (!selectedRoute || !selectedRoute.id) {
      setWaypoints([]);
      setWaypointsError(null);
      return;
    }

    const loadWaypoints = async () => {
      setIsLoadingWaypoints(true);
      setWaypointsError(null);

      try {
        const data = await getWaypointsByRoute(selectedRoute.id);
        setWaypoints(data);
      } catch (err) {
        console.error("[MountainViewer] Error loading waypoints:", err);
        setWaypointsError("Gagal memuat waypoint. Silakan coba lagi.");
        setWaypoints([]);
      } finally {
        setIsLoadingWaypoints(false);
      }
    };

    loadWaypoints();
  }, [selectedRouteSlug, allRoutes]);

  const handleRouteChange = (e) => {
    setSelectedRouteSlug(e.target.value);
  };

  const hasRoutes = allRoutes && allRoutes.length > 0;

  return (
    <div className="w-full">
      {/* Route Selector */}
      {hasRoutes ? (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <label htmlFor="route-select" className="font-medium text-gray-700 dark:text-gray-300">
            Jalur:
          </label>
          <select
            id="route-select"
            value={selectedRouteSlug || ""}
            onChange={handleRouteChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            {allRoutes.map((route) => (
              <option key={route.slug} value={route.slug}>
                {route.name}
              </option>
            ))}
          </select>
          {isLoadingRoute && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              Memuat jalur…
            </span>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-4 text-amber-800 dark:text-amber-200">
          Belum ada jalur pendakian tersedia.
        </div>
      )}

      {/* 3D Viewer Container */}
      <div className="relative" style={{ height: "calc(100vh - 200px)" }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-200 dark:bg-gray-800 animate-pulse rounded">
            <div className="w-16 h-16 rounded-full border-4 border-teal-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Memuat terrain 3D…
            </p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />

          {/* Waypoints Debug Panel */}
          <div className="absolute bottom-4 left-4 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-h-64 w-64 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Waypoint
            </h3>

            {isLoadingWaypoints && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Memuat waypoint…
              </p>
            )}

            {waypointsError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {waypointsError}
                </p>
              </div>
            )}

            {!isLoadingWaypoints && waypoints.length === 0 && !waypointsError && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tidak ada waypoint tersedia.
              </p>
            )}

            {!isLoadingWaypoints && waypoints.length > 0 && (
              <ul className="space-y-2">
                {waypoints.map((waypoint) => (
                  <li
                    key={waypoint.id}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100 border-l-4 border-teal-500"
                  >
                    <div className="font-medium">{waypoint.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {waypoint.type} · {waypoint.sort_order}
                    </div>
                    {waypoint.elevation !== null && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        {waypoint.elevation.toLocaleString("id-ID")} mdpl
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
      </div>
    </div>
  );
}
