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
import type { Waypoint } from "../api/waypoints";

type BBox = {
    north: number;
    south: number;
    east: number;
    west: number;
};

type MountainViewerProps = {
    slug: string;
    bbox: BBox;
    selectedTrailId?: number | null;
    selectedWaypointId?: number | null;
    onWaypointsLoaded?: (waypoints: Waypoint[]) => void;
    onWaypointsLoadingChange?: (loading: boolean) => void;
    onWaypointMarkerClick?: (waypointId: number) => void;
};

export default function MountainViewer({
    slug,
    bbox,
    selectedTrailId,
    selectedWaypointId,
    onWaypointsLoaded,
    onWaypointsLoadingChange,
    onWaypointMarkerClick,
}: MountainViewerProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [isLoadingWaypoints, setIsLoadingWaypoints] = useState(false);
    const [waypointsError, setWaypointsError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Keep prop refs stable for use inside Three.js closures
    const onWaypointMarkerClickRef = useRef(onWaypointMarkerClick);
    useEffect(() => {
        onWaypointMarkerClickRef.current = onWaypointMarkerClick;
    }, [onWaypointMarkerClick]);

    const selectedTrailIdRef = useRef(selectedTrailId);
    useEffect(() => {
        selectedTrailIdRef.current = selectedTrailId;
    }, [selectedTrailId]);

    // Refs to preserve scene objects across re-renders


    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const trailLineRef = useRef<THREE.Line | null>(null);

    const terrainTextureRef = useRef<THREE.Texture | null>(null);
    const heightmapDataRef = useRef<Uint8ClampedArray | null>(null);
    const imageDimensionsRef = useRef<{ width: number; height: number } | null>(null);
    const waypointGroupRef = useRef<THREE.Group | null>(null);
    const waypointContextRef = useRef<any | null>(null);

    const imagePath = `/heightmaps/${slug}_heightmap.png`;
    const texturePath = `/textures/${slug}_satellite.jpg`;

    function latLonToScene(
        lat: number,
        lon: number,
        bbox: BBox,
        terrainWidth: number,
        terrainHeight: number
    ) {
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
        scene.background = new THREE.Color(0x020617);

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
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
            if (!ctx) {
                console.warn("Could not create 2D canvas context");
                return;
            }

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
            if (selectedTrailIdRef.current) {
                loadTrailData(selectedTrailIdRef.current, terrainWidth, terrainHeight);
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
        const handleMarkerClick = (event: MouseEvent) => {
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
    async function loadTrailData(
        trailId: number,
        terrainWidth: number,
        terrainHeight: number
    ): Promise<void> {
        if (!trailId) return;

        try {
            const { data: trailData, error } = await supabase
                .from("trails_geojson")
                .select("*")
                .eq("id", trailId)
                .single();

            if (error || !trailData) {
                console.warn("[MountainViewer] Could not load trail:", error);
                return;
            }

            const geometry = trailData.geometry;

            if (!geometry || geometry.type !== "LineString") {
                console.warn("[MountainViewer] Invalid geometry type");
                return;
            }

            // Remove previous trail line
            if (trailLineRef.current && sceneRef.current) {
                sceneRef.current.remove(trailLineRef.current);
                trailLineRef.current = null;
            }

            // Generate new trail line
            const points: THREE.Vector3[] = [];
            const heightmapData = heightmapDataRef.current;
            const imageDimensions = imageDimensionsRef.current;
            if (!imageDimensions || !heightmapData) {
                return;
            }

            geometry.coordinates.forEach((coord: number[]) => {
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
            if (sceneRef.current) {
                sceneRef.current.add(line);
            }
            trailLineRef.current = line;

            if (isLoading) {
                setIsLoading(false);
            }
        } catch (err) {
            console.warn("[MountainViewer] Error loading trail:", err);
        }
    }

    // Handle trail change
    useEffect(() => {
        if (!sceneRef.current) return; // Scene not yet initialized

        if (selectedTrailId) {
            const terrainWidth = 200;
            const aspect = imageDimensionsRef.current
                ? imageDimensionsRef.current.width / imageDimensionsRef.current.height
                : 1;
            const terrainHeight = terrainWidth / aspect;

            loadTrailData(selectedTrailId, terrainWidth, terrainHeight);
        }
    }, [selectedTrailId]);

    // Load waypoints when selected trail changes
    useEffect(() => {
        if (!selectedTrailId) {
            setWaypoints([]);
            setWaypointsError(null);
            return;
        }

        const loadWaypoints = async () => {
            setIsLoadingWaypoints(true);
            onWaypointsLoadingChange?.(true);
            setWaypointsError(null);

            try {
                const data = await getWaypointsByTrail(Number(selectedTrailId));
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
    }, [selectedTrailId]);

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

    return (
        <div className="relative w-full h-full">
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
    );
}
