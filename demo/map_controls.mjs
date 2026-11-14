// Platform glue of the web playground's reference-app parity features: the
// pure values of the design language's §2.4 token table rows the reference
// apps consume, plus the shared behavior math the controls, the follow camera
// and the scale bar drive their behavior with.
//
// The follow-camera state machine, the circular course median, the smoothstep
// and exponential easing, the scale-bar ladder and the trace cursor are the
// `map-refapp-core` implementations, exported through the wasm package and
// re-exported here under the names the page has always imported. Only the
// platform-owned token rows and the route-polyline helpers (which the crate
// does not carry) live in this module. Both the page (index.html) and the
// Playwright specs import it, so the demo harness and the tests cannot drift
// apart on the values.
//
// The wasm package is loaded here because the page and the Node-side specs
// both need the crate's classes and functions. In a browser the page's own
// `main.mjs` owns the single wasm instantiation; the classes the page
// constructs before readiness (`SmoothstepTimedEase`, `ExponentialValueChase`,
// `FollowCamera` and `LocationPoseAnimator`) defer creating their Rust object
// until first use, so this module never delays the page's module evaluation.
// In Node the generated bindings are initialized synchronously from the
// package's bytes.

import {
  CourseMedianSmoother,
  ExponentialValueChase as NativeExponentialValueChase,
  FollowCamera as NativeFollowCamera,
  LocationPoseAnimator as NativeLocationPoseAnimator,
  SmoothstepTimedEase as NativeSmoothstepTimedEase,
  TraceCursor,
  bearingOffNorthDegrees,
  followZoomTowardTripEnd,
  initSync,
  scaleBarDistanceLabelText,
  selectScaleBarScale,
  signedAngularDifferenceDegrees,
  smoothstepEasedProgress,
  traceDispatchIntervalMilliseconds,
} from './pkg/rustic_maps_web_bindings.js';

if (typeof window === 'undefined') {
  const { readFileSync } = await import('node:fs');
  initSync({
    module: readFileSync(
      new URL('./pkg/rustic_maps_web_bindings_bg.wasm', import.meta.url),
    ),
  });
}

/** Full circle in degrees (the bearing wraps' modulus). */
const FULL_CIRCLE_DEGREES = 360.0;

// --- The §2.4 token rows the controls mirror (token names verbatim; the
// Android mirror's own constants spell them identically) ---

/** The zoom controls' step, one zoom level (`map-control-zoom-step`). */
export const MAP_CONTROL_ZOOM_STEP = 1.0;

/**
 * The zoom controls' held-repeat cadence in milliseconds
 * (`map-control-zoom-repeat-interval`); a plain tap steps once.
 */
export const MAP_CONTROL_ZOOM_REPEAT_INTERVAL_MILLISECONDS = 250;

/**
 * The bearing's off-north distance above which the compass control shows
 * (`compass-visibility-bearing-threshold`).
 */
export const COMPASS_VISIBILITY_BEARING_THRESHOLD_DEGREES = 1.0;

/**
 * Duration of the eased camera moves the platform pump owns — the compass's
 * re-north return and the 2D/3D pitch swing
 * (`compass-renorth-animation`, both moves' shared mill value).
 */
export const EASED_CAMERA_MOVE_DURATION_MILLISECONDS = 300;

/**
 * The longest motion one fix may start
 * (`location-animation-duration-milliseconds`): the actual duration is the
 * interval between fixes, clamped to this ceiling.
 */
export const LOCATION_ANIMATION_DURATION_MILLISECONDS = 1000;

/**
 * The shortest motion one fix starts
 * (`location-animation-minimum-milliseconds`), so a fast fix stream still
 * animates instead of teleporting.
 */
export const LOCATION_ANIMATION_MINIMUM_MILLISECONDS = 120;

/**
 * The puck never predicts motion between fixes
 * (`location-animation-dead-reckoning`): a wrong prediction would draw a
 * place the visitor never was.
 */
export const LOCATION_ANIMATION_DEAD_RECKONING = 'off';

