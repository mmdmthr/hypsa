import { useEffect, useRef, useState } from "react";

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { supabase } from "../lib/supabase";

export default function MountainViewer({ slug, bbox }) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const imagePath = `/heightmaps/${slug}_heightmap.png`;
  const texturePath = `/textures/${slug}_satellite.jpg`;
  const params =
    new URLSearchParams(
      window.location.search
    );

  const route =
    params.get("route") ||
    "mangli";

  function latLonToScene(
    lat,
    lon,
    bbox,
    terrainWidth,
    terrainHeight,
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

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0xe5e7eb);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
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

    // heightmap
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

      const aspect = img.width / img.height;

      const terrainWidth = 200;

      const terrainHeight = terrainWidth / aspect;

      const geometry = new THREE.PlaneGeometry(
        terrainWidth,
        terrainHeight,
        img.width - 1,
        img.height - 1,
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

      const textureLoader =
        new THREE.TextureLoader();

      const terrainTexture =
        textureLoader.load(
          texturePath
        );

      const material = new THREE.MeshStandardMaterial({
        map: terrainTexture,
      });

      const terrain = new THREE.Mesh(geometry, material);

      async function loadRoute() {
        const { data: routeData, error } =
          await supabase
            .from("hiking_routes_geojson")
            .select("*")
            .eq("slug", route)
            .single();

        if (error || !routeData) return;

        const geometry = routeData.geometry;

        if (
          !geometry ||
          geometry.type !== "LineString"
        ) {
          return;
        }

        const points = [];

        geometry.coordinates.forEach(
          (coord) => {
            const lon = coord[0];
            const lat = coord[1];

            const { x, z } =
              latLonToScene(
                lat,
                lon,
                bbox,
                terrainWidth,
                terrainHeight,
              );

            const px = Math.floor(
              ((lon - bbox.west) /
                (bbox.east - bbox.west))
              * img.width
            );

            const pz = Math.floor(
              ((bbox.north - lat) /
                (bbox.north - bbox.south))
              * img.height
            );

            const pixelIndex =
              (pz * img.width + px) * 4;

            const brightness =
              data[pixelIndex];

            const y =
              brightness * 0.15;

            points.push(
              new THREE.Vector3(
                x,
                y + 0.15,
                z,
              ),
            );
          },
        );

        const lineGeometry =
          new THREE.BufferGeometry()
            .setFromPoints(points);

        const lineMaterial =
          new THREE.LineBasicMaterial({
            color: 0xff0000,
          });

        const line = new THREE.Line(
          lineGeometry,
          lineMaterial,
        );

        scene.add(line);
      }

      scene.add(terrain);
      loadRoute();
      setIsLoading(false);

      animate();
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
  }, [imagePath, texturePath, slug, route, bbox]);

  return (
    <div className="relative w-full h-[80vh]">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-200 dark:bg-gray-800 animate-pulse rounded">
          <div className="w-16 h-16 rounded-full border-4 border-teal-400 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat terrain 3D…</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
