"use client";

import {
  Component,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { FeaturedProduct3DFallback } from "@/components/storefront/FeaturedProduct3DFallback";

const DynamicScene = dynamic(
  () => import("@/components/storefront/FeaturedProduct3DScene"),
  { ssr: false },
);

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    console.error("Featured Product 3D scene unavailable.");
    this.props.onError();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function FeaturedProduct3D({
  image,
  productName,
  modelAvailable,
}: {
  image?: string;
  productName: string;
  modelAvailable: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setWebGLAvailable(supportsWebGL());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);

    const updateVisibility = () =>
      setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px", threshold: 0.01 },
    );
    if (rootRef.current) observer.observe(rootRef.current);

    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      observer.disconnect();
    };
  }, []);

  const markReady = useCallback(() => setReady(true), []);
  const markFailed = useCallback(() => setFailed(true), []);
  const fallback = (
    <FeaturedProduct3DFallback image={image} productName={productName} />
  );
  const canRender = modelAvailable && webGLAvailable === true && !failed;

  return (
    <div
      ref={rootRef}
      className={`client-featured-3d ${ready ? "is-ready" : ""}`}
      aria-label={`Interactive 3D view of ${productName}. Drag horizontally to rotate.`}
    >
      {!canRender || !ready ? (
        <FeaturedProduct3DFallback
          image={image}
          productName={productName}
          loading={canRender && !ready}
        />
      ) : null}
      {canRender ? (
        <SceneErrorBoundary fallback={fallback} onError={markFailed}>
          <DynamicScene
            active={visible && tabVisible}
            reducedMotion={reducedMotion}
            onReady={markReady}
            onContextLost={markFailed}
          />
        </SceneErrorBoundary>
      ) : null}
    </div>
  );
}