/** The scale bar's width floor in pixels (`scale-bar-width-range` low). */
export const SCALE_BAR_WIDTH_MINIMUM_PIXELS = 50.0;
/** The scale bar's width ceiling in pixels (`scale-bar-width-range` high). */
export const SCALE_BAR_WIDTH_MAXIMUM_PIXELS = 120.0;

// --- The follow camera's §5.3 token rows ---

/** The follow camera's fixed deep zoom (`navigation-follow-zoom`). */
export const NAVIGATION_FOLLOW_ZOOM = 17.0;
/** The trip-end clamp (`navigation-follow-zoom-maximum`). */
export const NAVIGATION_FOLLOW_ZOOM_MAXIMUM = 17.5;
/** The follow camera's 3D pitch (`navigation-follow-pitch-3d`). */
export const NAVIGATION_FOLLOW_PITCH_3D_DEGREES = 45.0;

/**
 * The follow camera's bearing chase time constant in milliseconds — the
 * Android mirror's `FOLLOW_BEARING_EASE_TIME_CONSTANT_NANOS` token (150 ms).
 */
export const FOLLOW_BEARING_CHASE_TIME_CONSTANT_MILLISECONDS = 150.0;

/**
 * The chase snaps to its target under this remaining angular distance (the
 * eased value is visually identical to the target).
 */
export const FOLLOW_BEARING_SNAP_DISTANCE_DEGREES = 0.05;

// --- The follow demo's documented platform-glue constants ---

/**
 * The demo playback acceleration factor: simulated time advances this many
 * times per tick. The web demo's constant mirrors the Android demo's
 * documented factor (not navigation policy).
 */
export const FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR = 20.0;

/**
 * Fallback simulated-trace sample interval when the artifact does not carry
 * one; the artifact's `navigation_demo.simulated_trace.sample_interval_seconds`
 * is the live source. The fix dispatch interval is this interval divided by
 * the playback factor (5 s / 20 = 250 ms).
 */
export const FOLLOW_DEMO_SAMPLE_INTERVAL_SECONDS = 5.0;

/**
 * The horizontal-accuracy report each demo fix carries, mirroring the
 * recorded trace generator's `horizontal_accuracy_meters` (below the
 * renderer's accuracy-ring draw threshold, exactly like the native demo's
 * fixes — the disc renders, the ring does not).
 */
export const FOLLOW_DEMO_FIX_HORIZONTAL_ACCURACY_METERS = 8.0;

/**
 * Simulated meters per second the demo fix stream advances along the route
 * polyline: the artifact's walking trace at the playback factor (a
 * pedestrian trace sped up 20×). The demo's pace, not navigation policy.
 */
export const FOLLOW_DEMO_SPEED_METERS_PER_SECOND =
  1.4 * FOLLOW_DEMO_PLAYBACK_TIME_ACCELERATION_FACTOR;

// --- The diagnostics pane's shared bounds (docs/design/ReferenceApplicationBehavior.md
// §The bounded stream): one display window and one flush limit per pane, with
// the refresh cadence the page coalesces its ring reads to. The values land as
// behavior tokens in platform/reference-tokens.json so the four mirrors cannot
// drift. ---

/** The most recent events the diagnostics pane displays. */
export const DIAGNOSTICS_EVENT_WINDOW = 100;

/** The backlog flush limit when the pane opens. */
export const DIAGNOSTICS_BACKLOG_FLUSH_LIMIT = 100;

/** The pane's refresh coalescing cadence in milliseconds. */
export const DIAGNOSTICS_REFRESH_CADENCE_MILLISECONDS = 500;

/** The SDK's per-subsystem diagnostics ring capacity, in events. */
export const DIAGNOSTICS_RING_CAPACITY = 512;

/** The pane's default (and idle SDK gate) severity name. */
export const DIAGNOSTICS_MINIMUM_SEVERITY_NAME = 'Info';

/** The explicit Show debug events severity name. */
export const DIAGNOSTICS_DEBUG_SEVERITY_NAME = 'Debug';

