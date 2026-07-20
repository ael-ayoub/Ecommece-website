# Client Homepage Featured Product 3D Integration

## Status

Integration-ready, with a blocking asset dependency. The repository contains no `.glb` or `.gltf` Product model, so a real Product model could not be rendered or interaction-tested. The implementation expects:

- Repository path: `ecommerce/public/models/featured-product.glb`
- Public URL: `/models/featured-product.glb`
- Current model size: unavailable (file absent)
- Model source and license: unavailable (file absent)

The homepage remains usable and shows the existing Product image or a neutral Product placeholder when that model is unavailable. No fake Product geometry was introduced.

## Design skill used

The installed `ui-ux-pro-max` skill was used to guide the responsive, accessible, performance-conscious integration. It reinforced preserving the approved visual hierarchy, constraining motion, honoring reduced-motion preferences, keeping touch scrolling available, and providing a resilient non-WebGL fallback.

## Implementation summary

- Replaced only the featured Product visual integration point in the approved homepage hero.
- Kept Product copy, pricing, links, page structure, and the rest of the storefront design unchanged.
- Added a client-only, dynamically loaded React Three Fiber scene with SSR disabled.
- Added a server-side model-presence check so an absent asset does not generate repeated browser 404 requests.
- Added safe GLTF loading through `useGLTF`, cached-scene cloning through Drei `Clone`, and an error boundary.
- Added studio lighting, a restrained pedestal, contact shadow, subtle floating/automatic rotation, and pointer-drag rotation.
- Disabled zoom and pan; constrained polar and azimuth rotation.
- Limited DPR to `1–1.5`.
- Paused the render loop when the scene is outside the viewport or the browser tab is hidden.
- Disabled ambient model motion when the user requests reduced motion.
- Preserved vertical page gestures on touch devices with `touch-action: pan-y`.
- Added graceful fallbacks for missing model, WebGL unavailability, loading failure, and WebGL context loss.
- Fallback order is the featured Product image via the existing `ProductImage` component, then its established neutral placeholder behavior.

## Component architecture

- `FeaturedProduct3D`: client lifecycle, capability checks, viewport/visibility/reduced-motion state, dynamic scene loading, and error recovery.
- `FeaturedProduct3DScene`: Canvas, camera, lighting, controls, contact shadow, pedestal, and render-loop policy.
- `ProductModel`: `useGLTF` loading and safe cloned scene rendering.
- `FeaturedProduct3DFallback`: accessible Product-image/loading/neutral fallback.
- `HomeHero`: unchanged content architecture with only its Product media surface delegated to the 3D integration.
- Client homepage server component: checks the expected public model path and passes model availability to the hero.

The 3D integration is isolated to the client homepage. Admin pages, backend services, APIs, Prisma schema, database behavior, checkout, cart, Product rules, pricing, stock, and Variant behavior were not changed.

## Dependency impact

Only the requested rendering dependencies were added:

- `three` `^0.170.0`
- `@react-three/fiber` `^8.18.0`
- `@react-three/drei` `^9.122.0`

`npm install` added 65 transitive packages. npm reported five existing/current dependency audit findings (one moderate and four high). No automated audit fix was applied. npm also reported a transitive `three-mesh-bvh@0.7.8` deprecation/compatibility warning.

The scene is dynamically split and is not part of the initial homepage rendering path. The isolated production build reported the homepage at 7.08 kB route size and 103 kB First Load JS. The preceding homepage report recorded 587 B and 101 kB respectively, indicating approximately +6.5 kB route output and +2 kB First Load JS; the heavier Three.js scene remains deferred.

## Files changed

- `ecommerce/package.json`
- `ecommerce/package-lock.json`
- `ecommerce/src/app/(client)/page.tsx`
- `ecommerce/src/app/globals.css`
- `ecommerce/src/components/storefront/HomeHero.tsx`
- `ecommerce/src/components/storefront/FeaturedProduct3D.tsx`
- `ecommerce/src/components/storefront/FeaturedProduct3DFallback.tsx`
- `ecommerce/src/components/storefront/FeaturedProduct3DScene.tsx`
- `ecommerce/src/components/storefront/ProductModel.tsx`
- Screenshot artifacts listed below
- This report

## Verification

| Command | Result | Notes |
|---|---|---|
| `npx prettier --check <changed TypeScript/CSS files>` | PASS | Changed implementation files conform to formatting. |
| `npm run lint` | PASS | No lint errors or warnings. |
| `npm run typecheck` | PASS | TypeScript completed without errors. |
| `npm run test:unit` | PASS | 41/41 tests passed. |
| `npm run test:integration` | PASS with skips | Five integration tests were skipped by the repository's safe opt-in test-database guard. |
| isolated `npm run build` in `/tmp/ecommerce-3d-build-20260720` | PASS | Production build completed; existing non-fatal `jose` Edge-runtime warnings and build-time API request logs remained. |
| `docker compose config --quiet` | PASS | Compose configuration is valid. |
| `docker compose ps -a` | PASS | Application and database containers were healthy after startup. |
| `curl` for `/`, `/products`, `/admin` | PASS | Returned 200, 200, and expected unauthenticated 307 redirect. |
| `git diff --check` | PASS | No whitespace errors. |

The real-model drag, constrained rotation, auto-rotation, reduced-motion animation, model framing, context-loss recovery, and final GPU appearance cannot be truthfully validated until the required model is present. The corresponding code paths are implemented.

## Screenshots

- `docs/screenshots/client-homepage-3d-20260720/home-desktop-static-fallback-1440x1100.png`
- `docs/screenshots/client-homepage-3d-20260720/home-mobile-static-fallback-390x844.png`
- `docs/screenshots/client-homepage-3d-20260720/static-fallback-focused.png`

These document the current no-model fallback state, not a rendered 3D model. The development database available during capture contained no featured Product, so the neutral no-Product presentation is what could be captured.

## Blocker and completion requirement

Supply an optimized, properly licensed GLB at exactly:

`ecommerce/public/models/featured-product.glb`

After that asset is added, rerun the production build and manually validate desktop/mobile framing, pointer drag, keyboard focus behavior, constrained controls, reduced motion, offscreen/tab pausing, WebGL context recovery, and visual performance on a representative low-power mobile device. Model polygon count, textures, compressed size, provenance, and license must also be recorded at that time.
