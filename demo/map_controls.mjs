// Platform glue of the web playground's reference-app parity features
// (round 11): pure values mirroring the design language's §2.4 token table
// rows the round-10 reference apps consume, plus the pure helpers the
// control cluster, the follow camera and the scale bar drive their behavior
// with. The mirror mirrors the Android reference app's own files
// (`FollowCamera.kt`, `CameraEasing.kt`, `ScaleBarModel.kt`) member by
// member; values live behind named constants, never literals. Both the page
// (index.html) and the Playwright specs import this module, so the demo
// harness and the tests can never drift apart on the token values.
//
// The WebGL-era §5.3 follow camera is *platform-pump owned*: the wasm seam
// exposes no navigation object (docs/ReferenceAppUX.md §12), so this
// platform glue drives the same eased state machine against the page's own
// frame pump; the contract's camera surface stays untouched.

/** Full circle in degrees (the bearing wraps' modulus). */
const FULL_CIRCLE_DEGREES = 360.0;
/** Half circle in degrees (the shortest-way wrap boundary). */
const HALF_CIRCLE_DEGREES = 180.0;

// --- The §2.4 token rows the round-11 controls mirror (token names
// verbatim; the Android mirror's own constants spell them identically) ---

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

/** The scale bar's width floor in pixels (`scale-bar-width-range` low). */
export const SCALE_BAR_WIDTH_MINIMUM_PIXELS = 50.0;
/** The scale bar's width ceiling in pixels (`scale-bar-width-range` high). */
export const SCALE_BAR_WIDTH_MAXIMUM_PIXELS = 120.0;

/** The clean distance ladder's multipliers, per decade (§2.4). */
export const SCALE_BAR_LADDER_MULTIPLIERS = [1, 2, 3, 5, 10];

/**
 * The ladder's decade scan range around one meter: `10⁻² … 10⁹` m spans
 * every usable zoom the SDK camera clamps to (candidates can never fit
 * outside it; the scan stops once a candidate's width passes the maximum).
 */
export const SCALE_BAR_LADDER_LOWER_DECADE_SCAN_RANGE = 2;
export const SCALE_BAR_LADDER_DECADE_SCAN_RANGE = 9;

// --- The follow camera's §5.3 token rows ---

/** The follow camera's fixed deep zoom (`navigation-follow-zoom`). */
export const NAVIGATION_FOLLOW_ZOOM = 17.0;
/** The trip-end clamp (`navigation-follow-zoom-maximum`). */
export const NAVIGATION_FOLLOW_ZOOM_MAXIMUM = 17.5;
/** The follow camera's 3D pitch (`navigation-follow-pitch-3d`). */
export const NAVIGATION_FOLLOW_PITCH_3D_DEGREES = 45.0;

/** Median smoothing's fix window (§5.3's named constant window). */
export const COURSE_SMOOTHING_WINDOW_FIXES = 5;

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

/**
 * The first frame of a chase has one frame's worth of catching up: the
 * constant folds one 60 Hz frame's delta into the chase factor (structural,
 * mirroring the Android pump).
 */
export const CHASE_FIRST_FRAME_DELTA_MILLISECONDS = 1000.0 / 60.0;

// --- The follow demo's documented platform-glue constants (mirroring the
// Android reference app's demo constants) ---

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

/** Earth's equatorial circumference the Web Mercator projection stretches
 * onto one world edge (haversine-free small-segment distance uses the
 * equirectangular approximation the demo's short walk spans comfortably;
 * named for documentation, consumed by `great_circle_distance_meters`). */
const EARTH_MEAN_RADIUS_METERS = 6371008.8;

/**
 * Smoothstep easing (`3t²−2t³`): eased in, eased out, structural math.
 * @param {number} linear_progress
 * @returns {number}
 */
export function smoothstep_eased_progress(linear_progress) {
  const clamped_progress = Math.min(Math.max(linear_progress, 0), 1);
  return clamped_progress * clamped_progress * (3 - 2 * clamped_progress);
}

/**
 * The camera bearing's smallest off-north angular distance in degrees (the
 * compass control's visibility-threshold input, §2.4): wrapped into the
 * shortest direction, always in [0, 180].
 * @param {number} bearing_degrees
 * @returns {number}
 */