/** Earth's mean radius the haversine route helpers below use, in meters. */
const EARTH_MEAN_RADIUS_METERS = 6371008.8;

// --- The shared `map-refapp-core` behavior math, re-exported under the names
// the page and the specs import. The implementations live in Rust. The three
// classes the page constructs before wasm readiness defer creating their Rust
// object until first use; `CourseMedianSmoother` and `TraceCursor` are only
// constructed after readiness and re-export the crate classes directly. ---

export { CourseMedianSmoother, TraceCursor };

/**
 * The location puck's interpolation between fixes (`map-refapp-core`'s
 * `LocationPoseAnimator`). The Rust object is created on first use so the page
 * may construct the animator before the wasm module finishes loading.
 */
export class LocationPoseAnimator {
  constructor() {
    this.native_instance = null;
  }

  /** The lazily created Rust object. */
  native() {
    if (this.native_instance === null) {
      this.native_instance = new NativeLocationPoseAnimator();
    }
    return this.native_instance;
  }

  /**
   * The pose to draw at `now_milliseconds`, or `undefined` before the first
   * fix.
   */
  poseAt(now_milliseconds) {
    return this.native().poseAt(now_milliseconds);
  }

  /** Starts or retargets the motion toward one measured position. */
  pushFix(
    latitude_degrees,
    longitude_degrees,
    course_degrees,
    horizontal_accuracy_meters,
    received_at_milliseconds,
  ) {
    this.native().pushFix(
      latitude_degrees,
      longitude_degrees,
      course_degrees,
      horizontal_accuracy_meters,
      received_at_milliseconds,
    );
  }

  /** Forgets every fix, so the next one draws immediately. */
  reset() {
    this.native().reset();
  }
}

/**
 * A linear-in-time, smoothstep-eased value move (`map-refapp-core`'s
 * `SmoothstepTimedEase`). The Rust object is created on first use so the page
 * may declare eases before the wasm module finishes loading.
 */
export class SmoothstepTimedEase {
  constructor() {
    this.native_instance = null;
  }

  /** The lazily created Rust object. */
  native() {
    if (this.native_instance === null) {
      this.native_instance = new NativeSmoothstepTimedEase();
    }
    return this.native_instance;
  }

  begin(start_milliseconds, from_value, to_value, duration_milliseconds) {
    this.native().begin(start_milliseconds, from_value, to_value, duration_milliseconds);
  }

  reset() {
    this.native().reset();
  }

  get is_running() {
    return this.native().is_running;
  }

  get target_value() {
    return this.native().target_value;
  }

  advance(now_milliseconds) {
    return this.native().advance(now_milliseconds);
  }
}

/**
 * An exponential chase toward a moving target (`map-refapp-core`'s
 * `ExponentialValueChase`), created on first use.
 */
export class ExponentialValueChase {
  constructor(time_constant_milliseconds) {
    this.time_constant_milliseconds = time_constant_milliseconds;
    this.native_instance = null;
  }

  /** The lazily created Rust object. */
  native() {
    if (this.native_instance === null) {
      this.native_instance = new NativeExponentialValueChase(
        this.time_constant_milliseconds,
      );
    }
    return this.native_instance;
  }

  advance(current, target, now_milliseconds) {
    return this.native().advance(current, target, now_milliseconds);
  }

  reset() {
    this.native().reset();
  }
}

/**
 * The navigation follow-camera state machine and its targets
 * (`map-refapp-core`'s `FollowCamera`), created on first use.
 */
export class FollowCamera {
  constructor() {
    this.native_instance = null;
  }

  /** The lazily created Rust object. */
  native() {
    if (this.native_instance === null) {
      this.native_instance = new NativeFollowCamera();
    }
    return this.native_instance;
  }

  engageTrip(
    current_center_latitude_degrees,
    current_center_longitude_degrees,
    current_zoom_level,
    current_bearing_degrees,
    current_pitch_degrees,
  ) {
    this.native().engageTrip(
      current_center_latitude_degrees,
      current_center_longitude_degrees,
      current_zoom_level,
      current_bearing_degrees,
      current_pitch_degrees,
    );
  }

