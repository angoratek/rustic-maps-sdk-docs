# Changelog

The SDK is in active development; everything below is unreleased. The
FFI contract surface it describes changes **addition-only** — existing
members keep their signature and meaning. This page is a curated,
public-facing summary — the complete development log lives in the source
repository.

## Imagery and caching

- All seven MapQuest provider APIs are implemented and fixture-tested
  (route with strategies and multiple legs, route matrix, forward/reverse
  geocoding, search prediction, traffic incidents, traffic-flow congestion
  polylines, raster tiles in standard and retina resolutions).
- A SQLite-backed response cache under an absolute byte budget and/or a
  share of free disk space: per-category time-to-live, LRU eviction,
  cache-then-network around every provider contract. Tile imagery caches
  heavily by default — **30 calendar days**, the common maximum under
  imagery-provider terms — and the provider contract declares its own
  caching terms so an integrator tunes it knowingly per provider
  (`setRasterTileCacheTimeToLive`, read back through
  `rasterTileCacheTerms`; values above a provider's declared ceiling stay
  compliance-clamped).

## Rendering

- An own minimal `wgpu` raster renderer: web-mercator projection with
  exact frustum tile listing (Sutherland–Hodgman over the six frustum
  planes, antimeridian world-copy handling), anchored camera with
  fit-bounds/insets-aware framing and a `flyTo`-style hyperbolic arc, a
  byte-bounded GPU texture cache, a tile scheduler with per-frame dedup,
  parent fallback and a fetch budget, and route/polygon/marker/traffic
  overlay layers plus a renderer-owned location indicator (tracking dot
  with accuracy ring, or guided course arrow).
- The same renderer scene draws headless (deterministic golden-image
  tests), into live Android/iOS surfaces, and in the browser (WebGPU) —
  one WGSL/vertex pattern byte-identical across the wasm and native
  paths.

## Navigation

- A pure reducer over `Option<NavigationSession>` with Ferrostar-pattern
  step-advance conditions (manual, eager distance-to-end, delayed
  current-step; Or/And combinators; fresh-instance reset contract),
  deviation detection with accuracy-aware allowances, and provider-verbatim
  instruction composition (banner + speech text; nothing rewritten).
- Deviation is graded: fully-off-route freezes and asks for reroute;
  off-step-but-on-route keeps counting down and reconciles to the
  projected step. Speed runs advance through many steps per fix, bounded
  and stack-safety-tested. Fully-off-route instruction text honestly
  suppresses the countdown rather than projecting from a stale anchor.
- The SDK owns speech *triggering* (a speech-instruction topic over
  documented distance bands); platforms voice it and keep their own
  pacing/focus policies.

## Bindings and platforms

- UniFFI with a frozen, addition-only UDL contract drives generated
  Kotlin/Swift bindings and the React Native bindings; the wasm surface is
  a hand-reviewed TypeScript mirror regression-checked against the same
  UDL. Callback providers (geocoding, tiles) and a navigation controller
  with per-topic subscriptions cross the foreign callbacks seam; exported
  async methods run through a crate-owned runtime handback so foreign
  event loops never meet an unserved reactor.
- Reference applications on Android (Compose), iOS (SwiftUI) and the web
  playground implement one shared design language: bottom-sheet home,
  search → route → simulated turn-by-turn with speech, a five-control
  cluster (zoom, scale bar, my-location, 2D/3D, compass), follow camera,
  offline tile-cache card, and a readiness-chip diagnostics readout. The
  web surface reaches reference-app parity with the native demos.

## Diagnostics and ops

- A `tracing`-facade diagnostics layer: bounded, per-subsystem ring sinks
  with coordinate scrubbing at the sink and a severity gate that never
  raises once finer events are requested; subscribe/flush seams on the
  native and wasm surfaces back the readouts and a later log-sharing
  story.
- CI runs fmt, clippy with warnings-as-errors, the workspace test suite,
  a wasm-targeted clippy closure, a browser e2e suite, and the
  documentation-site pipeline (build → scrub → stage) on every push.

## Attribution

Map imagery © MapQuest; map data © OpenStreetMap contributors (ODbL).
Third-party dependency notices are regenerated into [their
chapter](third-party-notices.md).