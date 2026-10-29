# Rustic Maps SDK

A native map SDK in Rust exposing map platform APIs, turn-by-turn navigation, and
offline maps — bound to **Android (Kotlin)**, **iOS (Swift)** and **React Native** via
UniFFI (UDL-first), with **WebAssembly as a first-class target** for a fast browser
test loop.

## Design highlights

- **One contract, four platforms.** The FFI surface is a single frozen UniFFI UDL
  file; Kotlin, Swift and React Native Turbo Module bindings are generated from it,
  and the WebAssembly TypeScript mirror is regression-checked against it.
- **Vendor-neutral core.** Nine provider contracts (routing, geocoding, search,
  traffic, elevation, raster tiles, offline routing) with a full map-platform
  provider implementation: rate-limited, retry-aware, wiremock-tested against
  recorded fixtures.
- **Own rendering core.** Web-mercator projection, an anchored map camera with
  animations, exact camera-frustum tile listing, a frame-driven tile scheduler
  (most-detailed-first, fetch budgets, parent fallback) and a byte-budget LRU
  texture pool feeding a headless `wgpu` raster renderer.
- **Turn-by-turn navigation.** A Ferrostar-inspired trip-state machine with
  Ferrostar-modeled step-advance conditions, spoken-instruction triggers, and
  deviation detection.

## Where to go next

- **[The UniFFI contract](udl-contract.md)** — the frozen FFI surface, published
  verbatim: the single source of truth every binding layer is generated from.
- **[API reference](api-reference.md)** — rustdoc for the workspace crates.
- **[The browser e2e loop](browser-loop.md)** — how the WebAssembly harness and the
  Playwright suite work.
- **[Contributing conventions](coding-conventions.md)** — the working conventions
  the codebase is held to.
- **[Third-party notices](third-party-notices.md)** — every dependency, its license,
  and the map-data attribution.

## Status

The SDK is in active development. The rendered site is rebuilt from the
source repository's build pipeline; each section is exposed here only once
the pipeline that produces it is green (each page carries the build's
provenance stamp).

## License

The SDK is dual-licensed under **MIT OR Apache-2.0**.

Map imagery © MapQuest; map data © OpenStreetMap contributors (ODbL). See
[third-party notices](third-party-notices.md) for the full attribution and
license table.