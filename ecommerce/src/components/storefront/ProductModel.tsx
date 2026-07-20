"use client";

import { useEffect } from "react";
import { Clone, useGLTF } from "@react-three/drei";

export function ProductModel({
  modelPath,
  onReady,
}: {
  modelPath: string;
  onReady: () => void;
}) {
  const { scene } = useGLTF(modelPath);

  useEffect(() => onReady(), [onReady]);

  return <Clone object={scene} castShadow receiveShadow />;
}