export function bearing_off_north_degrees(bearing_degrees) {
  const normalized_degrees =
    ((bearing_degrees % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;
  return normalized_degrees <= HALF_CIRCLE_DEGREES
    ? normalized_degrees
    : FULL_CIRCLE_DEGREES - normalized_degrees;
}

/**
 * The shortest signed angular difference `to − from` in degrees, wrapped to
 * (−180, 180].
 * @param {number} to_degrees
 * @param {number} from_degrees
 * @returns {number}
 */
export function signed_angular_difference_degrees(to_degrees, from_degrees) {
  let difference = (to_degrees - from_degrees) % FULL_CIRCLE_DEGREES;
  if (difference > HALF_CIRCLE_DEGREES) difference -= FULL_CIRCLE_DEGREES;
  if (difference < -HALF_CIRCLE_DEGREES) difference += FULL_CIRCLE_DEGREES;
  return difference;
}

/**
 * A linear-in-time, smoothstep-eased value move begun with a frame-clock
 * timestamp: the compass's eased "north up" return and the 2D/3D pitch
 * toggle's swing both run as this timed ease over the one eased-camera-move
 * duration. The caller supplies all timestamps (the page's frame pump),
 * exactly like the Android mirror's platform-pump ease.
 */
export class SmoothstepTimedEase {
  constructor() {
    /** Start timestamp of the running ease, or null while idle. */
    this.start_milliseconds = null;
    /** Value the running ease moves from. */
    this.from_value = 0.0;
    /** Value the running ease moves to. */
    this.to_value = 0.0;
    /** Duration of the running ease, in milliseconds. */
    this.duration_milliseconds = EASED_CAMERA_MOVE_DURATION_MILLISECONDS;
  }

  /** Begins (or restarts) the ease from one value to another. */
  begin(start_milliseconds, from_value, to_value, duration_milliseconds) {
    this.start_milliseconds = start_milliseconds;
    this.from_value = from_value;
    this.to_value = to_value;
    this.duration_milliseconds = duration_milliseconds;
  }

  /** Stops an in-flight ease without applying anything. */
  reset() {
    this.start_milliseconds = null;
  }

  /** Whether an ease is in flight. */
  get is_running() {
    return this.start_milliseconds !== null;
  }

  /** The ease's target. */
  get target_value() {
    return this.to_value;
  }

  /**
   * Advances the ease: the current eased value, then true when the move
   * just finished this call (the caller then stops). An idle ease reports
   * its target and finished.
   * @returns {[number, boolean]}
   */
  advance(now_milliseconds) {
    if (this.start_milliseconds === null) {
      return [this.to_value, true];
    }
    const elapsed_milliseconds = now_milliseconds - this.start_milliseconds;
    if (elapsed_milliseconds >= this.duration_milliseconds) {
      const final_value = this.to_value;
      this.start_milliseconds = null;
      return [final_value, true];
    }
    const eased_value =
      this.from_value +
      (this.to_value - this.from_value) *
        smoothstep_eased_progress(elapsed_milliseconds / this.duration_milliseconds);
    return [eased_value, false];
  }
}

/**
 * An exponential chase toward a moving target (the follow camera's bearing
 * toward the median-smoothed course, §5.3): a time-constant chase settles on
 * its own when the target stops moving; the chase snaps when the remaining
 * distance falls under the snap distance. The caller supplies timestamps.
 */
export class ExponentialValueChase {
  /** @param {number} time_constant_milliseconds */
  constructor(time_constant_milliseconds) {
    this.time_constant_milliseconds = time_constant_milliseconds;
    this.last_frame_milliseconds = null;
  }

  /**
   * Advances the chase toward `target`: the next current value. The first
   * call after a reset folds one display frame's worth of catching up;
   * frames reporting a clock going backwards are treated as a first frame.
   */
  advance(current, target, now_milliseconds) {
    const last_milliseconds = this.last_frame_milliseconds;
    this.last_frame_milliseconds = now_milliseconds;
    const delta_time_milliseconds =
      last_milliseconds === null || now_milliseconds < last_milliseconds
        ? CHASE_FIRST_FRAME_DELTA_MILLISECONDS
        : now_milliseconds - last_milliseconds;
    const delta_degrees = signed_angular_difference_degrees(target, current);
    if (Math.abs(delta_degrees) <= FOLLOW_BEARING_SNAP_DISTANCE_DEGREES) {
      return target;
    }
    const follow_factor = 1 - Math.exp(-delta_time_milliseconds / this.time_constant_milliseconds);
    return current + delta_degrees * follow_factor;
  }

  reset() {
    this.last_frame_milliseconds = null;
  }
}

/**
 * The median-smoothed course-over-ground (§5.3): the circular median of the
 * named constant window of recent fixes — the windowed sample minimizing the
 * sum of angular distances to the rest of the window.
 */
export class CourseMedianSmoother {
  /** @param {number} window_fix_count */
  constructor(window_fix_count) {
    this.window_fix_count = window_fix_count;
    /** @type {number[]} */
    this.recent_course_degrees = [];
  }

  /** Adds one fix's course-over-ground, dropping the window's oldest. */
  add(course_degree_value) {
    this.recent_course_degrees.push(course_degree_value);
    while (this.recent_course_degrees.length > this.window_fix_count) {
      this.recent_course_degrees.shift();
    }
  }

  /** The circular median, or null with no windowed sample. */
  median() {
    if (this.recent_course_degrees.length === 0) {
      return null;
    }
    const windowed_list = this.recent_course_degrees;
    let best_median = null;
    let best_distance_sum = Number.POSITIVE_INFINITY;
    for (const candidate_degrees of windowed_list) {
      let distance_sum = 0;
      for (const other_degrees of windowed_list) {
        distance_sum += angular_distance_degrees(candidate_degrees, other_degrees);
      }
      // Ties keep the earlier sample (the Android mirror's minBy semantics).
      if (distance_sum < best_distance_sum) {
        best_distance_sum = distance_sum;
        best_median = candidate_degrees;
      }
    }
    return best_median;
  }

  reset() {
    this.recent_course_degrees = [];
  }
}

/** The angular distance between two bearings, in degrees. */
function angular_distance_degrees(first_degrees, second_degrees) {
  const absolute_difference = Math.abs(first_degrees - second_degrees) % FULL_CIRCLE_DEGREES;
  return absolute_difference > HALF_CIRCLE_DEGREES
    ? FULL_CIRCLE_DEGREES - absolute_difference
    : absolute_difference;
}

/**
 * The follow camera's zoom toward trip end (§5.3): the fixed deep zoom at
 * the trip's start, ramping linearly with the *travelled* fraction to the
 * maximum at arrival.
 * @param {number} remaining_distance_fraction
 * @returns {number}
 */
export function follow_zoom_toward_trip_end(remaining_distance_fraction) {
  const clamped_remaining_fraction = Math.min(Math.max(remaining_distance_fraction, 0), 1);
  const travelled_fraction = 1 - clamped_remaining_fraction;
  return (
    NAVIGATION_FOLLOW_ZOOM +
    (NAVIGATION_FOLLOW_ZOOM_MAXIMUM - NAVIGATION_FOLLOW_ZOOM) * travelled_fraction
  );
}

/**
 * One chosen scale-bar scale: the labeled distance and the bar's pixel
 * width, mirroring the Android `ScaleBarModel`'s record.
 * @typedef {{distanceMeters: number, widthPixels: number}} SelectedScaleBarScale
 */

/**
 * Selects the ladder distance fitting the token width range for one ground
 * meters-per-screen-pixel answer: the largest ladder distance whose bar
 * width does not exceed the maximum, when its width also reaches the
 * minimum (the ladder's consecutive ratios are tighter than the width
 * range's 120/50 ratio, so a fitting candidate exists for every positive
 * ground answer); a non-finite or non-positive ground answer selects
 * nothing (the scale bar then renders no bar rather than an invented
 * distance).
 * @param {number | null | undefined} ground_meters_per_screen_pixel
 * @returns {SelectedScaleBarScale | null}
 */
export function select_scale_bar_scale(ground_meters_per_screen_pixel) {
  if (
    ground_meters_per_screen_pixel === null ||
    ground_meters_per_screen_pixel === undefined ||
    !Number.isFinite(ground_meters_per_screen_pixel) ||
    ground_meters_per_screen_pixel <= 0
  ) {
    return null;
  }
  const ascending_candidates = [];
  for (
    let decade_exponent = -SCALE_BAR_LADDER_LOWER_DECADE_SCAN_RANGE;
    decade_exponent <= SCALE_BAR_LADDER_DECADE_SCAN_RANGE;
    decade_exponent += 1
  ) {
    for (const multiplier of SCALE_BAR_LADDER_MULTIPLIERS) {
      ascending_candidates.push(multiplier * 10 ** decade_exponent);
    }
  }
  ascending_candidates.sort((first, second) => first - second);
  let selected = null;
  // Ascending scan; the last candidate under the maximum is the largest
  // fitting one, kept as the selection when it also reaches the minimum
  // width.
  for (const candidate_distance_meters of ascending_candidates) {
    const candidate_width_pixels =
      candidate_distance_meters / ground_meters_per_screen_pixel;
    if (candidate_width_pixels > SCALE_BAR_WIDTH_MAXIMUM_PIXELS) {
      break;
    }
    selected = {
      distanceMeters: candidate_distance_meters,
      widthPixels: candidate_width_pixels,
    };
  }
  if (selected !== null && selected.widthPixels < SCALE_BAR_WIDTH_MINIMUM_PIXELS) {
    return null;
  }
  return selected;
}

/**
 * The ladder distance's metric label (the scale bar's text): whole meters
 * under a kilometer, rounded kilometers otherwise (the Android mirror's
 * `distanceLabelText`).
 * @param {number | null | undefined} distance_meters
 * @returns {string | null} the label, or null when no bar is selected
 */
export function scale_bar_distance_label_text(distance_meters) {
  if (distance_meters === null || distance_meters === undefined) {
    return null;
  }
  const METERS_PER_KILOMETER = 1000.0;
  if (distance_meters < METERS_PER_KILOMETER) {
    return `${Math.trunc(distance_meters)} m`;
  }
  return `${Math.round(distance_meters / METERS_PER_KILOMETER)} km`;
}

/**
 * The great-circle distance between two coordinates in meters
 * (equatorial-accurate enough for the demo's short segments; the
 * haversine form the typed core also carries, mirrored without an SDK
 * object on the wasm seam).
 * @param {{latitude: number, longitude: number}} first
 * @param {{latitude: number, longitude: number}} second
 * @returns {number}
 */
export function great_circle_distance_meters(first, second) {
  const first_latitude_radians = (first.latitude * Math.PI) / 180;
  const second_latitude_radians = (second.latitude * Math.PI) / 180;
  const latitude_delta_radians = (second.latitude - first.latitude) * Math.PI / 180;
  const longitude_delta_radians = (second.longitude - first.longitude) * Math.PI / 180;
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