  breakOnGesture() {
    this.native().breakOnGesture();
  }

  onFix(
    latitude_degrees,
    longitude_degrees,
    course_heading_degrees,
    remaining_distance_fraction,
  ) {
    this.native().onFix(
      latitude_degrees,
      longitude_degrees,
      course_heading_degrees,
      remaining_distance_fraction,
    );
  }

  reengage() {
    this.native().reengage();
  }

  /** Holds the camera north-up whatever the fixes report (M73). */
  northUp() {
    this.native().northUp();
  }

  /** Resumes the eased course chase on the next fix (M73). */
  courseUp() {
    this.native().courseUp();
  }

  /** Whether the camera is holding north-up (M73). */
  isNorthUp() {
    return this.native().isNorthUp();
  }

  restorePreTripCamera() {
    return this.native().restorePreTripCamera();
  }

  get phase() {
    return this.native().phase;
  }

  get preTripCamera() {
    return this.native().preTripCamera;
  }

  get targetCenterLatitudeDegrees() {
    return this.native().targetCenterLatitudeDegrees;
  }

  get targetCenterLongitudeDegrees() {
    return this.native().targetCenterLongitudeDegrees;
  }

  get targetZoomLevel() {
    return this.native().targetZoomLevel;
  }

  get targetBearingDegrees() {
    return this.native().targetBearingDegrees;
  }
}

/** Smoothstep easing (`3t²−2t³`), clamped into `[0, 1]`. */
export const smoothstep_eased_progress = smoothstepEasedProgress;

/** The camera bearing's smallest off-north angular distance, in degrees. */
export const bearing_off_north_degrees = bearingOffNorthDegrees;

/** The shortest signed angular difference `to − from`, in degrees. */
export const signed_angular_difference_degrees = signedAngularDifferenceDegrees;

/**
 * The follow camera's zoom toward trip end: the fixed deep zoom at the trip's
 * start, ramping linearly with the travelled fraction to the maximum.
 */
export const follow_zoom_toward_trip_end = followZoomTowardTripEnd;

/**
 * The replay dispatch interval of a recorded trace, in milliseconds.
 */
export const trace_dispatch_interval_milliseconds =
  traceDispatchIntervalMilliseconds;

/**
 * One chosen scale-bar scale: the labeled distance and the bar's pixel width.
 * @typedef {{distanceMeters: number, widthPixels: number}} SelectedScaleBarScale
 */

/**
 * Selects the ladder distance fitting the token width range for one ground
 * meters-per-screen-pixel answer: the largest ladder distance whose bar width
 * does not exceed the maximum, when its width also reaches the minimum. A
 * null, non-finite or non-positive ground answer selects nothing (the scale
 * bar then renders no bar rather than an invented distance).
 * @param {number | null | undefined} ground_meters_per_screen_pixel
 * @returns {SelectedScaleBarScale | null}
 */
export function select_scale_bar_scale(ground_meters_per_screen_pixel) {
  if (
    ground_meters_per_screen_pixel === null ||
    ground_meters_per_screen_pixel === undefined
  ) {
    return null;
  }
  return selectScaleBarScale(ground_meters_per_screen_pixel);
}

/**
 * The ladder distance's metric label: whole meters under a kilometer, rounded
 * kilometers otherwise.
 * @param {number | null | undefined} distance_meters
 * @returns {string | null} the label, or null when no bar is selected
 */
export function scale_bar_distance_label_text(distance_meters) {
  if (distance_meters === null || distance_meters === undefined) {
    return null;
  }
  return scaleBarDistanceLabelText(distance_meters);
}

/**
 * The great-circle distance between two coordinates in meters.
 * @param {{latitude: number, longitude: number}} first
 * @param {{latitude: number, longitude: number}} second
 * @returns {number}
 */
