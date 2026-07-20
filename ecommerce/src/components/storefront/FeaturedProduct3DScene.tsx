"use client";

import { Suspense, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  Float,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { ProductModel } from "@/components/storefront/ProductModel";

const MODEL_PATH = "/models/featured-product.glb";

export default function FeaturedProduct3DScene({
  active,
  reducedMotion,
  onReady,
  onContextLost,
}: {
  active: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onContextLost: () => void;
}) {
  const created = useCallback(
    ({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
      gl.domElement.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          onContextLost();
        },
        { once: true },
      );
    },
    [onContextLost],
  );

  return (
    <Canvas
      className="client-featured-3d-canvas"
      aria-label="Interactive three-dimensional featured Product"
      camera={{ position: [3.8, 2.2, 5.2], fov: 32, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      onCreated={created}
      shadows
    >
      <hemisphereLight args={["#f8fafc", "#111827", 1.15]} />
      <spotLight
        position={[4, 6, 5]}
        angle={0.42}
        penumbra={0.85}
        intensity={65}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-4, 2.5, -3]}
        color="#d8a24c"
        intensity={3.2}
      />

      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.25}>
          <Float
            speed={reducedMotion ? 0 : 0.65}
            floatIntensity={reducedMotion ? 0 : 0.16}
            rotationIntensity={0}
          >
            <ProductModel modelPath={MODEL_PATH} onReady={onReady} />
          </Float>
        </Bounds>
        <ContactShadows
          position={[0, -1.42, 0]}
          opacity={0.55}
          scale={7}
          blur={2.8}
          far={4.5}
          resolution={512}
          color="#020617"
          frames={1}
        />
      </Suspense>

      <mesh position={[0, -1.62, 0]} receiveShadow>
        <cylinderGeometry args={[2.1, 2.35, 0.34, 64]} />
        <meshStandardMaterial
          color="#111827"
          roughness={0.68}
          metalness={0.2}
        />
      </mesh>

      <OrbitControls
        makeDefault
        autoRotate={active && !reducedMotion}
        autoRotateSpeed={0.45}
        enableDamping
        dampingFactor={0.07}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.32}
        maxPolarAngle={Math.PI * 0.68}
        minAzimuthAngle={-Math.PI * 0.72}
        maxAzimuthAngle={Math.PI * 0.72}
      />
    </Canvas>
  );
}

useGLTF.preload(MODEL_PATH);
