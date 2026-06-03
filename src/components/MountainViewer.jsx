import { useEffect, useRef, useState } from "react";

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { supabase } from "../lib/supabase";
import { getWaypointsByTrail } from "../api/waypoints";
import {
  createWaypointGroup,
  renderWaypoints,
  clearWaypoints,
  disposeWaypointContext,
} from "../lib/rendering/waypointRenderer";

export default function MountainViewer({
  slug,
  bbox,
  mountainId,
  trails,
  selectedWaypointId,
  onWaypointsLoaded,
  onWaypointsLoadingChange,
  onWaypointMarkerClick,
}) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTrail, setIsLoadingTrail] = useState(false);
  const [allTrails, setAllTrails] = useState(trails || []);
  const [selectedTrailSlug, setSelectedTrailSlug] = useState(
    trails && trails.length > 0 ? trails[0].slug : null
  );

  // Waypoints state
  const [waypoints, setWaypoints] = useState([]);
  const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(false);
  const [waypointsError, setWaypointsError] = useState(null);

  // Keep callback refs stable so the Three.js click handler always calls the latest version
  const onWaypointMarkerClickRef = useRef(onWaypointMarkerClick);
  useEffect(() => {
    onWaypointMarkerClickRef.current = onWaypointMarkerClick;
  }, [onWaypointMarkerClick]);

  // Refs to preserve scene objects across re-renders
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const terrainTextureRef = useRef(null);
  const heightmapDataRef = useRef(null);
  const imageDimensionsRef = useRef(null);
  const trailLineRef = useRef(null);
  const waypointGroupRef = useRef(null);
  const waypointContextRef = useRef(null);

  const imagePath = `/heightmaps/${slug}_heightmap.png`;
  const texturePath = `/textures/${slug}_satellite.jpg`;

  // Fetch trails on client side if not provided from server
  useEffect(() => {
    if (allTrails.length > 0) return; // Already have trails from server
    
    if (!mountainId) {
      console.warn("[MountainViewer] No mountainId provided, cannot fetch trails");
      return;
    }

    const fetchTrails = async () => {
      try {
        const { data, error } = await supabase
          .from("trails_geojson")
          .select("id, mountain_id, name, slug")
          .eq("mountain_id", mountainId)
          .order("name");

        if (error) {
          console.error("[MountainViewer] Trail fetch error:", error.message);
        } else if (data) {
          console.log(`[MountainViewer] Fetched ${data.length} trails for mountain ${mountainId}`);
          setAllTrails(data);
          if (data.length > 0 && !selectedTrailSlug) {
            setSelectedTrailSlug(data[0].slug);
          }
        }
      } catch (err) {
        console.error("[MountainViewer] Trail fetch exception:", err);
      }
    };

    fetchTrails();
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

    // waypoint group for markers
    const waypointContext = createWaypointGroup();
    scene.add(waypointContext.group);

    // Store refs for later use
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    waypointGroupRef.current = waypointContext.group;
    waypointContextRef.current = waypointContext;

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

      // Store heightmap data for trail height sampling
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

      // Load the initial trail if available
      if (selectedTrailSlug) {
        loadTrailData(selectedTrailSlug, terrainWidth, terrainHeight);
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

    // Raycasting: detect clicks on waypoint markers
    const raycaster = new THREE.Raycaster();
    const handleMarkerClick = (event) => {
      if (!waypointContextRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const meshes = [...waypointContextRef.current.markers.values()].map(
        (m) => m.mesh
      );
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        for (const [id, data] of waypointContextRef.current.markers.entries()) {
          if (data.mesh === clickedMesh) {
            onWaypointMarkerClickRef.current?.(id);
            break;
          }
        }
      }
    };
    renderer.domElement.addEventListener("click", handleMarkerClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleMarkerClick);
      if (waypointContextRef.current) {
        disposeWaypointContext(waypointContextRef.current);
      }
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [imagePath, texturePath]); // Only depends on heightmap and texture paths

  // Focus camera on selected waypoint when selectedWaypointId changes
  useEffect(() => {
    if (selectedWaypointId == null || !waypointContextRef.current || !controlsRef.current)
      return;
    const marker = waypointContextRef.current.markers.get(selectedWaypointId);
    if (!marker) return;
    controlsRef.current.target.copy(marker.mesh.position);
    controlsRef.current.update();
  }, [selectedWaypointId]);

  // Load trail data and render it
  async function loadTrailData(trailSlug, terrainWidth, terrainHeight) {
    if (!trailSlug || !mountainId) return;

    setIsLoadingTrail(true);

    try {
      const { data: trailData, error } = await supabase
        .from("trails_geojson")
        .select("*")
        .eq("mountain_id", mountainId)
        .eq("slug", trailSlug)
        .single();

      if (error || !trailData) {
        console.warn("[MountainViewer] Could not load trail:", error);
        setIsLoadingTrail(false);
        return;
      }

      const geometry = trailData.geometry;

      if (!geometry || geometry.type !== "LineString") {
        console.warn("[MountainViewer] Invalid geometry type");
        setIsLoadingTrail(false);
        return;
      }

      // Remove previous trail line
      if (trailLineRef.current && sceneRef.current) {
        sceneRef.current.remove(trailLineRef.current);
        trailLineRef.current = null;
      }

      // Generate new trail line
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
      trailLineRef.current = line;

      setIsLoadingTrail(false);
      if (isLoading) {
        setIsLoading(false);
      }
    } catch (err) {
      console.warn("[MountainViewer] Error loading trail:", err);
      setIsLoadingTrail(false);
    }
  }

  // Handle trail change
  useEffect(() => {
    if (!sceneRef.current) return; // Scene not yet initialized

    if (selectedTrailSlug && mountainId) {
      const terrainWidth = 200;
      const aspect = imageDimensionsRef.current
        ? imageDimensionsRef.current.width / imageDimensionsRef.current.height
        : 1;
      const terrainHeight = terrainWidth / aspect;

      loadTrailData(selectedTrailSlug, terrainWidth, terrainHeight);
    }
  }, [selectedTrailSlug]);

  // Load waypoints when selected trail changes
  useEffect(() => {
    // Find the selected trail object to get its ID
    const selectedTrail = allTrails.find((trail) => trail.slug === selectedTrailSlug);

    if (!selectedTrail || !selectedTrail.id) {
      setWaypoints([]);
      setWaypointsError(null);
      return;
    }

    const loadWaypoints = async () => {
      setIsLoadingWaypoints(true);
      onWaypointsLoadingChange?.(true);
      setWaypointsError(null);

      try {
        const data = await getWaypointsByTrail(selectedTrail.id);
        setWaypoints(data);
        onWaypointsLoaded?.(data);
      } catch (err) {
        console.error("[MountainViewer] Error loading waypoints:", err);
        setWaypointsError("Gagal memuat waypoint. Silakan coba lagi.");
        setWaypoints([]);
        onWaypointsLoaded?.([]);
      } finally {
        setIsLoadingWaypoints(false);
        onWaypointsLoadingChange?.(false);
      }
    };

    loadWaypoints();
  }, [selectedTrailSlug, allTrails]);

  // Render waypoint markers when waypoints data changes
  useEffect(() => {
    // Ensure scene and waypoint context are initialized
    if (!sceneRef.current || !waypointContextRef.current) return;

    // Ensure we have heightmap data
    if (!heightmapDataRef.current || !imageDimensionsRef.current) return;

    // If no waypoints, just clear existing markers
    if (waypoints.length === 0) {
      clearWaypoints(waypointContextRef.current);
      return;
    }

    // Calculate terrain dimensions
    const terrainWidth = 200;
    const aspect = imageDimensionsRef.current.width / imageDimensionsRef.current.height;
    const terrainHeight = terrainWidth / aspect;

    // Render waypoints
    renderWaypoints(
      waypoints,
      waypointContextRef.current,
      bbox,
      terrainWidth,
      terrainHeight,
      heightmapDataRef.current,
      imageDimensionsRef.current
    );
  }, [waypoints, bbox]);

  const handleTrailChange = (e) => {
    setSelectedTrailSlug(e.target.value);
  };

  const hasTrails = allTrails && allTrails.length > 0;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Trail Selector */}
      {hasTrails ? (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 shrink-0">
          <label htmlFor="trail-select" className="font-medium text-gray-700 dark:text-gray-300">
            Jalur:
          </label>
          <select
            id="trail-select"
            value={selectedTrailSlug || ""}
            onChange={handleTrailChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            {allTrails.map((trail) => (
              <option key={trail.slug} value={trail.slug}>
                {trail.name}
              </option>
            ))}
          </select>
          {isLoadingTrail && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              Memuat jalur…
            </span>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-4 text-amber-800 dark:text-amber-200 shrink-0">
          Belum ada jalur pendakian tersedia.
        </div>
      )}

      {/* 3D Viewer Container */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-200 dark:bg-gray-800 animate-pulse rounded">
            <div className="w-16 h-16 rounded-full border-4 border-teal-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Memuat terrain 3D…
            </p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