export function great_circle_distance_meters(first, second) {
  const first_latitude_radians = (first.latitude * Math.PI) / 180;
  const second_latitude_radians = (second.latitude * Math.PI) / 180;
  const latitude_delta_radians = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitude_delta_radians = ((second.longitude - first.longitude) * Math.PI) / 180;
  const haversine =
    Math.sin(latitude_delta_radians / 2) ** 2 +
    Math.cos(first_latitude_radians) *
      Math.cos(second_latitude_radians) *
      Math.sin(longitude_delta_radians / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_METERS * Math.asin(Math.sqrt(haversines_capped(haversine)));
}

/** Clamps a haversine's inner term into (0, 1] (floating-point rounding can
 * walk it marginally outside on antipodal-ish inputs). */
function haversines_capped(haversine_value) {
  return Math.min(Math.max(haversine_value, 0), 1);
}

/**
 * The initial bearing in degrees clockwise from true north from one
 * coordinate to another (the fixes' course-over-ground along the polyline).
 * @param {{latitude: number, longitude: number}} first
 * @param {{latitude: number, longitude: number}} second
 * @returns {number}
 */
export function initial_bearing_degrees(first, second) {
  const first_latitude_radians = (first.latitude * Math.PI) / 180;
  const second_latitude_radians = (second.latitude * Math.PI) / 180;
  const longitude_delta_radians =
    ((second.longitude - first.longitude) * Math.PI) / 180;
  const y = Math.sin(longitude_delta_radians) * Math.cos(second_latitude_radians);
  const x =
    Math.cos(first_latitude_radians) * Math.sin(second_latitude_radians) -
    Math.sin(first_latitude_radians) * Math.cos(second_latitude_radians) *
      Math.cos(longitude_delta_radians);
  return ((Math.atan2(y, x) * 180) / Math.PI + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;
}

/**
 * Walks a route polyline by travelled distance: the position at
 * `travelled_meters` along the segment-joined path, plus the segment's
 * course-over-ground (the fix's course). Past the end the last coordinate
 * holds with the final segment's course.
 * @param {Array<{latitude: number, longitude: number}>} polyline
 * @param {number} travelled_meters
 * @returns {{latitude: number, longitude: number, courseHeadingDegrees: number}}
 */
export function polyline_fix_at_travelled_meters(polyline, travelled_meters) {
  const clamped_travelled_meters = Math.min(
    Math.max(travelled_meters, 0),
    polyline_length_meters(polyline),
  );
  let remaining_meters = clamped_travelled_meters;
  let previous_point = polyline[0];
  for (let segment_index = 1; segment_index < polyline.length; segment_index += 1) {
    const next_point = polyline[segment_index];
    const segment_length_meters =
      great_circle_distance_meters(previous_point, next_point);
    if (remaining_meters <= segment_length_meters) {
      // Inside this segment: linear interpolation in degrees (meters per
      // degree of latitude is near-constant across the demo's tiny spans).
      const segment_fraction =
        segment_length_meters === 0
          ? 0
          : Math.min(Math.max(remaining_meters / segment_length_meters, 0), 1);
      return {
        latitude:
          previous_point.latitude +
          (next_point.latitude - previous_point.latitude) * segment_fraction,
        longitude:
          previous_point.longitude +
          (next_point.longitude - previous_point.longitude) * segment_fraction,
        courseHeadingDegrees: initial_bearing_degrees(previous_point, next_point),
      };
    }
    remaining_meters -= segment_length_meters;
    previous_point = next_point;
  }
  // Exactly at (or past) the trip end: the last coordinate with the final
  // segment's course.
  const last_point = polyline[polyline.length - 1];
  const before_last_point = polyline[polyline.length - 2];
  return {
    latitude: last_point.latitude,
    longitude: last_point.longitude,
    courseHeadingDegrees: initial_bearing_degrees(before_last_point, last_point),
  };
}

/**
 * The polyline's total length in meters.
 * @param {Array<{latitude: number, longitude: number}>} polyline
 * @returns {number}
 */
export function polyline_length_meters(polyline) {
  let total_length = 0;
  for (let segment_index = 1; segment_index < polyline.length; segment_index += 1) {
    total_length += great_circle_distance_meters(
      polyline[segment_index - 1],
      polyline[segment_index],
    );
  }
  return total_length;
}
