import { type UniffiByteArray, type UniffiGcObject, type UniffiHandle, Cursor, FfiConverterObject, FfiConverterObjectWithCallbacks, UniffiAbstractObject, destructorGuardSymbol, pointerLiteralSymbol, uniffiTypeNameSymbol } from "@ubjs/core";
/**
 * Projects a geographic coordinate into the normalized world square.
 *
 * # Parameters
 * - `coordinate` — a WGS 84 coordinate in decimal degrees.
 *
 * # Returns
 * The position in `[0, 1]` on both axes: x eastward from the
 * antimeridian, y southward from the north pole. A latitude beyond the
 * Web Mercator cutoff is clamped to the cutoff.
 *
 * # Errors
 * Throws `InvalidCoordinateInput` when the latitude is outside
 * `[-90, 90]`, the longitude is outside `[-180, 180]`, or a component is
 * not finite.
 */
export declare function coordinateToNormalizedWorld(coordinate: GeographicCoordinate): NormalizedWorldCoordinate;
/**
 * The default deviation policy: judge a fix off route when it lies more
 * than 25 meters from the remaining route line.
 */
export declare function defaultDeviationPolicy(): DeviationPolicy;
/**
 * The default reroute-recalculation policy: a 5 second cooldown and a
 * 50 meter movement threshold.
 */
export declare function defaultReroutePolicy(): ReroutePolicy;
/**
 * The default step-advance policy: advance when a position fix comes
 * within 20 meters of the end of the current step.
 */
export declare function defaultStepAdvancePolicy(): StepAdvancePolicy;
/**
 * Version of the SDK build, for example `0.12.0`.
 */
export declare function getSdkCompiledVersion(): string;
/**
 * The turn banner's full instruction line.
 *
 * The line is the display text (`instruction_display_text`) followed by
 * the roundabout exit suffix: ` (exit <index>)` for a roundabout
 * maneuver and nothing for every other maneuver. The then-line renders
 * the display text alone.
 *
 * # Parameters
 * - `composed_display_text` — the banner variant composed by the
 *   contract, when present.
 * - `provider_display_text` — the provider-authored display text,
 *   verbatim, when present.
 * - `roundabout_exit_index` — the structured exit index of a roundabout
 *   maneuver, when the contract carries one.
 *
 * # Returns
 * The banner line, including the honest unavailable line when the
 * provider authored no display text.
 */
export declare function instructionBannerText(composedDisplayText: string | undefined, providerDisplayText: string | undefined, roundaboutExitIndex: number | undefined): string;
/**
 * The display text of one maneuver instruction.
 *
 * The composed display text wins; when it is absent the
 * provider-authored display text renders verbatim; when neither exists
 * the honest `No instruction text provided` line renders. The
 * `Unavailable` instruction-text kind carries null text fields, so it
 * renders the same honest line rather than an invented instruction. Use
 * this for the then-line; use `instruction_banner_text` for the turn
 * banner.
 *
 * # Parameters
 * - `composed_display_text` — the banner variant composed by the
 *   contract, when present.
 * - `provider_display_text` — the provider-authored display text,
 *   verbatim, when present.
 *
 * # Returns
 * The display line, never empty for absent provider text.
 */
export declare function instructionDisplayText(composedDisplayText: string | undefined, providerDisplayText: string | undefined): string;
/**
 * The speech text of one maneuver instruction.
 *
 * The composed speech text wins; when it is absent the provider-authored
 * speech text is returned verbatim. When neither exists the maneuver is
 * never spoken, so the result is null.
 *
 * # Parameters
 * - `composed_speech_text` — the text-to-speech variant composed by the
 *   contract, when present.
 * - `provider_speech_text` — the provider-authored speech text,
 *   verbatim, when present.
 *
 * # Returns
 * The line to speak verbatim, or null when the provider authored none.
 */
export declare function instructionSpeechText(composedSpeechText: string | undefined, providerSpeechText: string | undefined): string | undefined;
/**
 * Calculates a route between two coordinates over an offline routing
 * graph supplied as archive bytes.
 *
 * The archive is a self-describing RMOG container compiled from an
 * OpenStreetMap extract. It is validated in memory before routing, and no
 * provider registration is required. The request uses the graph profile's
 * default options (automobile, fastest, metric).
 *
 * # Parameters
 * - `archive_bytes` — the compiled routing archive.
 * - `start` — route origin.
 * - `end` — route destination.
 *
 * # Returns
 * The calculated route.
 *
 * # Errors
 * Throws `OfflineRoutingFailure` when the archive fails validation or
 * cannot be read, `InvalidCoordinateInput` when a coordinate lies beyond
 * the graph's snap tolerance, and `ProviderRequestRejected` when the
 * graph cannot connect the pair.
 *
 * # Async
 * Runs asynchronously; the call does not block the calling thread.
 */
export declare function offlineRouteFromArchiveBytes(archiveBytes: ArrayBuffer, start: GeographicCoordinate, end: GeographicCoordinate, asyncOpts_?: {
    signal: AbortSignal;
}): Promise<Route>;
/**
 * Resolves a provider registry capability name to the contract it
 * denotes.
 *
 * A provider descriptor declares the capabilities it serves in
 * `served_contracts` with the registry's snake_case names (`geocoding`,
 * `distance_matrix`, …). Settings surfaces and registration paths use
 * this function instead of their own name tables, so adding a capability
 * to the registry never requires editing a platform wrapper.
 *
 * # Parameters
 * - `registry_name` — one entry of a descriptor's `served_contracts`
 *   list.
 *
 * # Returns
 * The matching `ProviderContract`, or null when this build's contract
 * does not define the name. A registry newer than the SDK may declare a
 * capability this build cannot serve; callers skip that entry.
 */
export declare function providerContractFromRegistryName(registryName: string): ProviderContract | undefined;
/**
 * Returns the provider registry capability name for a contract.
 *
 * Every `ProviderContract` variant carries exactly one registry name,
 * matching the spelling `served_contracts` uses in the shared provider
 * registry.
 *
 * # Parameters
 * - `contract` — the capability to name.
 *
 * # Returns
 * The registry's snake_case storage name (`geocoding`,
 * `distance_matrix`, …).
 */
export declare function registryNameForProviderContract(contract: ProviderContract): string;
/**
 * Returns the XYZ address of the tile that contains the coordinate at
 * the given zoom level.
 *
 * # Parameters
 * - `coordinate` — a WGS 84 coordinate.
 * - `zoom_level` — tile zoom level.
 *
 * # Errors
 * Throws `InvalidCoordinateInput` when the coordinate is not valid.
 */
export declare function tileKeyForCoordinate(coordinate: GeographicCoordinate, zoomLevel: number): TileKey;
/**
 * Lists every XYZ tile whose area intersects the bounding box, ordered
 * row-major from the north.
 *
 * # Parameters
 * - `bounding_box` — area to cover; its corners must be ordered.
 * - `zoom_level` — tile zoom level.
 *
 * # Errors
 * Throws `InvalidCoordinateInput` for an invalid corner or an inverted
 * box.
 */
export declare function tilesCovering(boundingBox: BoundingBox, zoomLevel: number): Array<TileKey>;
/**
 * Which form an instruction text takes.
 */
export declare enum ManeuverInstructionTextKind {
    /**
     * The provider authored instruction text for this maneuver.
     */
    Composed = 0,
    /**
     * The provider authored no instruction text for this maneuver; nothing is
     * invented to fill it. All four text fields are null on this kind.
     */
    Unavailable = 1
}
/**
 * The text channels of one maneuver: provider-authored text is carried
 * verbatim beside the composed strings.
 */
export type ManeuverInstructionText = {
    /**
     * Which form the text takes.
     */
    textKind: ManeuverInstructionTextKind;
    /**
     * Provider-authored display text, verbatim and never rephrased.
     */
    providerDisplayText?: string;
    /**
     * Provider-authored speech text, verbatim and never rephrased.
     */
    providerSpeechText?: string;
    /**
     * Banner variant: the live distance prefix plus the display variant.
     */
    composedDisplayText?: string;
    /**
     * Text-to-speech variant: the live distance prefix plus the speech variant.
     */
    composedSpeechText?: string;
};
/**
 * Generated factory for {@link ManeuverInstructionText} record objects.
 */
export declare const ManeuverInstructionText: Readonly<{
    create: (partial: Partial<ManeuverInstructionText> & Required<Omit<ManeuverInstructionText, "textKind" | "providerDisplayText" | "providerSpeechText" | "composedDisplayText" | "composedSpeechText">>) => ManeuverInstructionText;
    new: (partial: Partial<ManeuverInstructionText> & Required<Omit<ManeuverInstructionText, "textKind" | "providerDisplayText" | "providerSpeechText" | "composedDisplayText" | "composedSpeechText">>) => ManeuverInstructionText;
    defaults: () => Partial<ManeuverInstructionText>;
}>;
/**
 * Which form a distance phrase takes.
 */
export declare enum DistancePhraseKind {
    /**
     * The position is closer than half a near-band increment to the maneuver
     * point; no distance is phrased and composed text drops the prefix. The
     * magnitude is null on this kind.
     */
    Immediate = 0,
    /**
     * A rounded distance magnitude in a specific unit; the magnitude and unit
     * are set on this kind.
     */
    Quantity = 1,
    /**
     * No distance is phrased because the holding (fully-off-route) deviation
     * grade applies: the projection is held, so any countdown composed from it
     * would be a phantom measurement. The magnitude is null on this kind, and
     * the composed text channels carry no distance prefix.
     */
    Suppressed = 2
}
/**
 * Length unit a distance-phrase magnitude is expressed in.
 */
export declare enum DistanceUnit {
    /**
     * Meters, used by the metric near and moderate bands.
     */
    Meters = 0,
    /**
     * Kilometers, used by the metric far band.
     */
    Kilometers = 1,
    /**
     * Feet, used by the imperial near and moderate bands.
     */
    Feet = 2,
    /**
     * Miles, used by the imperial far band.
     */
    Miles = 3
}
/**
 * The unit-system-aware phrasing of the distance remaining to a maneuver,
 * rounded into the named distance phrasing bands.
 */
export type DistancePhrase = {
    /**
     * Which form the phrase takes.
     */
    phraseKind: DistancePhraseKind;
    /**
     * Rounded magnitude of the phrase; null for the immediate and suppressed
     * forms.
     */
    magnitude?: number;
    /**
     * Unit the magnitude is expressed in; null for the immediate and
     * suppressed forms.
     */
    magnitudeUnit?: DistanceUnit;
};
/**
 * Generated factory for {@link DistancePhrase} record objects.
 */
export declare const DistancePhrase: Readonly<{
    create: (partial: Partial<DistancePhrase> & Required<Omit<DistancePhrase, "phraseKind" | "magnitude" | "magnitudeUnit">>) => DistancePhrase;
    new: (partial: Partial<DistancePhrase> & Required<Omit<DistancePhrase, "phraseKind" | "magnitude" | "magnitudeUnit">>) => DistancePhrase;
    defaults: () => Partial<DistancePhrase>;
}>;
/**
 * Instruction payload of the maneuver currently being traversed: the step the
 * snapped position sits inside, with the distance measured to that step's end,
 * the maneuver point.
 */
export type ActiveManeuverInstruction = {
    /**
     * Composed display and speech text of the active step.
     */
    instruction: ManeuverInstructionText;
    /**
     * Unit-system-aware distance phrasing of the distance to the next
     * maneuver.
     */
    distancePhrase: DistancePhrase;
    /**
     * Structured exit index of a roundabout active step, starting at one.
     */
    roundaboutExitIndex?: number;
};
/**
 * Generated factory for {@link ActiveManeuverInstruction} record objects.
 */
export declare const ActiveManeuverInstruction: Readonly<{
    create: (partial: Partial<ActiveManeuverInstruction> & Required<Omit<ActiveManeuverInstruction, "instruction" | "distancePhrase" | "roundaboutExitIndex">>) => ActiveManeuverInstruction;
    new: (partial: Partial<ActiveManeuverInstruction> & Required<Omit<ActiveManeuverInstruction, "instruction" | "distancePhrase" | "roundaboutExitIndex">>) => ActiveManeuverInstruction;
    defaults: () => Partial<ActiveManeuverInstruction>;
}>;
/**
 * Road features a routing request can ask the provider to avoid; all
 * disabled by default.
 */
export type AvoidOptions = {
    /**
     * Avoid toll roads.
     */
    tollRoads: boolean;
    /**
     * Avoid limited-access highways and motorways.
     */
    limitedAccessHighways: boolean;
    /**
     * Avoid ferry crossings.
     */
    ferries: boolean;
    /**
     * Avoid unpaved roads.
     */
    unpavedRoads: boolean;
};
/**
 * Generated factory for {@link AvoidOptions} record objects.
 */
export declare const AvoidOptions: Readonly<{
    create: (partial: Partial<AvoidOptions> & Required<Omit<AvoidOptions, "tollRoads" | "limitedAccessHighways" | "ferries" | "unpavedRoads">>) => AvoidOptions;
    new: (partial: Partial<AvoidOptions> & Required<Omit<AvoidOptions, "tollRoads" | "limitedAccessHighways" | "ferries" | "unpavedRoads">>) => AvoidOptions;
    defaults: () => Partial<AvoidOptions>;
}>;
/**
 * A position on the WGS 84 ellipsoid in decimal degrees.
 */
export type GeographicCoordinate = {
    /**
     * Latitude in decimal degrees, valid within `[-90, 90]`.
     */
    latitude: number;
    /**
     * Longitude in decimal degrees, valid within `[-180, 180]`.
     */
    longitude: number;
};
/**
 * Generated factory for {@link GeographicCoordinate} record objects.
 */
export declare const GeographicCoordinate: Readonly<{
    create: (partial: Partial<GeographicCoordinate> & Required<Omit<GeographicCoordinate, "latitude" | "longitude">>) => GeographicCoordinate;
    new: (partial: Partial<GeographicCoordinate> & Required<Omit<GeographicCoordinate, "latitude" | "longitude">>) => GeographicCoordinate;
    defaults: () => Partial<GeographicCoordinate>;
}>;
/**
 * Rectangular area between a south-west and a north-east corner; boxes never
 * span the antimeridian.
 */
export type BoundingBox = {
    /**
     * South-west corner (minimum latitude and longitude).
     */
    southWest: GeographicCoordinate;
    /**
     * North-east corner (maximum latitude and longitude).
     */
    northEast: GeographicCoordinate;
};
/**
 * Generated factory for {@link BoundingBox} record objects.
 */
export declare const BoundingBox: Readonly<{
    create: (partial: Partial<BoundingBox> & Required<Omit<BoundingBox, "southWest" | "northEast">>) => BoundingBox;
    new: (partial: Partial<BoundingBox> & Required<Omit<BoundingBox, "southWest" | "northEast">>) => BoundingBox;
    defaults: () => Partial<BoundingBox>;
}>;
/**
 * Which grade of deviation a recorded deviation carries: the distinction
 * between off the current step yet still on the route line, and completely off
 * the route. Only the fully-off grade holds navigation; the wrong-step grade
 * never does on its own.
 */
export declare enum DeviationGradeKind {
    /**
     * The fix projects onto neither the current step nor any future step of
     * the remaining route line: the holding grade. The trip's progress is held
     * until a graded fix recovers or a reroute replaces the route.
     */
    FullyOffRoute = 0,
    /**
     * The fix is off the current step but projects onto a future step of the
     * remaining route line: "on route, wrong step". The trip keeps navigating
     * and counting down, and is never held by this grade alone.
     */
    OffStepOnRoute = 1
}
/**
 * Description of an active deviation from the route. The grade kind
 * distinguishes the holding fully-off grade from a wrong-step record: a
 * wrong-step record is guidance feedback ("on the route, on a later step")
 * carried while the trip phase stays `Navigating`.
 */
export type DeviationInfo = {
    /**
     * Which grade of deviation this is (see `DeviationGradeKind`).
     */
    gradeKind: DeviationGradeKind;
    /**
     * Distance, in meters, from the raw fix that triggered (or most recently
     * confirmed) the deviation to the remaining route line.
     */
    deviationFromRouteMeters: number;
};
/**
 * Generated factory for {@link DeviationInfo} record objects.
 */
export declare const DeviationInfo: Readonly<{
    create: (partial: Partial<DeviationInfo> & Required<Omit<DeviationInfo, "gradeKind" | "deviationFromRouteMeters">>) => DeviationInfo;
    new: (partial: Partial<DeviationInfo> & Required<Omit<DeviationInfo, "gradeKind" | "deviationFromRouteMeters">>) => DeviationInfo;
    defaults: () => Partial<DeviationInfo>;
}>;
/**
 * Which deviation-detection strategy a deviation policy configures.
 */
export declare enum DeviationPolicyKind {
    /**
     * Flags a deviation when the raw fix is farther from the remaining route
     * line than the configured threshold, widened by the fix's reported
     * accuracy.
     */
    DistanceThreshold = 0
}
/**
 * The deviation-detection policy of a trip.
 */
export type DeviationPolicy = {
    /**
     * Which deviation-detection strategy the policy configures.
     */
    policyKind: DeviationPolicyKind;
    /**
     * Distance, in meters, from the remaining route line beyond which a fix is
     * judged off route (before any accuracy widening, strictly greater).
     */
    deviationThresholdMeters: number;
};
/**
 * Generated factory for {@link DeviationPolicy} record objects.
 */
export declare const DeviationPolicy: Readonly<{
    create: (partial: Partial<DeviationPolicy> & Required<Omit<DeviationPolicy, "policyKind" | "deviationThresholdMeters">>) => DeviationPolicy;
    new: (partial: Partial<DeviationPolicy> & Required<Omit<DeviationPolicy, "policyKind" | "deviationThresholdMeters">>) => DeviationPolicy;
    defaults: () => Partial<DeviationPolicy>;
}>;
/**
 * Which form a deviation-status update takes.
 */
export declare enum DeviationStatusChangeKind {
    /**
     * The trip is judged deviating; the deviation description is set on this
     * kind. The description's grade kind distinguishes the holding fully-off
     * grade from a wrong-step record, which is delivered while the trip phase
     * stays `Navigating`.
     */
    OffRoute = 0,
    /**
     * A previously recorded deviation cleared; the trip is judged on route.
     */
    OnRoute = 1
}
/**
 * A deviation-topic update: the detector's judgment changed between the
 * previous and the current trip state, covering entry, measurement drift while
 * the deviation persists, and clearing.
 */
export type DeviationStatusChange = {
    /**
     * Which form the update takes.
     */
    statusChangeKind: DeviationStatusChangeKind;
    /**
     * The recorded measurement of the deviation, set exactly on the off-route
     * kind.
     */
    deviationInfo?: DeviationInfo;
};
/**
 * Generated factory for {@link DeviationStatusChange} record objects.
 */
export declare const DeviationStatusChange: Readonly<{
    create: (partial: Partial<DeviationStatusChange> & Required<Omit<DeviationStatusChange, "statusChangeKind" | "deviationInfo">>) => DeviationStatusChange;
    new: (partial: Partial<DeviationStatusChange> & Required<Omit<DeviationStatusChange, "statusChangeKind" | "deviationInfo">>) => DeviationStatusChange;
    defaults: () => Partial<DeviationStatusChange>;
}>;
/**
 * One origin-destination cell of a distance matrix.
 */
export type DistanceMatrixEntry = {
    /**
     * Origin index into the request's origins.
     */
    originIndex: number;
    /**
     * Destination index into the request's destinations.
     */
    destinationIndex: number;
    /**
     * Distance for this cell in meters.
     */
    distanceMeters: number;
    /**
     * Travel time for this cell in seconds.
     */
    durationSeconds: number;
};
/**
 * Generated factory for {@link DistanceMatrixEntry} record objects.
 */
export declare const DistanceMatrixEntry: Readonly<{
    create: (partial: Partial<DistanceMatrixEntry> & Required<Omit<DistanceMatrixEntry, "originIndex" | "destinationIndex" | "distanceMeters" | "durationSeconds">>) => DistanceMatrixEntry;
    new: (partial: Partial<DistanceMatrixEntry> & Required<Omit<DistanceMatrixEntry, "originIndex" | "destinationIndex" | "distanceMeters" | "durationSeconds">>) => DistanceMatrixEntry;
    defaults: () => Partial<DistanceMatrixEntry>;
}>;
/**
 * Travel-time matrix for origins x destinations.
 */
export type DistanceMatrix = {
    /**
     * Entries in row-major origin-major order.
     */
    entries: Array<DistanceMatrixEntry>;
};
/**
 * Generated factory for {@link DistanceMatrix} record objects.
 */
export declare const DistanceMatrix: Readonly<{
    create: (partial: Partial<DistanceMatrix> & Required<Omit<DistanceMatrix, "entries">>) => DistanceMatrix;
    new: (partial: Partial<DistanceMatrix> & Required<Omit<DistanceMatrix, "entries">>) => DistanceMatrix;
    defaults: () => Partial<DistanceMatrix>;
}>;
/**
 * Screen-space insets kept clear of map content: distances from each
 * viewport edge in pixels, so UI overlays such as route cards, attribution
 * and sheet panels never cover the content the camera guarantees visible.
 */
export type EdgeInsets = {
    /**
     * Pixels kept clear from the left viewport edge.
     */
    left: number;
    /**
     * Pixels kept clear from the top viewport edge.
     */
    top: number;
    /**
     * Pixels kept clear from the right viewport edge.
     */
    right: number;
    /**
     * Pixels kept clear from the bottom viewport edge.
     */
    bottom: number;
};
/**
 * Generated factory for {@link EdgeInsets} record objects.
 */
export declare const EdgeInsets: Readonly<{
    create: (partial: Partial<EdgeInsets> & Required<Omit<EdgeInsets, "left" | "top" | "right" | "bottom">>) => EdgeInsets;
    new: (partial: Partial<EdgeInsets> & Required<Omit<EdgeInsets, "left" | "top" | "right" | "bottom">>) => EdgeInsets;
    defaults: () => Partial<EdgeInsets>;
}>;
/**
 * One terrain elevation sample at a coordinate.
 */
export type ElevationPoint = {
    /**
     * Position the sample belongs to.
     */
    coordinate: GeographicCoordinate;
    /**
     * Elevation above mean sea level in meters.
     */
    elevationMeters: number;
};
/**
 * Generated factory for {@link ElevationPoint} record objects.
 */
export declare const ElevationPoint: Readonly<{
    create: (partial: Partial<ElevationPoint> & Required<Omit<ElevationPoint, "coordinate" | "elevationMeters">>) => ElevationPoint;
    new: (partial: Partial<ElevationPoint> & Required<Omit<ElevationPoint, "coordinate" | "elevationMeters">>) => ElevationPoint;
    defaults: () => Partial<ElevationPoint>;
}>;
/**
 * One presented frame's tile and overlay accounting. Every requested tile
 * lands in exactly one of the four readiness counts, so
 * `present + fallback + deferred + unavailable` always equals `requested`.
 */
export type FrameStatistics = {
    /**
     * Tile requests the frame resolved. A request listing carrying duplicates
     * costs one fetch but reports per request.
     */
    requestedTileCount: number;
    /**
     * Tiles drawn at their own zoom level.
     */
    presentTileCount: number;
    /**
     * Tiles drawn from their nearest pooled ancestor.
     */
    fallbackTileCount: number;
    /**
     * Tiles whose fetch was deferred by the per-frame budget.
     */
    deferredTileCount: number;
    /**
     * Tiles the provider rejected this frame.
     */
    unavailableTileCount: number;
    /**
     * Clip-space triangles the overlay layer contributed to the frame.
     */
    overlayTriangleCount: number;
};
/**
 * Generated factory for {@link FrameStatistics} record objects.
 */
export declare const FrameStatistics: Readonly<{
    create: (partial: Partial<FrameStatistics> & Required<Omit<FrameStatistics, "requestedTileCount" | "presentTileCount" | "fallbackTileCount" | "deferredTileCount" | "unavailableTileCount" | "overlayTriangleCount">>) => FrameStatistics;
    new: (partial: Partial<FrameStatistics> & Required<Omit<FrameStatistics, "requestedTileCount" | "presentTileCount" | "fallbackTileCount" | "deferredTileCount" | "unavailableTileCount" | "overlayTriangleCount">>) => FrameStatistics;
    defaults: () => Partial<FrameStatistics>;
}>;
/**
 * One frame's location-layer state: position, optional course over ground and
 * optional horizontal accuracy.
 */
export type LocationIndicatorState = {
    /**
     * Fix position.
     */
    coordinate: GeographicCoordinate;
    /**
     * Course over ground in degrees clockwise from true north; null when the
     * source does not report one. The wedge renders only when this is set and
     * the style carries `GuidedCourseArrow`.
     */
    courseHeadingDegrees?: number;
    /**
     * Horizontal accuracy radius in meters; the accuracy ring renders when
     * this is set and the style shows rings.
     */
    horizontalAccuracyMeters?: number;
};
/**
 * Generated factory for {@link LocationIndicatorState} record objects.
 */
export declare const LocationIndicatorState: Readonly<{
    create: (partial: Partial<LocationIndicatorState> & Required<Omit<LocationIndicatorState, "coordinate" | "courseHeadingDegrees" | "horizontalAccuracyMeters">>) => LocationIndicatorState;
    new: (partial: Partial<LocationIndicatorState> & Required<Omit<LocationIndicatorState, "coordinate" | "courseHeadingDegrees" | "horizontalAccuracyMeters">>) => LocationIndicatorState;
    defaults: () => Partial<LocationIndicatorState>;
}>;
/**
 * Which visual form the location layer draws.
 */
export declare enum LocationIndicatorVisualKind {
    /**
     * The soft tracking dot (no course known or no route): accent core,
     * white ring and dark halo.
     */
    TrackingDot = 0,
    /**
     * The course-directed navigation dart inside the same ring and halo
     * (navigation follow mode); degrades to the tracking dot without a
     * course.
     */
    GuidedCourseArrow = 1
}
/**
 * Solid RGBA overlay style, every channel in `[0, 1]`. A null style field
 * keeps the default style of the matching overlay kind.
 */
export type OverlayColor = {
    /**
     * Red channel in `[0, 1]`.
     */
    red: number;
    /**
     * Green channel in `[0, 1]`.
     */
    green: number;
    /**
     * Blue channel in `[0, 1]`.
     */
    blue: number;
    /**
     * Alpha channel in `[0, 1]` (the overlay pipeline alpha-blends).
     */
    alpha: number;
};
/**
 * Generated factory for {@link OverlayColor} record objects.
 */
export declare const OverlayColor: Readonly<{
    create: (partial: Partial<OverlayColor> & Required<Omit<OverlayColor, "red" | "green" | "blue" | "alpha">>) => OverlayColor;
    new: (partial: Partial<OverlayColor> & Required<Omit<OverlayColor, "red" | "green" | "blue" | "alpha">>) => OverlayColor;
    defaults: () => Partial<OverlayColor>;
}>;
/**
 * Style of the location layer; null fields keep the documented defaults. The
 * puck and its ring and halo are screen-sized pixel constants (a position
 * marker scales with the screen, not the ground); the accuracy ring is
 * ground-sized.
 */
export type LocationIndicatorStyle = {
    /**
     * Which visual form this layer draws.
     */
    visualKind: LocationIndicatorVisualKind;
    /**
     * Accent-core radius in screen pixels; the ring and halo are added
     * outside it; null keeps the default.
     */
    radiusPixels?: number;
    /**
     * Accent fill color of the core disc and navigation dart; null keeps the
     * default.
     */
    rgbaColor?: OverlayColor;
    /**
     * Ring color: the ring around the puck and the navigation dart's
     * outline; null keeps the default white.
     */
    ringRgbaColor?: OverlayColor;
    /**
     * Halo color drawn under the puck; null keeps the default.
     */
    haloRgbaColor?: OverlayColor;
    /**
     * Accuracy ring drawn around the puck (shown only when a fix carries a
     * reported accuracy); null keeps the default (shown whenever the fix
     * reports an accuracy that reaches the minimum draw size).
     */
    showAccuracyRing?: boolean;
};
/**
 * Generated factory for {@link LocationIndicatorStyle} record objects.
 */
export declare const LocationIndicatorStyle: Readonly<{
    create: (partial: Partial<LocationIndicatorStyle> & Required<Omit<LocationIndicatorStyle, "visualKind" | "radiusPixels" | "rgbaColor" | "ringRgbaColor" | "haloRgbaColor" | "showAccuracyRing">>) => LocationIndicatorStyle;
    new: (partial: Partial<LocationIndicatorStyle> & Required<Omit<LocationIndicatorStyle, "visualKind" | "radiusPixels" | "rgbaColor" | "ringRgbaColor" | "haloRgbaColor" | "showAccuracyRing">>) => LocationIndicatorStyle;
    defaults: () => Partial<LocationIndicatorStyle>;
}>;
/**
 * Severity of a diagnostic event, ordered from most to least detailed.
 */
export declare enum SdkLogSeverity {
    /**
     * Very fine-grained frame-path instrumentation (only delivered when a
     * listener subscribed at this severity).
     */
    Trace = 0,
    /**
     * Fine-grained internal state transitions.
     */
    Debug = 1,
    /**
     * Coarse-grained progress (the default minimum for a subscription).
     */
    Info = 2,
    /**
     * A problem this event explains.
     */
    Warn = 3,
    /**
     * A failure this event explains.
     */
    Error = 4
}
/**
 * One completed provider request, as a diagnostics event reports it.
 *
 * The record is already redacted: the request path keeps its structure with
 * query values removed, and no credential or response body is carried.
 */
export type ProviderRequestTrace = {
    /**
     * The registry key of the provider that served the call.
     */
    providerKey: string;
    /**
     * The contract the call served, for example `RoutingProvider`.
     */
    providerContract: string;
    /**
     * The HTTP method as an uppercase word (`GET`, `POST`).
     */
    httpMethod: string;
    /**
     * The redacted request path, with query names and no values.
     */
    requestPath: string;
    /**
     * `2xx`, `3xx`, `4xx`, `5xx` or the transport-failure marker.
     */
    statusClass: string;
    /**
     * The derived outcome word (`success`, `client-error`, …).
     */
    outcome: string;
    /**
     * Wall-clock duration of the attempt in milliseconds.
     */
    durationMilliseconds: bigint;
    /**
     * Response payload size in bytes; zero when no response arrived.
     */
    responseBytes: bigint;
    /**
     * The redacted response prefix captured behind the excerpt switch, capped
     * at 512 bytes; null while capture is off or no response body arrived.
     */
    responseExcerpt?: string;
};
/**
 * Generated factory for {@link ProviderRequestTrace} record objects.
 */
export declare const ProviderRequestTrace: Readonly<{
    create: (partial: Partial<ProviderRequestTrace> & Required<Omit<ProviderRequestTrace, "providerKey" | "providerContract" | "httpMethod" | "requestPath" | "statusClass" | "outcome" | "durationMilliseconds" | "responseBytes" | "responseExcerpt">>) => ProviderRequestTrace;
    new: (partial: Partial<ProviderRequestTrace> & Required<Omit<ProviderRequestTrace, "providerKey" | "providerContract" | "httpMethod" | "requestPath" | "statusClass" | "outcome" | "durationMilliseconds" | "responseBytes" | "responseExcerpt">>) => ProviderRequestTrace;
    defaults: () => Partial<ProviderRequestTrace>;
}>;
/**
 * One structured SDK log event, as delivered to a diagnostics listener or read
 * back by a flush. Coordinates in event messages are rounded before delivery;
 * raw coordinates at full precision and API keys are never included.
 */
export type LogEvent = {
    /**
     * Wall-clock milliseconds since the Unix epoch, as the buffer recorded the
     * event.
     */
    timestampMillisecondsSinceEpoch: bigint;
    /**
     * The event's severity.
     */
    severity: SdkLogSeverity;
    /**
     * The named per-subsystem target that logged it, for example
     * `tile_fetch`.
     */
    subsystemTarget: string;
    /**
     * The one-line already-scrubbed message.
     */
    messageLine: string;
    /**
     * The typed request facts when this event reports a completed provider
     * call; `None` for every other event.
     */
    providerRequestTrace?: ProviderRequestTrace;
};
/**
 * Generated factory for {@link LogEvent} record objects.
 */
export declare const LogEvent: Readonly<{
    create: (partial: Partial<LogEvent> & Required<Omit<LogEvent, "timestampMillisecondsSinceEpoch" | "severity" | "subsystemTarget" | "messageLine" | "providerRequestTrace">>) => LogEvent;
    new: (partial: Partial<LogEvent> & Required<Omit<LogEvent, "timestampMillisecondsSinceEpoch" | "severity" | "subsystemTarget" | "messageLine" | "providerRequestTrace">>) => LogEvent;
    defaults: () => Partial<LogEvent>;
}>;
/**
 * Which overlay shape an overlay descriptor configures.
 */
export declare enum MapOverlayKind {
    /**
     * A routed path drawn as a thick line.
     */
    RoutePolyline = 0,
    /**
     * A filled polygon: one outer ring, ear-clip triangulated.
     */
    FilledPolygon = 1,
    /**
     * Screen-facing point markers (octagon fans).
     */
    PointMarkers = 2,
    /**
     * Congestion-colored traffic-flow lines.
     */
    TrafficFlow = 3,
    /**
     * Screen-facing teardrop pins anchored at their tip with a hollow head
     * center (the A/B route-endpoint marker); uses `PointMarkers`' payload
     * fields.
     */
    PointPins = 4
}
/**
 * Congestion classification of a road segment.
 */
export declare enum TrafficFlowCongestionLevel {
    /**
     * At or above free-flow speed.
     */
    FreeFlow = 0,
    /**
     * Moderately below free-flow speed.
     */
    Slow = 1,
    /**
     * Stop-and-go traffic.
     */
    Congested = 2,
    /**
     * Roadway effectively closed.
     */
    Blocked = 3
}
/**
 * Flow condition for one road segment (or polyline of road segments) inside
 * the queried box, in kilometers per hour when the provider reports speeds
 * and as a congestion classification otherwise.
 */
export type TrafficFlowData = {
    /**
     * Segment geometry, ordered along the road.
     */
    shapeCoordinates: Array<GeographicCoordinate>;
    /**
     * Currently observed speed in kilometers per hour, when reported.
     */
    currentSpeedKilometersPerHour?: number;
    /**
     * Unconstrained (free-flow) speed in kilometers per hour, when reported.
     */
    freeFlowSpeedKilometersPerHour?: number;
    /**
     * Congestion classification from the speed ratio or provider buckets.
     */
    congestionLevel: TrafficFlowCongestionLevel;
};
/**
 * Generated factory for {@link TrafficFlowData} record objects.
 */
export declare const TrafficFlowData: Readonly<{
    create: (partial: Partial<TrafficFlowData> & Required<Omit<TrafficFlowData, "shapeCoordinates" | "currentSpeedKilometersPerHour" | "freeFlowSpeedKilometersPerHour" | "congestionLevel">>) => TrafficFlowData;
    new: (partial: Partial<TrafficFlowData> & Required<Omit<TrafficFlowData, "shapeCoordinates" | "currentSpeedKilometersPerHour" | "freeFlowSpeedKilometersPerHour" | "congestionLevel">>) => TrafficFlowData;
    defaults: () => Partial<TrafficFlowData>;
}>;
/**
 * One overlay shape drawn over the map surface's tiles in every frame,
 * selected by `kind`. Each kind reads exactly its own payload fields and
 * ignores the others. A descriptor whose kind-required payload is absent, or
 * whose style field is unusable, rejects the whole `set_overlays` call and
 * keeps the previous list in force. Absent style fields keep the documented
 * default style; present style fields must be usable (channels in `[0, 1]`,
 * widths and radii positive and finite).
 */
export type MapOverlay = {
    /**
     * Which overlay shape this descriptor configures and which payload fields
     * carry it.
     */
    kind: MapOverlayKind;
    /**
     * `RoutePolyline`: the traversal-order polyline; consecutive equal
     * coordinates skip their degenerate segment. Required for the kind.
     */
    coordinates?: Array<GeographicCoordinate>;
    /**
     * Route polyline, filled polygon and point markers: solid color override,
     * or null for the kind's documented default.
     */
    rgbaColor?: OverlayColor;
    /**
     * Route polyline and traffic flow: line width in screen pixels (positive
     * and finite), or null for the kind's documented default.
     */
    widthPixels?: number;
    /**
     * `FilledPolygon`: the outer ring in traversal order without a repeated
     * closing vertex (a repeated one is tolerated and dropped). Required for
     * the kind.
     */
    ringCoordinates?: Array<GeographicCoordinate>;
    /**
     * `PointMarkers` and `PointPins`: the geographic anchor of every marker (a
     * pin's anchor is its tip). Required for both kinds.
     */
    pointMarkerPositions?: Array<GeographicCoordinate>;
    /**
     * `PointMarkers` and `PointPins`: marker radius in screen pixels (positive
     * and finite), or null for the documented default. A pin's radius is its
     * head radius.
     */
    pointMarkerRadiusPixels?: number;
    /**
     * `TrafficFlow`: the flow observations to paint, one per road segment (or
     * polyline of segments), colored by `congestion_level`; the same
     * `TrafficFlowData` records `fetch_traffic_flow` returns. Required for the
     * kind.
     */
    trafficFlowSegments?: Array<TrafficFlowData>;
};
/**
 * Generated factory for {@link MapOverlay} record objects.
 */
export declare const MapOverlay: Readonly<{
    create: (partial: Partial<MapOverlay> & Required<Omit<MapOverlay, "rgbaColor" | "kind" | "coordinates" | "widthPixels" | "ringCoordinates" | "pointMarkerPositions" | "pointMarkerRadiusPixels" | "trafficFlowSegments">>) => MapOverlay;
    new: (partial: Partial<MapOverlay> & Required<Omit<MapOverlay, "rgbaColor" | "kind" | "coordinates" | "widthPixels" | "ringCoordinates" | "pointMarkerPositions" | "pointMarkerRadiusPixels" | "trafficFlowSegments">>) => MapOverlay;
    defaults: () => Partial<MapOverlay>;
}>;
/**
 * Instruction payload of the maneuver after the active one (the "then"
 * instruction), text-carrying only.
 */
export type UpcomingManeuverInstruction = {
    /**
     * Composed display and speech text of the following step.
     */
    instruction: ManeuverInstructionText;
    /**
     * Structured exit index when the following step is a roundabout.
     */
    roundaboutExitIndex?: number;
};
/**
 * Generated factory for {@link UpcomingManeuverInstruction} record objects.
 */
export declare const UpcomingManeuverInstruction: Readonly<{
    create: (partial: Partial<UpcomingManeuverInstruction> & Required<Omit<UpcomingManeuverInstruction, "instruction" | "roundaboutExitIndex">>) => UpcomingManeuverInstruction;
    new: (partial: Partial<UpcomingManeuverInstruction> & Required<Omit<UpcomingManeuverInstruction, "instruction" | "roundaboutExitIndex">>) => UpcomingManeuverInstruction;
    defaults: () => Partial<UpcomingManeuverInstruction>;
}>;
/**
 * The emitted turn-by-turn instruction payload for one trip state; the same
 * state yields the same payload on every read.
 */
export type NavigationInstruction = {
    /**
     * The banner maneuver currently being traversed.
     */
    activeManeuver: ActiveManeuverInstruction;
    /**
     * The maneuver after the active one, where the route has a following step
     * (always null on the route's final step and after arrival).
     */
    upcomingManeuver?: UpcomingManeuverInstruction;
    /**
     * True exactly while the trip has arrived and the remaining progress is
     * zero.
     */
    isArrival: boolean;
    /**
     * True exactly while the trip is off route: the payload beneath the marker
     * is the held last-on-route projection, whose distance phrase is suppressed
     * rather than presented, and must not be presented as current guidance.
     */
    isReroutingRequired: boolean;
};
/**
 * Generated factory for {@link NavigationInstruction} record objects.
 */
export declare const NavigationInstruction: Readonly<{
    create: (partial: Partial<NavigationInstruction> & Required<Omit<NavigationInstruction, "activeManeuver" | "upcomingManeuver" | "isArrival" | "isReroutingRequired">>) => NavigationInstruction;
    new: (partial: Partial<NavigationInstruction> & Required<Omit<NavigationInstruction, "activeManeuver" | "upcomingManeuver" | "isArrival" | "isReroutingRequired">>) => NavigationInstruction;
    defaults: () => Partial<NavigationInstruction>;
}>;
/**
 * One raw position fix delivered to the navigation controller.
 */
export type NavigationLocationUpdate = {
    /**
     * Raw position on the WGS 84 ellipsoid, before route snapping.
     */
    coordinate: GeographicCoordinate;
    /**
     * Radius, in meters, of the 68% horizontal-accuracy envelope of this fix
     * (null when the source does not report accuracy).
     */
    horizontalAccuracyMeters?: number;
    /**
     * Direction of travel in degrees clockwise from true north (null when the
     * source does not report a course).
     */
    courseHeadingDegrees?: number;
    /**
     * Fix instant in seconds since the Unix epoch (null for untimed sources).
     */
    timestampSeconds?: number;
};
/**
 * Generated factory for {@link NavigationLocationUpdate} record objects.
 */
export declare const NavigationLocationUpdate: Readonly<{
    create: (partial: Partial<NavigationLocationUpdate> & Required<Omit<NavigationLocationUpdate, "coordinate" | "courseHeadingDegrees" | "horizontalAccuracyMeters" | "timestampSeconds">>) => NavigationLocationUpdate;
    new: (partial: Partial<NavigationLocationUpdate> & Required<Omit<NavigationLocationUpdate, "coordinate" | "courseHeadingDegrees" | "horizontalAccuracyMeters" | "timestampSeconds">>) => NavigationLocationUpdate;
    defaults: () => Partial<NavigationLocationUpdate>;
}>;
/**
 * A world position in normalized world coordinates, both axes within
 * `[0, 1]`.
 */
export type NormalizedWorldCoordinate = {
    /**
     * Eastward position from the antimeridian.
     */
    x: number;
    /**
     * Southward position from the north pole.
     */
    y: number;
};
/**
 * Generated factory for {@link NormalizedWorldCoordinate} record objects.
 */
export declare const NormalizedWorldCoordinate: Readonly<{
    create: (partial: Partial<NormalizedWorldCoordinate> & Required<Omit<NormalizedWorldCoordinate, "x" | "y">>) => NormalizedWorldCoordinate;
    new: (partial: Partial<NormalizedWorldCoordinate> & Required<Omit<NormalizedWorldCoordinate, "x" | "y">>) => NormalizedWorldCoordinate;
    defaults: () => Partial<NormalizedWorldCoordinate>;
}>;
/**
 * Structural precision a geocoder reached for one resolved location.
 */
export declare enum GeocodeQuality {
    /**
     * Rooftop or feature point.
     */
    Point = 0,
    /**
     * Street address matched to the building level.
     */
    StreetAddress = 1,
    /**
     * Street intersection.
     */
    Intersection = 2,
    /**
     * Street level without house number.
     */
    Street = 3,
    /**
     * Postal code area.
     */
    PostalCode = 4,
    /**
     * Settlement level (village, town, city).
     */
    City = 5,
    /**
     * County or administrative district.
     */
    County = 6,
    /**
     * First-level administrative division.
     */
    State = 7,
    /**
     * Sovereign country level.
     */
    Country = 8
}
/**
 * One resolved location returned by forward or reverse geocoding.
 */
export type Place = {
    /**
     * Display string the provider produced for this place.
     */
    structuredAddressText: string;
    /**
     * Resolved position.
     */
    coordinate: GeographicCoordinate;
    /**
     * Structural precision reached for this resolution.
     */
    geocodeQuality: GeocodeQuality;
};
/**
 * Generated factory for {@link Place} record objects.
 */
export declare const Place: Readonly<{
    create: (partial: Partial<Place> & Required<Omit<Place, "coordinate" | "structuredAddressText" | "geocodeQuality">>) => Place;
    new: (partial: Partial<Place> & Required<Omit<Place, "coordinate" | "structuredAddressText" | "geocodeQuality">>) => Place;
    defaults: () => Partial<Place>;
}>;
/**
 * One device position report: a coordinate with the source's optional
 * accuracy, course and timestamp.
 */
export type PositionFix = {
    /**
     * The reported coordinate on the WGS 84 ellipsoid.
     */
    coordinate: GeographicCoordinate;
    /**
     * Radius in meters of the 68% horizontal-accuracy envelope, when the
     * source reports one.
     */
    horizontalAccuracyMeters?: number;
    /**
     * Direction of travel in degrees clockwise from true north, when the
     * source reports one.
     */
    courseHeadingDegrees?: number;
    /**
     * The fix's instant in seconds since the Unix epoch, when the source
     * reports one.
     */
    timestampSeconds?: number;
};
/**
 * Generated factory for {@link PositionFix} record objects.
 */
export declare const PositionFix: Readonly<{
    create: (partial: Partial<PositionFix> & Required<Omit<PositionFix, "coordinate" | "courseHeadingDegrees" | "horizontalAccuracyMeters" | "timestampSeconds">>) => PositionFix;
    new: (partial: Partial<PositionFix> & Required<Omit<PositionFix, "coordinate" | "courseHeadingDegrees" | "horizontalAccuracyMeters" | "timestampSeconds">>) => PositionFix;
    defaults: () => Partial<PositionFix>;
}>;
/**
 * Which shape of foreign provider failure a diagnostic captured.
 */
export declare enum ProviderFailureClassification {
    /**
     * The foreign implementation failed without a mapped error, for example by
     * throwing an exception the contract does not define. The failure text is
     * the binding runtime's verbatim reason for it.
     */
    UnclassifiedCallbackFailure = 0,
    /**
     * The foreign implementation threw one of the contract's `SdkError`
     * variants, which is carried as a typed error: the failure text is the thrown error's
     * verbatim display form.
     */
    MappedContractError = 1
}
/**
 * One failed provider call made by a foreign provider implementation, as
 * retained by `MapSdk::latest_provider_failure_diagnostics`. Everything here is
 * known at the boundary where the foreign implementation is called; no data is
 * invented beyond that.
 */
export type ProviderFailureDiagnostic = {
    /**
     * Wall-clock milliseconds since the Unix epoch, as the failure was
     * recorded.
     */
    timestampMillisecondsSinceEpoch: bigint;
    /**
     * Which failure shape this entry captured.
     */
    failureClassification: ProviderFailureClassification;
    /**
     * The provider contract the foreign code implements, for example
     * `GeocodingProvider`.
     */
    providerContractName: string;
    /**
     * The contract method whose call failed, for example `forward_geocode`.
     */
    providerMethodName: string;
    /**
     * The verbatim failure text: the binding runtime's reason for the
     * unclassified shape, or the thrown error's display form for the mapped
     * shape.
     */
    failureDetail: string;
};
/**
 * Generated factory for {@link ProviderFailureDiagnostic} record objects.
 */
export declare const ProviderFailureDiagnostic: Readonly<{
    create: (partial: Partial<ProviderFailureDiagnostic> & Required<Omit<ProviderFailureDiagnostic, "timestampMillisecondsSinceEpoch" | "failureClassification" | "providerContractName" | "providerMethodName" | "failureDetail">>) => ProviderFailureDiagnostic;
    new: (partial: Partial<ProviderFailureDiagnostic> & Required<Omit<ProviderFailureDiagnostic, "timestampMillisecondsSinceEpoch" | "failureClassification" | "providerContractName" | "providerMethodName" | "failureDetail">>) => ProviderFailureDiagnostic;
    defaults: () => Partial<ProviderFailureDiagnostic>;
}>;
/**
 * One capability whose provider can be chosen independently of every other.
 *
 * Every capability owns one registry slot, so an application may serve
 * geocoding from one provider, routing from another and tiles from a third.
 * A capability with no installed provider answers calls with
 * `ProviderNotConfigured`.
 */
export declare enum ProviderContract {
    /**
     * Forward and reverse address lookup.
     */
    Geocoding = 0,
    /**
     * Route calculation through ordered waypoints.
     */
    Routing = 1,
    /**
     * Travel-time and distance matrix calculation.
     */
    DistanceMatrix = 2,
    /**
     * Place prediction and lookup by free text.
     */
    PlaceSearch = 3,
    /**
     * Traffic incident reports.
     */
    TrafficIncidents = 4,
    /**
     * Traffic flow (speed and congestion) along road segments.
     */
    TrafficFlow = 5,
    /**
     * Terrain elevation lookup.
     */
    Elevation = 6,
    /**
     * Raster map imagery.
     */
    RasterTiles = 7,
    /**
     * Vector map tiles.
     */
    VectorTiles = 8,
    /**
     * Route calculation on a compiled offline graph.
     */
    OfflineRouting = 9
}
/**
 * Which provider serves one capability, as reported by
 * `MapSdk::provider_registrations`.
 */
export type ProviderRegistration = {
    /**
     * The capability this entry describes.
     */
    contract: ProviderContract;
    /**
     * The provider's stable registry key, or an empty string when no
     * provider is installed for the capability.
     */
    providerKey: string;
    /**
     * The provider's display name from the shared registry, or an empty
     * string when no provider is installed.
     */
    displayName: string;
    /**
     * Whether a provider is installed for the capability.
     */
    registered: boolean;
};
/**
 * Generated factory for {@link ProviderRegistration} record objects.
 */
export declare const ProviderRegistration: Readonly<{
    create: (partial: Partial<ProviderRegistration> & Required<Omit<ProviderRegistration, "providerKey" | "contract" | "displayName" | "registered">>) => ProviderRegistration;
    new: (partial: Partial<ProviderRegistration> & Required<Omit<ProviderRegistration, "providerKey" | "contract" | "displayName" | "registered">>) => ProviderRegistration;
    defaults: () => Partial<ProviderRegistration>;
}>;
/**
 * A vector base map served by a provider configured through
 * `MapSdk.configure_provider_set`. Native bindings also accept a provider
 * registered from foreign code through
 * `MapSdk.register_vector_tile_provider_from_foreign`; the WebAssembly
 * surface has no foreign-registration seam. The provider supplies its own
 * tileset name, attribution line and zoom span; you choose only the provider
 * and the built-in style the base paints with.
 *
 * Installing a provider-backed base requires the vector-tile provider to be
 * registered first and the style id to name a committed style whose schema
 * matches the provider's tiles; otherwise installation throws naming the
 * mismatch and leaves any base already installed in force.
 */
export type ProviderVectorTileSource = {
    /**
     * The provider key that registered the vector-tile provider, as
     * `configure_provider_set` records it. Native bindings also accept
     * `application` for a provider registered from foreign code; the
     * WebAssembly surface has no foreign-registration seam, so a page always
     * names a key it configured. A different installed provider is refused.
     */
    providerKey: string;
    /**
     * The built-in style id the base paints with.
     */
    styleId: string;
};
/**
 * Generated factory for {@link ProviderVectorTileSource} record objects.
 */
export declare const ProviderVectorTileSource: Readonly<{
    create: (partial: Partial<ProviderVectorTileSource> & Required<Omit<ProviderVectorTileSource, "providerKey" | "styleId">>) => ProviderVectorTileSource;
    new: (partial: Partial<ProviderVectorTileSource> & Required<Omit<ProviderVectorTileSource, "providerKey" | "styleId">>) => ProviderVectorTileSource;
    defaults: () => Partial<ProviderVectorTileSource>;
}>;
/**
 * Encoded image formats a raster tile provider may deliver.
 */
export declare enum RasterImageFormat {
    /**
     * PNG imagery.
     */
    Png = 0,
    /**
     * JPEG imagery.
     */
    Jpeg = 1
}
/**
 * Pixel resolution a raster tile is rendered at; `Standard` is the plain
 * tile form, `Retina` the `@2x` form with twice the texels per edge for the
 * same logical tile span.
 */
export declare enum RasterTileResolution {
    /**
     * One texel per logical tile pixel.
     */
    Standard = 0,
    /**
     * Twice the texels per logical tile pixel (the `@2x` request form).
     */
    Retina = 1
}
/**
 * One fetched web-mercator XYZ raster tile.
 */
export type RasterTileData = {
    /**
     * Tile column coordinate at the given zoom level.
     */
    tileX: number;
    /**
     * Tile row coordinate at the given zoom level.
     */
    tileY: number;
    /**
     * Zoom level this tile belongs to.
     */
    zoomLevel: number;
    /**
     * Encoding of the byte payload.
     */
    imageFormat: RasterImageFormat;
    /**
     * Pixel resolution the payload was rendered at.
     */
    tileResolution: RasterTileResolution;
    /**
     * Encoded image bytes.
     */
    imageBytes: Array<number>;
};
/**
 * Generated factory for {@link RasterTileData} record objects.
 */
export declare const RasterTileData: Readonly<{
    create: (partial: Partial<RasterTileData> & Required<Omit<RasterTileData, "tileX" | "tileY" | "zoomLevel" | "imageFormat" | "tileResolution" | "imageBytes">>) => RasterTileData;
    new: (partial: Partial<RasterTileData> & Required<Omit<RasterTileData, "tileX" | "tileY" | "zoomLevel" | "imageFormat" | "tileResolution" | "imageBytes">>) => RasterTileData;
    defaults: () => Partial<RasterTileData>;
}>;
/**
 * One offline region selection: the identity the region is stored and managed
 * under, the area it covers, the zoom range and tile form the stored tiles
 * carry, and the retention the application requests.
 */
export type RegionDefinition = {
    /**
     * Stable identifier the region is stored and managed under; downloading
     * the same identifier again is idempotent, and a redefined shape replaces
     * the stored region.
     */
    regionId: string;
    /**
     * Human-readable name for region-listing surfaces.
     */
    displayName: string;
    /**
     * The region's bounding box; boxes never span the antimeridian.
     */
    boundingBox: BoundingBox;
    /**
     * Lowest zoom level downloaded; ranges download coarse-first.
     */
    minimumZoomLevel: number;
    /**
     * Highest zoom level downloaded.
     */
    maximumZoomLevel: number;
    /**
     * Encoded format the stored tile payloads carry.
     */
    imageFormat: RasterImageFormat;
    /**
     * Pixel resolution the stored tile payloads carry.
     */
    tileResolution: RasterTileResolution;
    /**
     * Requested retention in seconds; null takes the raster-tiles category
     * default, clamped to the provider's declared ceiling. Zero is refused.
     */
    timeToLiveSeconds?: bigint;
};
/**
 * Generated factory for {@link RegionDefinition} record objects.
 */
export declare const RegionDefinition: Readonly<{
    create: (partial: Partial<RegionDefinition> & Required<Omit<RegionDefinition, "displayName" | "imageFormat" | "tileResolution" | "regionId" | "boundingBox" | "minimumZoomLevel" | "maximumZoomLevel" | "timeToLiveSeconds">>) => RegionDefinition;
    new: (partial: Partial<RegionDefinition> & Required<Omit<RegionDefinition, "displayName" | "imageFormat" | "tileResolution" | "regionId" | "boundingBox" | "minimumZoomLevel" | "maximumZoomLevel" | "timeToLiveSeconds">>) => RegionDefinition;
    defaults: () => Partial<RegionDefinition>;
}>;
/**
 * The phase of one region download.
 */
export declare enum RegionDownloadPhase {
    /**
     * The download is running; progress reports carry the counts so far.
     */
    Downloading = 0,
    /**
     * The download finished with every member tile present.
     */
    Completed = 1,
    /**
     * The application cancelled the download; the partial region is kept and
     * resumable.
     */
    Cancelled = 2,
    /**
     * The download stopped on a failure after keeping the partial region.
     */
    Failed = 3
}
/**
 * One progress report of a region download.
 */
export type RegionDownloadProgress = {
    /**
     * The region this report belongs to.
     */
    regionId: string;
    /**
     * Tiles the region enumerates.
     */
    totalTileCount: bigint;
    /**
     * Tiles downloaded and refreshed so far.
     */
    completedTileCount: bigint;
    /**
     * Completed tiles the provider had to fetch.
     */
    networkFetchedTileCount: bigint;
    /**
     * Completed tiles the store already held.
     */
    diskServedTileCount: bigint;
    /**
     * The phase this report describes.
     */
    phase: RegionDownloadPhase;
};
/**
 * Generated factory for {@link RegionDownloadProgress} record objects.
 */
export declare const RegionDownloadProgress: Readonly<{
    create: (partial: Partial<RegionDownloadProgress> & Required<Omit<RegionDownloadProgress, "regionId" | "totalTileCount" | "completedTileCount" | "networkFetchedTileCount" | "diskServedTileCount" | "phase">>) => RegionDownloadProgress;
    new: (partial: Partial<RegionDownloadProgress> & Required<Omit<RegionDownloadProgress, "regionId" | "totalTileCount" | "completedTileCount" | "networkFetchedTileCount" | "diskServedTileCount" | "phase">>) => RegionDownloadProgress;
    defaults: () => Partial<RegionDownloadProgress>;
}>;
/**
 * One offline region as it stands on disk: the stored shape, the effective
 * retention and the live tiles among its members.
 */
export type RegionRecord = {
    /**
     * The region's identifier.
     */
    regionId: string;
    /**
     * The region's display name.
     */
    displayName: string;
    /**
     * The recorded area the region covers.
     */
    boundingBox: BoundingBox;
    /**
     * The recorded lowest zoom level.
     */
    minimumZoomLevel: number;
    /**
     * The recorded highest zoom level.
     */
    maximumZoomLevel: number;
    /**
     * The recorded encoded format.
     */
    imageFormat: RasterImageFormat;
    /**
     * The recorded pixel resolution.
     */
    tileResolution: RasterTileResolution;
    /**
     * The retention the region's entries carry, in seconds: the requested
     * value or the category default, clamped to the provider's ceiling.
     */
    effectiveTimeToLiveSeconds: bigint;
    /**
     * Tile fingerprints the region claims membership for.
     */
    memberTileCount: bigint;
    /**
     * Members whose entries are live on disk right now.
     */
    presentTileCount: bigint;
    /**
     * Payload bytes of the live members.
     */
    presentPayloadBytes: bigint;
};
/**
 * Generated factory for {@link RegionRecord} record objects.
 */
export declare const RegionRecord: Readonly<{
    create: (partial: Partial<RegionRecord> & Required<Omit<RegionRecord, "presentTileCount" | "displayName" | "imageFormat" | "tileResolution" | "regionId" | "boundingBox" | "minimumZoomLevel" | "maximumZoomLevel" | "effectiveTimeToLiveSeconds" | "memberTileCount" | "presentPayloadBytes">>) => RegionRecord;
    new: (partial: Partial<RegionRecord> & Required<Omit<RegionRecord, "presentTileCount" | "displayName" | "imageFormat" | "tileResolution" | "regionId" | "boundingBox" | "minimumZoomLevel" | "maximumZoomLevel" | "effectiveTimeToLiveSeconds" | "memberTileCount" | "presentPayloadBytes">>) => RegionRecord;
    defaults: () => Partial<RegionRecord>;
}>;
/**
 * What a region's explicit deletion removed.
 */
export type RegionRemovalReport = {
    /**
     * Tile entries deleted; never a tile another live region still claims.
     */
    removedEntryCount: bigint;
    /**
     * Payload bytes those entries carried.
     */
    removedPayloadBytes: bigint;
};
/**
 * Generated factory for {@link RegionRemovalReport} record objects.
 */
export declare const RegionRemovalReport: Readonly<{
    create: (partial: Partial<RegionRemovalReport> & Required<Omit<RegionRemovalReport, "removedEntryCount" | "removedPayloadBytes">>) => RegionRemovalReport;
    new: (partial: Partial<RegionRemovalReport> & Required<Omit<RegionRemovalReport, "removedEntryCount" | "removedPayloadBytes">>) => RegionRemovalReport;
    defaults: () => Partial<RegionRemovalReport>;
}>;
/**
 * The reroute-recalculation hysteresis policy of a navigation controller.
 * Both thresholds must be finite and non-negative; the controller refuses
 * otherwise (`InvalidNavigationInput`), leaving the policy in force untouched.
 */
export type ReroutePolicy = {
    /**
     * Minimum wall-clock seconds between the beginnings of two reroute
     * calculations (the SDK default: 5).
     */
    recalculationCooldownSeconds: number;
    /**
     * Minimum displacement, in meters, between the raw position fix current at
     * a calculation's beginning and the one current at the previous
     * calculation's beginning (the SDK default: 50).
     */
    recalculationMovementMeters: number;
};
/**
 * Generated factory for {@link ReroutePolicy} record objects.
 */
export declare const ReroutePolicy: Readonly<{
    create: (partial: Partial<ReroutePolicy> & Required<Omit<ReroutePolicy, "recalculationCooldownSeconds" | "recalculationMovementMeters">>) => ReroutePolicy;
    new: (partial: Partial<ReroutePolicy> & Required<Omit<ReroutePolicy, "recalculationCooldownSeconds" | "recalculationMovementMeters">>) => ReroutePolicy;
    defaults: () => Partial<ReroutePolicy>;
}>;
/**
 * One maneuver within a route leg.
 */
export type RouteStep = {
    /**
     * Distance of this step in meters.
     */
    distanceMeters: number;
    /**
     * Travel time of this step in seconds.
     */
    durationSeconds: number;
    /**
     * Maneuver classification as a stable snake-case label. The roundabout
     * exit index (one-based) and the turn direction are part of the label,
     * for example `roundabout-2` or `turn-left`.
     */
    maneuverType: string;
    /**
     * Human-readable instruction in the display language.
     */
    instructionDisplayText: string;
    /**
     * Instruction tuned for text-to-speech engines.
     */
    instructionSpeechText: string;
    /**
     * Step geometry from the previous step end to this maneuver point.
     */
    shape: Array<GeographicCoordinate>;
};
/**
 * Generated factory for {@link RouteStep} record objects.
 */
export declare const RouteStep: Readonly<{
    create: (partial: Partial<RouteStep> & Required<Omit<RouteStep, "distanceMeters" | "durationSeconds" | "maneuverType" | "instructionDisplayText" | "instructionSpeechText" | "shape">>) => RouteStep;
    new: (partial: Partial<RouteStep> & Required<Omit<RouteStep, "distanceMeters" | "durationSeconds" | "maneuverType" | "instructionDisplayText" | "instructionSpeechText" | "shape">>) => RouteStep;
    defaults: () => Partial<RouteStep>;
}>;
/**
 * Leg between two consecutive waypoints.
 */
export type RouteLeg = {
    /**
     * Leg distance in meters.
     */
    distanceMeters: number;
    /**
     * Leg travel time in seconds.
     */
    durationSeconds: number;
    /**
     * Maneuver steps in traversal order.
     */
    steps: Array<RouteStep>;
};
/**
 * Generated factory for {@link RouteLeg} record objects.
 */
export declare const RouteLeg: Readonly<{
    create: (partial: Partial<RouteLeg> & Required<Omit<RouteLeg, "distanceMeters" | "durationSeconds" | "steps">>) => RouteLeg;
    new: (partial: Partial<RouteLeg> & Required<Omit<RouteLeg, "distanceMeters" | "durationSeconds" | "steps">>) => RouteLeg;
    defaults: () => Partial<RouteLeg>;
}>;
/**
 * A complete calculated route.
 */
export type Route = {
    /**
     * Total distance across all legs, in meters.
     */
    distanceMeters: number;
    /**
     * Total travel time across all legs, in seconds.
     */
    durationSeconds: number;
    /**
     * Geographic bounds of the full route geometry.
     */
    boundingBox: BoundingBox;
    /**
     * The full route geometry in traversal order, one point per shape vertex
     * the provider returned. A provider that reports only per-step shapes
     * leaves this empty and the steps carry the geometry instead.
     */
    geometry: Array<GeographicCoordinate>;
    /**
     * Legs, one per consecutive waypoint pair.
     */
    legs: Array<RouteLeg>;
};
/**
 * Generated factory for {@link Route} record objects.
 */
export declare const Route: Readonly<{
    create: (partial: Partial<Route> & Required<Omit<Route, "distanceMeters" | "durationSeconds" | "boundingBox" | "geometry" | "legs">>) => Route;
    new: (partial: Partial<Route> & Required<Omit<Route, "distanceMeters" | "durationSeconds" | "boundingBox" | "geometry" | "legs">>) => Route;
    defaults: () => Partial<Route>;
}>;
/**
 * Mode of transport used to calculate a route.
 */
export declare enum TransportationMode {
    /**
     * Private car routing.
     */
    Automobile = 0,
    /**
     * Bicycle routing.
     */
    Bicycle = 1,
    /**
     * Walking routing.
     */
    Pedestrian = 2
}
/**
 * Which transport modes and which route strategy the serving routing
 * provider can honour, as reported by `MapSdk::route_capabilities`.
 *
 * The SDK can express three transport modes and two strategies, but a
 * provider may not serve all of them. A surface reads this answer so it can
 * disable a choice it cannot serve with a reason, instead of sending the
 * request and receiving a route from a path the reader did not ask for.
 */
export type RouteCapabilities = {
    /**
     * The transport modes the provider can route for.
     */
    supportedTransportationModes: Array<TransportationMode>;
    /**
     * Whether the provider can minimize traveled distance instead of travel
     * time for automobile routing.
     */
    supportsShortestRouteStrategy: boolean;
};
/**
 * Generated factory for {@link RouteCapabilities} record objects.
 */
export declare const RouteCapabilities: Readonly<{
    create: (partial: Partial<RouteCapabilities> & Required<Omit<RouteCapabilities, "supportedTransportationModes" | "supportsShortestRouteStrategy">>) => RouteCapabilities;
    new: (partial: Partial<RouteCapabilities> & Required<Omit<RouteCapabilities, "supportedTransportationModes" | "supportsShortestRouteStrategy">>) => RouteCapabilities;
    defaults: () => Partial<RouteCapabilities>;
}>;
/**
 * What a routing request optimizes for. The strategy applies to automobile
 * routing only.
 */
export declare enum RouteStrategy {
    /**
     * Minimize expected travel time.
     */
    Fastest = 0,
    /**
     * Minimize traveled distance.
     */
    Shortest = 1
}
/**
 * Length and speed conventions used when displaying a route.
 */
export declare enum UnitSystem {
    /**
     * Kilometers and kilometers per hour.
     */
    Metric = 0,
    /**
     * Miles and miles per hour.
     */
    Imperial = 1
}
/**
 * Options controlling how a route is calculated.
 */
export type RouteOptions = {
    /**
     * Mode of transport.
     */
    transportationMode: TransportationMode;
    /**
     * Whether routing optimizes travel time or distance.
     */
    routeStrategy: RouteStrategy;
    /**
     * Display unit convention the provider should annotate.
     */
    unitSystem: UnitSystem;
    /**
     * Features to avoid.
     */
    avoidOptions: AvoidOptions;
    /**
     * Departure instant as seconds since the Unix epoch; null for
     * "depart now".
     */
    departureTimestampSeconds?: bigint;
};
/**
 * Generated factory for {@link RouteOptions} record objects.
 */
export declare const RouteOptions: Readonly<{
    create: (partial: Partial<RouteOptions> & Required<Omit<RouteOptions, "transportationMode" | "routeStrategy" | "unitSystem" | "avoidOptions" | "departureTimestampSeconds">>) => RouteOptions;
    new: (partial: Partial<RouteOptions> & Required<Omit<RouteOptions, "transportationMode" | "routeStrategy" | "unitSystem" | "avoidOptions" | "departureTimestampSeconds">>) => RouteOptions;
    defaults: () => Partial<RouteOptions>;
}>;
/**
 * Location of one route step in traversal order across a route's legs.
 */
export type RouteStepPosition = {
    /**
     * Index of the leg that owns this step in the route's legs.
     */
    legIndex: bigint;
    /**
     * Index of the step within its leg in the leg's steps.
     */
    stepIndex: bigint;
};
/**
 * Generated factory for {@link RouteStepPosition} record objects.
 */
export declare const RouteStepPosition: Readonly<{
    create: (partial: Partial<RouteStepPosition> & Required<Omit<RouteStepPosition, "legIndex" | "stepIndex">>) => RouteStepPosition;
    new: (partial: Partial<RouteStepPosition> & Required<Omit<RouteStepPosition, "legIndex" | "stepIndex">>) => RouteStepPosition;
    defaults: () => Partial<RouteStepPosition>;
}>;
/**
 * Position on the viewport in physical pixels (origin top-left, y down).
 */
export type ScreenPoint = {
    /**
     * Horizontal position in pixels.
     */
    x: number;
    /**
     * Vertical position in pixels.
     */
    y: number;
};
/**
 * Generated factory for {@link ScreenPoint} record objects.
 */
export declare const ScreenPoint: Readonly<{
    create: (partial: Partial<ScreenPoint> & Required<Omit<ScreenPoint, "x" | "y">>) => ScreenPoint;
    new: (partial: Partial<ScreenPoint> & Required<Omit<ScreenPoint, "x" | "y">>) => ScreenPoint;
    defaults: () => Partial<ScreenPoint>;
}>;
/**
 * One position of a simulated trip along the planned route's own polyline.
 */
export type SimulatedTripFix = {
    /**
     * Position on the planned route's geometry.
     */
    coordinate: GeographicCoordinate;
    /**
     * Direction of travel along the active segment, in degrees clockwise
     * from true north, or null when the route has no segment.
     */
    courseHeadingDegrees?: number;
    /**
     * Distance travelled from the route start, in meters.
     */
    travelledMeters: number;
    /**
     * Distance left to the route end, in meters.
     */
    remainingMeters: number;
    /**
     * Simulated elapsed time from the trip start, in seconds.
     */
    elapsedSeconds: number;
    /**
     * True exactly when the fix sits at the route's final coordinate.
     */
    isArrived: boolean;
};
/**
 * Generated factory for {@link SimulatedTripFix} record objects.
 */
export declare const SimulatedTripFix: Readonly<{
    create: (partial: Partial<SimulatedTripFix> & Required<Omit<SimulatedTripFix, "coordinate" | "courseHeadingDegrees" | "travelledMeters" | "remainingMeters" | "elapsedSeconds" | "isArrived">>) => SimulatedTripFix;
    new: (partial: Partial<SimulatedTripFix> & Required<Omit<SimulatedTripFix, "coordinate" | "courseHeadingDegrees" | "travelledMeters" | "remainingMeters" | "elapsedSeconds" | "isArrived">>) => SimulatedTripFix;
    defaults: () => Partial<SimulatedTripFix>;
}>;
/**
 * Pace chosen by the application for a simulated trip. No default pace exists;
 * every application picks its own values. Both values must be finite and
 * strictly positive, and their product must stay finite.
 */
export type SimulatedTripPace = {
    /**
     * Baseline travel speed in meters per second.
     */
    speedMetersPerSecond: number;
    /**
     * Multiplier applied to the baseline speed (for example 1, 2, 4 or 8).
     */
    speedMultiplier: number;
};
/**
 * Generated factory for {@link SimulatedTripPace} record objects.
 */
export declare const SimulatedTripPace: Readonly<{
    create: (partial: Partial<SimulatedTripPace> & Required<Omit<SimulatedTripPace, "speedMetersPerSecond" | "speedMultiplier">>) => SimulatedTripPace;
    new: (partial: Partial<SimulatedTripPace> & Required<Omit<SimulatedTripPace, "speedMetersPerSecond" | "speedMultiplier">>) => SimulatedTripPace;
    defaults: () => Partial<SimulatedTripPace>;
}>;
/**
 * One HTTP header a vector-tile source's requests carry.
 */
export type SourceHeader = {
    /**
     * Header name.
     */
    name: string;
    /**
     * Header value.
     */
    value: string;
};
/**
 * Generated factory for {@link SourceHeader} record objects.
 */
export declare const SourceHeader: Readonly<{
    create: (partial: Partial<SourceHeader> & Required<Omit<SourceHeader, "name" | "value">>) => SourceHeader;
    new: (partial: Partial<SourceHeader> & Required<Omit<SourceHeader, "name" | "value">>) => SourceHeader;
    defaults: () => Partial<SourceHeader>;
}>;
/**
 * What triggered a `SpeechInstruction`.
 */
export declare enum SpeechInstructionKind {
    /**
     * A trigger band was crossed this fix (the moderate or far threshold).
     */
    ManeuverApproach = 0,
    /**
     * The immediate band: the maneuver is imminent.
     */
    ImmediateManeuver = 1,
    /**
     * Guidance just recovered from off route.
     */
    OffRouteRecovery = 2,
    /**
     * The trip arrived.
     */
    Arrival = 3
}
/**
 * When a spoken-trigger event fires and what carries it. The utterance text is
 * the composed speech text verbatim; the SDK decides when a line is
 * newsworthy, while playback and synthesis belong to the platform.
 */
export type SpeechInstruction = {
    /**
     * The verbatim speech text, never rewritten by the trigger policy.
     */
    utteranceSpeechText: string;
    /**
     * The live distance to the maneuver in meters at emission time.
     */
    triggerDistanceMeters: number;
    /**
     * The utterance identity: a stable monotonic id composed at emission,
     * strictly increasing over every line the controller has emitted since
     * construction and never reused. Identical text re-emitted receives a new
     * id; deduplication and flushing decisions stay with your speaker.
     */
    utteranceId: bigint;
    /**
     * What triggered this line (a crossed band, the immediate band, an
     * off-route recovery, or the trip's arrival).
     */
    instructionKind: SpeechInstructionKind;
};
/**
 * Generated factory for {@link SpeechInstruction} record objects.
 */
export declare const SpeechInstruction: Readonly<{
    create: (partial: Partial<SpeechInstruction> & Required<Omit<SpeechInstruction, "utteranceSpeechText" | "triggerDistanceMeters" | "utteranceId" | "instructionKind">>) => SpeechInstruction;
    new: (partial: Partial<SpeechInstruction> & Required<Omit<SpeechInstruction, "utteranceSpeechText" | "triggerDistanceMeters" | "utteranceId" | "instructionKind">>) => SpeechInstruction;
    defaults: () => Partial<SpeechInstruction>;
}>;
/**
 * Which step-advance strategy a navigation policy configures.
 */
export declare enum StepAdvancePolicyKind {
    /**
     * Steps change only when driven programmatically; the trip still tracks
     * progress. The threshold fields are ignored on this kind.
     */
    Manual = 0,
    /**
     * Advances when the position fix comes within the threshold of the end of
     * the current step (eager advance).
     */
    DistanceToEndOfStep = 1,
    /**
     * Advances when the position fix moves farther from the current step's
     * polyline than the threshold (delayed advance).
     */
    DistanceFromStep = 2
}
/**
 * The step-advance policy of a trip.
 */
export type StepAdvancePolicy = {
    /**
     * Which step-advance strategy the policy configures.
     */
    policyKind: StepAdvancePolicyKind;
    /**
     * Distance, in meters, of the advance threshold (the distance to the
     * step's end, or from the step's polyline, depending on the kind).
     */
    advanceThresholdMeters: number;
    /**
     * Fixes with a reported horizontal accuracy worse than this, in meters,
     * never advance.
     */
    minimumHorizontalAccuracyMeters: number;
};
/**
 * Generated factory for {@link StepAdvancePolicy} record objects.
 */
export declare const StepAdvancePolicy: Readonly<{
    create: (partial: Partial<StepAdvancePolicy> & Required<Omit<StepAdvancePolicy, "policyKind" | "advanceThresholdMeters" | "minimumHorizontalAccuracyMeters">>) => StepAdvancePolicy;
    new: (partial: Partial<StepAdvancePolicy> & Required<Omit<StepAdvancePolicy, "policyKind" | "advanceThresholdMeters" | "minimumHorizontalAccuracyMeters">>) => StepAdvancePolicy;
    defaults: () => Partial<StepAdvancePolicy>;
}>;
/**
 * The platform window surface handle handed to `MapView::attach`: set exactly
 * one platform pointer and leave the rest null. A null-or-ambiguous handle is
 * refused with `InvalidRenderInput`; a null pointer is `u64 0` or null, never
 * a zeroed pointer passed through.
 *
 * The object behind the pointer must outlive the attached view: the raw
 * handles are the caller's validity guarantee, and detach or drop releases the
 * SDK side first, so dropping the platform view before `detach` is a caller
 * bug.
 */
export type SurfaceHandle = {
    /**
     * macOS: pointer to the `NSView` the surface renders into (Metal creates
     * the layer from the view); null on the other platforms.
     */
    appkitViewPointer?: bigint;
    /**
     * iOS: pointer to the `UIView` the surface renders into; null on the other
     * platforms.
     */
    iosViewPointer?: bigint;
    /**
     * Android: pointer to the `ANativeWindow` obtained from the platform
     * `Surface` (`ANativeWindow_fromSurface`); null on the other platforms.
     */
    androidNativeWindowPointer?: bigint;
};
/**
 * Generated factory for {@link SurfaceHandle} record objects.
 */
export declare const SurfaceHandle: Readonly<{
    create: (partial: Partial<SurfaceHandle> & Required<Omit<SurfaceHandle, "appkitViewPointer" | "iosViewPointer" | "androidNativeWindowPointer">>) => SurfaceHandle;
    new: (partial: Partial<SurfaceHandle> & Required<Omit<SurfaceHandle, "appkitViewPointer" | "iosViewPointer" | "androidNativeWindowPointer">>) => SurfaceHandle;
    defaults: () => Partial<SurfaceHandle>;
}>;
/**
 * The installed tile payload cache's exact counters and occupancy, shaped
 * for a diagnostics readback: the hits and misses prove a payload was
 * answered without asking the provider, and the stored bytes show how much
 * the cache holds now.
 */
export type TileCacheStatistics = {
    /**
     * Payload lookups the store answered without a provider request.
     */
    hitCount: bigint;
    /**
     * Payload lookups the store could not answer, including a failed store
     * read that degraded to a provider request.
     */
    missCount: bigint;
    /**
     * Bytes currently stored, or null when the store's occupancy could not
     * be read.
     */
    storedByteCount?: bigint;
};
/**
 * Generated factory for {@link TileCacheStatistics} record objects.
 */
export declare const TileCacheStatistics: Readonly<{
    create: (partial: Partial<TileCacheStatistics> & Required<Omit<TileCacheStatistics, "hitCount" | "missCount" | "storedByteCount">>) => TileCacheStatistics;
    new: (partial: Partial<TileCacheStatistics> & Required<Omit<TileCacheStatistics, "hitCount" | "missCount" | "storedByteCount">>) => TileCacheStatistics;
    defaults: () => Partial<TileCacheStatistics>;
}>;
/**
 * The effective raster-tile caching terms of the installed cache, shaped for
 * display: the default, the provider's ceiling and the value currently in
 * force.
 */
export type TileCacheTerms = {
    /**
     * Time-to-live currently in force on the installed cache, in seconds: the
     * category default, or the last accepted override (clamped to the ceiling
     * when the override exceeded it).
     */
    effectiveTimeToLiveSeconds: bigint;
    /**
     * The installed provider's declared caching-terms ceiling in seconds, or
     * null when the provider declares no ceiling; the requested time-to-live
     * then applies verbatim.
     */
    providerTermsCeilingSeconds?: bigint;
    /**
     * The cache category's default time-to-live for raster tiles, in seconds
     * (thirty days); the value a freshly registered cache starts at.
     */
    defaultTimeToLiveSeconds: bigint;
};
/**
 * Generated factory for {@link TileCacheTerms} record objects.
 */
export declare const TileCacheTerms: Readonly<{
    create: (partial: Partial<TileCacheTerms> & Required<Omit<TileCacheTerms, "effectiveTimeToLiveSeconds" | "providerTermsCeilingSeconds" | "defaultTimeToLiveSeconds">>) => TileCacheTerms;
    new: (partial: Partial<TileCacheTerms> & Required<Omit<TileCacheTerms, "effectiveTimeToLiveSeconds" | "providerTermsCeilingSeconds" | "defaultTimeToLiveSeconds">>) => TileCacheTerms;
    defaults: () => Partial<TileCacheTerms>;
}>;
/**
 * One web-mercator XYZ tile address.
 */
export type TileKey = {
    /**
     * Tile column, in `0..2^zoom_level`.
     */
    tileX: number;
    /**
     * Tile row, counted from the north, in `0..2^zoom_level`.
     */
    tileY: number;
    /**
     * Zoom level this tile belongs to.
     */
    zoomLevel: number;
};
/**
 * Generated factory for {@link TileKey} record objects.
 */
export declare const TileKey: Readonly<{
    create: (partial: Partial<TileKey> & Required<Omit<TileKey, "tileX" | "tileY" | "zoomLevel">>) => TileKey;
    new: (partial: Partial<TileKey> & Required<Omit<TileKey, "tileX" | "tileY" | "zoomLevel">>) => TileKey;
    defaults: () => Partial<TileKey>;
}>;
/**
 * The serving traffic-flow cache's counters beside the budget they obey,
 * shaped for a diagnostics readback: the hits and misses prove a repeated
 * pane was answered without asking the provider, and the entry budget bounds
 * how many cells the cache may hold at once.
 */
export type TrafficFlowCacheStatistics = {
    /**
     * Requests answered entirely from fresh cells.
     */
    hitCount: bigint;
    /**
     * Requests that had to ask the provider for at least one cell.
     */
    missCount: bigint;
    /**
     * Cells currently held.
     */
    entryCount: bigint;
    /**
     * Cells dropped to stay inside the entry budget.
     */
    evictionCount: bigint;
    /**
     * Flow segments currently held across every cell.
     */
    segmentCount: bigint;
    /**
     * Zoom level the cells are keyed at.
     */
    gridZoomLevel: number;
    /**
     * Cells the cache may hold before the least recently used is evicted.
     */
    maximumEntryCount: bigint;
    /**
     * Seconds a stored cell stays fresh.
     */
    timeToLiveSeconds: bigint;
};
/**
 * Generated factory for {@link TrafficFlowCacheStatistics} record objects.
 */
export declare const TrafficFlowCacheStatistics: Readonly<{
    create: (partial: Partial<TrafficFlowCacheStatistics> & Required<Omit<TrafficFlowCacheStatistics, "timeToLiveSeconds" | "hitCount" | "missCount" | "entryCount" | "evictionCount" | "segmentCount" | "gridZoomLevel" | "maximumEntryCount">>) => TrafficFlowCacheStatistics;
    new: (partial: Partial<TrafficFlowCacheStatistics> & Required<Omit<TrafficFlowCacheStatistics, "timeToLiveSeconds" | "hitCount" | "missCount" | "entryCount" | "evictionCount" | "segmentCount" | "gridZoomLevel" | "maximumEntryCount">>) => TrafficFlowCacheStatistics;
    defaults: () => Partial<TrafficFlowCacheStatistics>;
}>;
/**
 * Class of disruption reported in a traffic incident.
 */
export declare enum TrafficIncidentType {
    /**
     * Road construction.
     */
    Construction = 0,
    /**
     * Traffic-impacting event.
     */
    Event = 1,
    /**
     * Collision.
     */
    Accident = 2,
    /**
     * Weather-related disruption.
     */
    Weather = 3,
    /**
     * Lane or road closure.
     */
    Closure = 4
}
/**
 * Severity ranking of a traffic incident.
 */
export declare enum TrafficIncidentSeverity {
    /**
     * Minimal delay expected.
     */
    Low = 0,
    /**
     * Noticeable delay expected.
     */
    Medium = 1,
    /**
     * Significant delay expected.
     */
    High = 2
}
/**
 * One reported disruption inside a queried bounding box.
 */
export type TrafficIncident = {
    /**
     * Provider-stable incident identifier.
     */
    identifier: string;
    /**
     * Class of disruption.
     */
    incidentType: TrafficIncidentType;
    /**
     * Severity ranking.
     */
    severity: TrafficIncidentSeverity;
    /**
     * Provider display text for this incident.
     */
    shortDescriptionText: string;
    /**
     * Position where the incident starts.
     */
    startCoordinate: GeographicCoordinate;
    /**
     * Position where the incident ends, if reported.
     */
    endCoordinate?: GeographicCoordinate;
};
/**
 * Generated factory for {@link TrafficIncident} record objects.
 */
export declare const TrafficIncident: Readonly<{
    create: (partial: Partial<TrafficIncident> & Required<Omit<TrafficIncident, "severity" | "identifier" | "incidentType" | "shortDescriptionText" | "startCoordinate" | "endCoordinate">>) => TrafficIncident;
    new: (partial: Partial<TrafficIncident> & Required<Omit<TrafficIncident, "severity" | "identifier" | "incidentType" | "shortDescriptionText" | "startCoordinate" | "endCoordinate">>) => TrafficIncident;
    defaults: () => Partial<TrafficIncident>;
}>;
/**
 * High-level phase of a trip that has already been started. Rerouting is not a
 * phase of its own: the controller moves Navigating to OffRoute and back
 * within a trip, and Navigating to Arrived at its end.
 */
export declare enum NavigationPhase {
    /**
     * Following the route's step sequence.
     */
    Navigating = 0,
    /**
     * The deviation detector judged the last graded fix off route; progress is
     * held at the last on-route values until a graded fix recovers or a reroute
     * replaces the route.
     */
    OffRoute = 1,
    /**
     * The final step has been completed; location updates no longer change the
     * state.
     */
    Arrived = 2
}
/**
 * Progress along the remaining trip.
 */
export type TripProgress = {
    /**
     * Distance, in meters, from the snapped position to the end of the current
     * step, which is the point of the next maneuver.
     */
    distanceToNextManeuverMeters: number;
    /**
     * Total remaining distance, in meters, including the current step's
     * remainder.
     */
    distanceRemainingMeters: number;
    /**
     * Total remaining travel time, in seconds, measured the same way as
     * `distance_remaining_meters`.
     */
    durationRemainingSeconds: number;
};
/**
 * Generated factory for {@link TripProgress} record objects.
 */
export declare const TripProgress: Readonly<{
    create: (partial: Partial<TripProgress> & Required<Omit<TripProgress, "distanceToNextManeuverMeters" | "distanceRemainingMeters" | "durationRemainingSeconds">>) => TripProgress;
    new: (partial: Partial<TripProgress> & Required<Omit<TripProgress, "distanceToNextManeuverMeters" | "distanceRemainingMeters" | "durationRemainingSeconds">>) => TripProgress;
    defaults: () => Partial<TripProgress>;
}>;
/**
 * The full navigable state of an active trip, read-only for the application.
 * The route's steps are carried as traversal-ordered indices, never
 * duplicated. The step-advance condition and deviation detector are configured
 * through the navigation policies on the controller, not through this state.
 */
export type TripNavigationState = {
    /**
     * Current phase of the trip.
     */
    phase: NavigationPhase;
    /**
     * The route being navigated.
     */
    route: Route;
    /**
     * All steps across every leg, flattened in traversal order.
     */
    stepPositions: Array<RouteStepPosition>;
    /**
     * Index into `step_positions` of the step currently traversed.
     */
    currentStepPosition: bigint;
    /**
     * Progress along the remaining trip.
     */
    progress: TripProgress;
    /**
     * Position snapped onto the current step's shape; null until the first
     * location update has been processed.
     */
    snappedCoordinate?: GeographicCoordinate;
    /**
     * Active deviation, as judged by the deviation detector; a fully-off grade
     * is set exactly while the phase is `OffRoute`, and a wrong-step
     * (`OffStepOnRoute`) grade may be set while the phase stays `Navigating`.
     */
    deviation?: DeviationInfo;
    /**
     * Whether a reroute calculation is currently in flight. The controller
     * tracks the wall-clock gate, so the value is read fresh on every readback.
     */
    isCalculatingNewRoute: boolean;
};
/**
 * Generated factory for {@link TripNavigationState} record objects.
 */
export declare const TripNavigationState: Readonly<{
    create: (partial: Partial<TripNavigationState> & Required<Omit<TripNavigationState, "phase" | "route" | "stepPositions" | "currentStepPosition" | "progress" | "snappedCoordinate" | "deviation" | "isCalculatingNewRoute">>) => TripNavigationState;
    new: (partial: Partial<TripNavigationState> & Required<Omit<TripNavigationState, "phase" | "route" | "stepPositions" | "currentStepPosition" | "progress" | "snappedCoordinate" | "deviation" | "isCalculatingNewRoute">>) => TripNavigationState;
    defaults: () => Partial<TripNavigationState>;
}>;
/**
 * One provider-neutral base-map tile source: a web-mercator XYZ raster
 * tileset addressed by a `{z}/{x}/{y}` URL template.
 *
 * The SDK supplies no tile source of its own; you provide the URL template
 * and the tileset's terms. Every field is validated when the source is
 * registered, so a malformed template or an inverted zoom range throws
 * instead of failing on the first tile.
 */
export type UrlTemplateRasterTileSource = {
    /**
     * The `{z}/{x}/{y}` URL template the tileset publishes: an absolute
     * `http`/`https` URL carrying those three placeholders and no other.
     */
    urlTemplate: string;
    /**
     * The tileset's name, used verbatim in every diagnostic it raises.
     */
    sourceName: string;
    /**
     * Lowest zoom level the tileset serves.
     */
    minimumZoomLevel: number;
    /**
     * Highest zoom level the tileset serves.
     */
    maximumZoomLevel: number;
    /**
     * The image format the tileset serves. Fetched tiles report this format
     * whatever the caller requests: the tile bytes are the truth, and the
     * renderer decodes by the record it receives.
     */
    imageFormat: RasterImageFormat;
    /**
     * The pixel resolution the tileset serves (the same rule as the format:
     * the fetched tile reports what it contains).
     */
    tileResolution: RasterTileResolution;
    /**
     * The `User-Agent` header every tile request carries; empty sends none.
     * A public tile service identifies its clients by it, and several usage
     * policies refuse clients that send nothing.
     */
    userAgent: string;
    /**
     * Immediate tile requests this source admits before pacing starts;
     * null keeps the default of eight, matched to the renderer's fetch
     * window. A source with a stricter published budget lowers the value
     * here. It must be finite and at least one, or registration throws
     * naming the source.
     */
    tokenBucketCapacityTokens?: number;
    /**
     * Sustained tile request rate in tokens per second; null keeps the
     * default of eight per second. A source with a stricter published
     * budget lowers the value here. It must be finite and strictly
     * positive, or registration throws naming the source.
     */
    refillTokensPerSecond?: number;
};
/**
 * Generated factory for {@link UrlTemplateRasterTileSource} record objects.
 */
export declare const UrlTemplateRasterTileSource: Readonly<{
    create: (partial: Partial<UrlTemplateRasterTileSource> & Required<Omit<UrlTemplateRasterTileSource, "imageFormat" | "tileResolution" | "minimumZoomLevel" | "maximumZoomLevel" | "urlTemplate" | "sourceName" | "userAgent" | "tokenBucketCapacityTokens" | "refillTokensPerSecond">>) => UrlTemplateRasterTileSource;
    new: (partial: Partial<UrlTemplateRasterTileSource> & Required<Omit<UrlTemplateRasterTileSource, "imageFormat" | "tileResolution" | "minimumZoomLevel" | "maximumZoomLevel" | "urlTemplate" | "sourceName" | "userAgent" | "tokenBucketCapacityTokens" | "refillTokensPerSecond">>) => UrlTemplateRasterTileSource;
    defaults: () => Partial<UrlTemplateRasterTileSource>;
}>;
/**
 * One provider-neutral vector base-map source: a web-mercator XYZ vector
 * tileset addressed by a `{z}/{x}/{y}` URL template, painted with one of the
 * SDK's built-in styles.
 *
 * The SDK supplies no tile source or style list of its own; you provide the
 * URL template, the attribution its terms require and the style id. The
 * style is named by an id such as `bright-light`, `fiord-dark` or
 * `positron-light`, and an unknown id throws here rather than on the first
 * frame. Every field is validated when the source is installed, so a
 * malformed template or an inverted zoom range throws instead of failing on
 * the first tile.
 *
 * Draw order: while installed, the styled base replaces the raster tiles, and
 * it paints beneath every overlay the view is asked to draw, so your markers,
 * routes and location indicator stay above the base map.
 *
 * The built-in styles paint fills, lines, circles and place labels, plus
 * route-reference badges where the style declares a shield block for its
 * `routes` layer.
 *
 * An absent optional field declares nothing. The WebAssembly surface never
 * inherits a provider declaration: every extra is the caller's own, and a
 * browser request cannot set `User-Agent` or `Referer`, so a header naming
 * either has no effect there. The native surface additionally inherits the
 * published declaration of a keyless named tileset when the template matches
 * one, so that tileset's recorded terms, subdomains, request headers and
 * style hints survive. The WebAssembly TypeScript projection spells the
 * optional members as required `T | null` fields, so pass null to declare
 * none there.
 */
export type UrlTemplateVectorTileSource = {
    /**
     * The `{z}/{x}/{y}` URL template the tileset publishes: an absolute
     * `http`/`https` URL carrying those three placeholders and no other.
     */
    urlTemplate: string;
    /**
     * The tileset's name, used verbatim in every diagnostic it raises.
     */
    sourceName: string;
    /**
     * The attribution line the tileset's terms require wherever it is shown;
     * the status readback reports it back for your UI to display.
     */
    attributionText: string;
    /**
     * The built-in style id the base paints with.
     */
    styleId: string;
    /**
     * Lowest zoom level the tileset serves.
     */
    minimumZoomLevel: number;
    /**
     * Highest zoom level the tileset serves.
     */
    maximumZoomLevel: number;
    /**
     * Immediate tile requests this source admits before pacing starts;
     * null keeps the default of eight, matched to the renderer's fetch
     * window. A tileset with a stricter published budget lowers the value
     * here. It must be finite and at least one, or installation throws
     * naming the source.
     */
    tokenBucketCapacityTokens?: number;
    /**
     * Sustained tile request rate in tokens per second; null keeps the
     * default of eight per second. A tileset with a stricter published
     * budget lowers the value here. It must be finite and strictly
     * positive, or installation throws naming the source.
     */
    refillTokensPerSecond?: number;
    /**
     * Terms the tileset's usage policy requires alongside attribution; null
     * or empty declares none.
     */
    termsText?: string;
    /**
     * Values substituted for the template's optional `{s}` placeholder, in
     * the source's preference order; null or empty when the template has no
     * `{s}`.
     */
    subdomains?: Array<string>;
    /**
     * Headers every tile request carries, in the order given; null or empty
     * sends none. A credential a public template needs belongs here or in
     * the template itself.
     */
    headers?: Array<SourceHeader>;
    /**
     * Style names or families the tileset is designed to be rendered with,
     * in the provider's preference order; null or empty when it declares
     * none.
     */
    styleHints?: Array<string>;
};
/**
 * Generated factory for {@link UrlTemplateVectorTileSource} record objects.
 */
export declare const UrlTemplateVectorTileSource: Readonly<{
    create: (partial: Partial<UrlTemplateVectorTileSource> & Required<Omit<UrlTemplateVectorTileSource, "styleId" | "minimumZoomLevel" | "maximumZoomLevel" | "urlTemplate" | "sourceName" | "tokenBucketCapacityTokens" | "refillTokensPerSecond" | "attributionText" | "termsText" | "subdomains" | "headers" | "styleHints">>) => UrlTemplateVectorTileSource;
    new: (partial: Partial<UrlTemplateVectorTileSource> & Required<Omit<UrlTemplateVectorTileSource, "styleId" | "minimumZoomLevel" | "maximumZoomLevel" | "urlTemplate" | "sourceName" | "tokenBucketCapacityTokens" | "refillTokensPerSecond" | "attributionText" | "termsText" | "subdomains" | "headers" | "styleHints">>) => UrlTemplateVectorTileSource;
    defaults: () => Partial<UrlTemplateVectorTileSource>;
}>;
/**
 * Wire encoding of a vector tile's byte payload.
 *
 * Tile services commonly serve Mapbox Vector Tile protobuf with
 * `Content-Encoding: gzip`. A fetched tile reports the encoding it actually
 * arrived in; a decoder decompresses only `GzippedMapboxVectorTile`.
 */
export declare enum VectorTileEncoding {
    MapboxVectorTile = 0,
    GzippedMapboxVectorTile = 1
}
/**
 * One fetched web-mercator XYZ vector tile.
 */
export type VectorTileData = {
    /**
     * Tile column coordinate at the given zoom level.
     */
    tileX: number;
    /**
     * Tile row coordinate at the given zoom level.
     */
    tileY: number;
    /**
     * Zoom level this tile belongs to.
     */
    zoomLevel: number;
    /**
     * Wire encoding of the byte payload.
     */
    tileEncoding: VectorTileEncoding;
    /**
     * Encoded tile bytes: MVT protobuf, optionally gzip-wrapped.
     */
    tileBytes: Array<number>;
};
/**
 * Generated factory for {@link VectorTileData} record objects.
 */
export declare const VectorTileData: Readonly<{
    create: (partial: Partial<VectorTileData> & Required<Omit<VectorTileData, "tileX" | "tileY" | "zoomLevel" | "tileEncoding" | "tileBytes">>) => VectorTileData;
    new: (partial: Partial<VectorTileData> & Required<Omit<VectorTileData, "tileX" | "tileY" | "zoomLevel" | "tileEncoding" | "tileBytes">>) => VectorTileData;
    defaults: () => Partial<VectorTileData>;
}>;
/**
 * Description of one vector-tileset source a foreign vector-tile provider
 * serves.
 *
 * The source name namespaces every cached payload for the tileset, so two
 * providers, or one provider serving two tilesets, never share cache entries
 * even for identical zoom/x/y arguments.
 */
export type VectorTileSourceDescriptor = {
    /**
     * Stable unique name of the tileset, used to namespace its cached vector
     * payloads so two tilesets serving one address never collide.
     */
    sourceName: string;
    /**
     * Human-readable attribution line the provider's usage terms require
     * wherever the imagery is shown.
     */
    attributionText: string;
    /**
     * Lowest zoom level the provider serves.
     */
    minimumZoomLevel: number;
    /**
     * Highest zoom level the provider serves.
     */
    maximumZoomLevel: number;
    /**
     * Wire encoding the provider expects this source's tiles to arrive in.
     * Advisory: every fetched `VectorTileData` reports the encoding its own
     * payload arrived in, and the decoder unwraps by that per-tile value.
     */
    tileEncoding: VectorTileEncoding;
    /**
     * Style names or families the tileset is designed to be rendered with,
     * in the provider's preference order; empty when it declares none. The
     * installed style id alone decides which style document paints the
     * tiles, and a provider-backed base also treats each hint as an
     * additional name that a style document's declared source may use to
     * identify this tileset.
     */
    styleHints: Array<string>;
};
/**
 * Generated factory for {@link VectorTileSourceDescriptor} record objects.
 */
export declare const VectorTileSourceDescriptor: Readonly<{
    create: (partial: Partial<VectorTileSourceDescriptor> & Required<Omit<VectorTileSourceDescriptor, "minimumZoomLevel" | "maximumZoomLevel" | "sourceName" | "attributionText" | "styleHints" | "tileEncoding">>) => VectorTileSourceDescriptor;
    new: (partial: Partial<VectorTileSourceDescriptor> & Required<Omit<VectorTileSourceDescriptor, "minimumZoomLevel" | "maximumZoomLevel" | "sourceName" | "attributionText" | "styleHints" | "tileEncoding">>) => VectorTileSourceDescriptor;
    defaults: () => Partial<VectorTileSourceDescriptor>;
}>;
/**
 * One vector source's layer accounting for the last resolved frame.
 *
 * `matched_layer_count` counts the source's style layers whose
 * `source-layer` the painted tileset carries; a layer that names no source
 * layer always matches. `drawn_layer_count` counts the source's layers that
 * painted geometry or placed a label. The two differ when a layer reads a
 * source layer the tileset does not carry, when its zoom span or visibility
 * excludes the frame, or when its filter admits no feature.
 */
export type VectorTileSourceLayerCount = {
    /**
     * The style source id the counts belong to.
     */
    sourceId: string;
    /**
     * The source's layers whose source layer the painted tileset carries.
     */
    matchedLayerCount: number;
    /**
     * The source's layers that painted in the frame.
     */
    drawnLayerCount: number;
};
/**
 * Generated factory for {@link VectorTileSourceLayerCount} record objects.
 */
export declare const VectorTileSourceLayerCount: Readonly<{
    create: (partial: Partial<VectorTileSourceLayerCount> & Required<Omit<VectorTileSourceLayerCount, "sourceId" | "matchedLayerCount" | "drawnLayerCount">>) => VectorTileSourceLayerCount;
    new: (partial: Partial<VectorTileSourceLayerCount> & Required<Omit<VectorTileSourceLayerCount, "sourceId" | "matchedLayerCount" | "drawnLayerCount">>) => VectorTileSourceLayerCount;
    defaults: () => Partial<VectorTileSourceLayerCount>;
}>;
/**
 * The vector base source's status: what the view is drawing a styled base
 * with, and what its last resolved frame achieved. The counts are per frame,
 * matching the raster tile statistics, so your UI can show an accurate
 * "base map loading" or "base map unavailable" state.
 */
export type VectorTileSourceStatus = {
    /**
     * Whether the view carries a vector base source at all.
     */
    isConfigured: boolean;
    /**
     * The active style id; empty when no source is configured.
     */
    styleId: string;
    /**
     * The tileset's name; empty when no source is configured.
     */
    sourceName: string;
    /**
     * The attribution line the tileset's terms require; empty when no source
     * is configured.
     */
    attributionText: string;
    /**
     * Highest zoom level the tileset serves; zero when no source is
     * configured.
     */
    maximumZoomLevel: number;
    /**
     * Tile addresses the last resolved frame drew.
     */
    drawnTileCount: number;
    /**
     * Tile addresses the last resolved frame skipped because their fetch or
     * decode failed.
     */
    failedTileCount: number;
    /**
     * The last resolved frame's last tile failure detail; null when the frame
     * had none (or no frame resolved yet).
     */
    lastFailureDetail?: string;
    /**
     * Every unsupported-property diagnostic the installed style produced,
     * including a known layer kind this renderer cannot paint; zero when no
     * source is configured.
     */
    unsupportedPropertyCount: number;
    /**
     * The distinct unsupported properties, scope-qualified (`layer "id":
     * property`, `source "id": property` or `document: property`) and sorted.
     * The list is capped at 32 names so a large vendor document cannot grow
     * the readback without bound; the count still reports every diagnostic.
     */
    unsupportedPropertyNames: Array<string>;
    /**
     * The assets that fell back to a degraded draw: a declared sprite the
     * install could not fetch, a declared glyph endpoint whose ranges did not
     * pack, or a declared source of a kind the vector base cannot draw. Names
     * are sorted and capped at 16; empty when no source is configured.
     */
    degradedAssetNames: Array<string>;
    /**
     * Each referenced source's layer accounting for the last resolved frame,
     * sorted by source id. Empty before the first frame resolves or when no
     * source is configured.
     */
    sourceLayerCounts: Array<VectorTileSourceLayerCount>;
};
/**
 * Generated factory for {@link VectorTileSourceStatus} record objects.
 */
export declare const VectorTileSourceStatus: Readonly<{
    create: (partial: Partial<VectorTileSourceStatus> & Required<Omit<VectorTileSourceStatus, "styleId" | "maximumZoomLevel" | "sourceName" | "attributionText" | "isConfigured" | "drawnTileCount" | "failedTileCount" | "lastFailureDetail" | "unsupportedPropertyCount" | "unsupportedPropertyNames" | "degradedAssetNames" | "sourceLayerCounts">>) => VectorTileSourceStatus;
    new: (partial: Partial<VectorTileSourceStatus> & Required<Omit<VectorTileSourceStatus, "styleId" | "maximumZoomLevel" | "sourceName" | "attributionText" | "isConfigured" | "drawnTileCount" | "failedTileCount" | "lastFailureDetail" | "unsupportedPropertyCount" | "unsupportedPropertyNames" | "degradedAssetNames" | "sourceLayerCounts">>) => VectorTileSourceStatus;
    defaults: () => Partial<VectorTileSourceStatus>;
}>;
/**
 * Viewport dimensions in physical pixels.
 */
export type ViewportSize = {
    /**
     * Horizontal extent in pixels.
     */
    widthPixels: number;
    /**
     * Vertical extent in pixels.
     */
    heightPixels: number;
};
/**
 * Generated factory for {@link ViewportSize} record objects.
 */
export declare const ViewportSize: Readonly<{
    create: (partial: Partial<ViewportSize> & Required<Omit<ViewportSize, "widthPixels" | "heightPixels">>) => ViewportSize;
    new: (partial: Partial<ViewportSize> & Required<Omit<ViewportSize, "widthPixels" | "heightPixels">>) => ViewportSize;
    defaults: () => Partial<ViewportSize>;
}>;
/**
 * A phase-transition event delivered on the phase topic.
 */
export declare enum NavigationPhaseChange {
    /**
     * The trip entered the off-route phase from the navigating phase.
     */
    OffRouteEntered = 0,
    /**
     * A graded fix back on the route line lifted the deviation and returned the
     * trip to the navigating phase.
     */
    OffRouteCleared = 1,
    /**
     * A reroute event replaced the route (delivered only when the event
     * actually applied; an ignored reroute produces no transition).
     */
    RerouteApplied = 2,
    /**
     * The final step completed; the trip reached the arrived phase.
     */
    Arrived = 3
}
/**
 * Why a positioning source could not produce fixes.
 */
export declare enum PositionSourceError {
    /**
     * The user denied the permission the source needs.
     */
    PermissionDenied = 0,
    /**
     * Location services are disabled on the device or by policy.
     */
    ServiceDisabled = 1,
    /**
     * No location provider can answer right now.
     */
    Unavailable = 2,
    /**
     * The source did not answer inside its timeout.
     */
    Timeout = 3
}
export declare enum SdkError_Tags {
    InvalidCoordinateInput = "InvalidCoordinateInput",
    NetworkRequestFailed = "NetworkRequestFailed",
    ResponseParsingFailure = "ResponseParsingFailure",
    ProviderRequestRejected = "ProviderRequestRejected",
    RateLimitExhausted = "RateLimitExhausted",
    ProviderNotConfigured = "ProviderNotConfigured",
    InvalidNavigationInput = "InvalidNavigationInput",
    InvalidRenderInput = "InvalidRenderInput",
    RenderingSurfaceUnavailable = "RenderingSurfaceUnavailable",
    CacheOperationFailure = "CacheOperationFailure",
    OfflineRoutingFailure = "OfflineRoutingFailure"
}
/**
 * Failures returned by the SDK. The detail message of a variant is always
 * passed through verbatim from the failing component.
 */
export declare const SdkError: Readonly<{
    instanceOf: (obj: any) => obj is SdkError;
    InvalidCoordinateInput: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.InvalidCoordinateInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.InvalidCoordinateInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.InvalidCoordinateInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.InvalidCoordinateInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.InvalidCoordinateInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    NetworkRequestFailed: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.NetworkRequestFailed;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.NetworkRequestFailed;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.NetworkRequestFailed;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.NetworkRequestFailed;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.NetworkRequestFailed;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    ResponseParsingFailure: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.ResponseParsingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.ResponseParsingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.ResponseParsingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.ResponseParsingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.ResponseParsingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    ProviderRequestRejected: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.ProviderRequestRejected;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.ProviderRequestRejected;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.ProviderRequestRejected;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.ProviderRequestRejected;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.ProviderRequestRejected;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    RateLimitExhausted: {
        new (): {
            readonly tag: SdkError_Tags.RateLimitExhausted;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(): {
            readonly tag: SdkError_Tags.RateLimitExhausted;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.RateLimitExhausted;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.RateLimitExhausted;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    ProviderNotConfigured: {
        new (inner: {
            contractName: string;
        }): {
            readonly tag: SdkError_Tags.ProviderNotConfigured;
            readonly inner: Readonly<{
                contractName: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            contractName: string;
        }): {
            readonly tag: SdkError_Tags.ProviderNotConfigured;
            readonly inner: Readonly<{
                contractName: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.ProviderNotConfigured;
            readonly inner: Readonly<{
                contractName: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.ProviderNotConfigured;
            readonly inner: Readonly<{
                contractName: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.ProviderNotConfigured;
            readonly inner: Readonly<{
                contractName: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            contractName: string;
        }>;
    };
    InvalidNavigationInput: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.InvalidNavigationInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.InvalidNavigationInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.InvalidNavigationInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.InvalidNavigationInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.InvalidNavigationInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    InvalidRenderInput: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.InvalidRenderInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.InvalidRenderInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.InvalidRenderInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.InvalidRenderInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.InvalidRenderInput;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    RenderingSurfaceUnavailable: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.RenderingSurfaceUnavailable;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.RenderingSurfaceUnavailable;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.RenderingSurfaceUnavailable;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.RenderingSurfaceUnavailable;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.RenderingSurfaceUnavailable;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    CacheOperationFailure: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.CacheOperationFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.CacheOperationFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.CacheOperationFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.CacheOperationFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.CacheOperationFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
    OfflineRoutingFailure: {
        new (inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.OfflineRoutingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        "new"(inner: {
            detail: string;
        }): {
            readonly tag: SdkError_Tags.OfflineRoutingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        instanceOf(obj: any): obj is {
            readonly tag: SdkError_Tags.OfflineRoutingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        hasInner(obj: any): obj is {
            readonly tag: SdkError_Tags.OfflineRoutingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        getInner(obj: {
            readonly tag: SdkError_Tags.OfflineRoutingFailure;
            readonly inner: Readonly<{
                detail: string;
            }>;
            /**
             * @private
             * This field is private and should not be used, use `tag` instead.
             */
            readonly [uniffiTypeNameSymbol]: "SdkError";
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        }): Readonly<{
            detail: string;
        }>;
    };
}>;
/**
 * Failures returned by the SDK. The detail message of a variant is always
 * passed through verbatim from the failing component.
 */
export type SdkError = InstanceType<typeof SdkError['InvalidCoordinateInput' | 'NetworkRequestFailed' | 'ResponseParsingFailure' | 'ProviderRequestRejected' | 'RateLimitExhausted' | 'ProviderNotConfigured' | 'InvalidNavigationInput' | 'InvalidRenderInput' | 'RenderingSurfaceUnavailable' | 'CacheOperationFailure' | 'OfflineRoutingFailure']>;
/**
 * Diagnostics listener contract. The SDK delivers its structured log events
 * fire-and-forget: it copies an event and moves on immediately without awaiting
 * the listener, so a slow listener can never slow the events it observes and a
 * frame-path event never blocks on a foreign callback.
 */
export interface SdkDiagnosticEventListener {
    /**
     * Receives one structured event, already gated by the subscription's
     * minimum severity.
     */
    onDiagnosticEvent(event: LogEvent): void;
}
/**
 * Diagnostics listener contract. The SDK delivers its structured log events
 * fire-and-forget: it copies an event and moves on immediately without awaiting
 * the listener, so a slow listener can never slow the events it observes and a
 * frame-path event never blocks on a foreign callback.
 */
export declare class SdkDiagnosticEventListenerImpl extends UniffiAbstractObject implements SdkDiagnosticEventListener {
    readonly [uniffiTypeNameSymbol] = "SdkDiagnosticEventListenerImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Receives one structured event, already gated by the subscription's
     * minimum severity.
     */
    onDiagnosticEvent(event: LogEvent): void;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is SdkDiagnosticEventListenerImpl;
}
/**
 * Diagnostics facade over a `MapSdk`'s structured log events and buffers. The
 * members behave like `MapSdk::subscribe_to_diagnostic_events` and
 * `MapSdk::flush_recent_diagnostic_events`.
 */
export interface DiagnosticsLike {
    /**
     * Subscribes the listener to the SDK's structured log events at
     * `minimum_severity` or above. Subscribing an already subscribed listener
     * replaces its severity threshold.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     */
    addListener(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity): void;
    /**
     * Delivers up to `maximum_count` of the most recent buffered events at
     * `minimum_severity` or above to the listener, oldest first, and answers
     * how many were delivered.
     *
     * The flush is non-destructive and synchronous, and the listener must not
     * block.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     * - `maximum_count` — upper bound on delivered events.
     *
     * # Returns
     * The number of events delivered.
     */
    flushRecent(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity, maximumCount: number): number;
}
/**
 * @deprecated Use `DiagnosticsLike` instead.
 */
export type DiagnosticsInterface = DiagnosticsLike;
/**
 * Diagnostics facade over a `MapSdk`'s structured log events and buffers. The
 * members behave like `MapSdk::subscribe_to_diagnostic_events` and
 * `MapSdk::flush_recent_diagnostic_events`.
 */
export declare class Diagnostics extends UniffiAbstractObject implements DiagnosticsLike {
    readonly [uniffiTypeNameSymbol] = "Diagnostics";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds the facade over the SDK whose diagnostics it observes.
     */
    constructor(mapSdk: MapSdkLike);
    /**
     * Subscribes the listener to the SDK's structured log events at
     * `minimum_severity` or above. Subscribing an already subscribed listener
     * replaces its severity threshold.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     */
    addListener(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity): void;
    /**
     * Delivers up to `maximum_count` of the most recent buffered events at
     * `minimum_severity` or above to the listener, oldest first, and answers
     * how many were delivered.
     *
     * The flush is non-destructive and synchronous, and the listener must not
     * block.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     * - `maximum_count` — upper bound on delivered events.
     *
     * # Returns
     * The number of events delivered.
     */
    flushRecent(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity, maximumCount: number): number;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is Diagnostics;
}
/**
 * Distance-matrix contract implemented by foreign code and registered on
 * `MapSdk` through `register_distance_matrix_provider_from_foreign`.
 */
export interface DistanceMatrixProvider {
    /**
     * Calculates durations and distances for every origin-destination pair.
     *
     * # Parameters
     * - `origins` — the origin coordinates.
     * - `destinations` — the destination coordinates.
     * - `transportation_mode` — the mode to route for.
     *
     * # Returns
     * One entry per pair, in row-major origin-major order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    calculateDistanceMatrix(origins: Array<GeographicCoordinate>, destinations: Array<GeographicCoordinate>, transportationMode: TransportationMode, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<DistanceMatrix>;
}
/**
 * Distance-matrix contract implemented by foreign code and registered on
 * `MapSdk` through `register_distance_matrix_provider_from_foreign`.
 */
export declare class DistanceMatrixProviderImpl extends UniffiAbstractObject implements DistanceMatrixProvider {
    readonly [uniffiTypeNameSymbol] = "DistanceMatrixProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Calculates durations and distances for every origin-destination pair.
     *
     * # Parameters
     * - `origins` — the origin coordinates.
     * - `destinations` — the destination coordinates.
     * - `transportation_mode` — the mode to route for.
     *
     * # Returns
     * One entry per pair, in row-major origin-major order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    calculateDistanceMatrix(origins: Array<GeographicCoordinate>, destinations: Array<GeographicCoordinate>, transportationMode: TransportationMode, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<DistanceMatrix>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is DistanceMatrixProviderImpl;
}
/**
 * Elevation contract implemented by foreign code and registered on `MapSdk`
 * through `register_elevation_provider_from_foreign`.
 */
export interface ElevationProvider {
    /**
     * Fetches elevation samples for ordered points.
     *
     * # Parameters
     * - `points` — the coordinates to sample, in order.
     *
     * # Returns
     * One sample per requested point, in the same order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchElevationPoints(points: Array<GeographicCoordinate>, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<ElevationPoint>>;
}
/**
 * Elevation contract implemented by foreign code and registered on `MapSdk`
 * through `register_elevation_provider_from_foreign`.
 */
export declare class ElevationProviderImpl extends UniffiAbstractObject implements ElevationProvider {
    readonly [uniffiTypeNameSymbol] = "ElevationProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Fetches elevation samples for ordered points.
     *
     * # Parameters
     * - `points` — the coordinates to sample, in order.
     *
     * # Returns
     * One sample per requested point, in the same order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchElevationPoints(points: Array<GeographicCoordinate>, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<ElevationPoint>>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is ElevationProviderImpl;
}
/**
 * Geocoding provider contract. Implement this interface and register the
 * implementation with `MapSdk::register_geocoding_provider_from_foreign` to
 * serve the SDK's forward and reverse geocoding calls.
 */
export interface GeocodingProvider {
    /**
     * Resolves a free-form address text into candidate places, best match
     * first.
     *
     * # Parameters
     * - `address_text` — the address to resolve.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    forwardGeocode(addressText: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Resolves a coordinate into candidate places describing that position.
     *
     * # Parameters
     * - `coordinate` — the position to describe.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    reverseGeocode(coordinate: GeographicCoordinate, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
}
/**
 * Geocoding provider contract. Implement this interface and register the
 * implementation with `MapSdk::register_geocoding_provider_from_foreign` to
 * serve the SDK's forward and reverse geocoding calls.
 */
export declare class GeocodingProviderImpl extends UniffiAbstractObject implements GeocodingProvider {
    readonly [uniffiTypeNameSymbol] = "GeocodingProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Resolves a free-form address text into candidate places, best match
     * first.
     *
     * # Parameters
     * - `address_text` — the address to resolve.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    forwardGeocode(addressText: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Resolves a coordinate into candidate places describing that position.
     *
     * # Parameters
     * - `coordinate` — the position to describe.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    reverseGeocode(coordinate: GeographicCoordinate, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is GeocodingProviderImpl;
}
/**
 * Anchored map camera: geographic center, zoom level, bearing and pitch. The
 * ground point under the center always sits at the viewport center; zoom and
 * pitch are clamped to their valid ranges and bearing wraps into
 * `[0, 360)`.
 */
export interface MapCameraLike {
    /**
     * The camera's bearing in degrees clockwise from north, within
     * `[0, 360)`.
     */
    bearingDegrees(): number;
    /**
     * Reads the camera's state back as it was constructed. The getters make
     * the framing chosen by `fit_bounds` readable: the fitted zoom level, its
     * anchored center, and the constructed bearing and pitch. Read-only: the
     * camera has no setters, so a new pose is a new camera.
     */
    center(): GeographicCoordinate;
    /**
     * Ground meters represented by one screen pixel at the camera's center:
     * the equatorial ground meters per pixel at the camera's zoom level times
     * the cosine of the center latitude, so the answer shrinks toward the
     * poles exactly like the projected ground.
     *
     * At any nonzero pitch this is an approximation valid at the viewport's
     * center column: the value is computed for a flat center and does not fold
     * pitch into the answer.
     *
     * # Parameters
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid viewport.
     */
    groundMetersPerScreenPixel(viewport: ViewportSize, fieldOfViewDegrees: number): number;
    /**
     * Pans by a pointer travel of `delta_x_pixels` x `delta_y_pixels`
     * (screen pixels, x right / y down): the ground point the pointer just
     * moved over becomes the new camera center, so map content tracks the
     * pointer exactly. Answers the camera unchanged when the delta's ground
     * ray misses the plane (above the horizon at steep pitch). Gesture
     * recognition stays in your UI layer; this call performs the camera math.
     *
     * # Parameters
     * - `delta_x_pixels` — horizontal pointer travel in pixels.
     * - `delta_y_pixels` — vertical pointer travel in pixels.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the viewport extent is not
     * positive.
     */
    panByScreenPixels(deltaXPixels: number, deltaYPixels: number, viewport: ViewportSize, fieldOfViewDegrees: number): MapCameraLike;
    /**
     * The camera's pitch in degrees.
     */
    pitchDegrees(): number;
    /**
     * Projects a coordinate to viewport pixels (origin top-left, y down).
     *
     * # Parameters
     * - `coordinate` — the point to project.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Returns
     * The screen position, or null when the point lies behind the camera.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid coordinate or viewport.
     */
    projectToScreen(coordinate: GeographicCoordinate, viewport: ViewportSize, fieldOfViewDegrees: number): ScreenPoint | undefined;
    /**
     * Rotates the bearing by `delta_bearing_degrees` (degrees clockwise,
     * wrapping into `[0, 360)`) keeping the world point under `focal_point`
     * fixed under it. Answers the rotation without the focal correction when
     * the focal ray misses the ground plane, which produces the touch-point
     * turn a two-finger gesture implies.
     *
     * # Parameters
     * - `delta_bearing_degrees` — bearing change in degrees.
     * - `focal_point` — screen pixel that stays fixed during the rotation.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the viewport extent is not
     * positive.
     */
    rotateByDegreesAroundScreenPoint(deltaBearingDegrees: number, focalPoint: ScreenPoint, viewport: ViewportSize, fieldOfViewDegrees: number): MapCameraLike;
    /**
     * Unprojects a viewport pixel back onto the ground plane.
     *
     * # Parameters
     * - `screen_point` — the pixel to unproject.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Returns
     * The ground coordinate, or null when the ray misses the ground
     * (typically below the horizon at steep pitch).
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid viewport.
     */
    screenToGroundCoordinate(screenPoint: ScreenPoint, viewport: ViewportSize, fieldOfViewDegrees: number): GeographicCoordinate | undefined;
    /**
     * Nearest whole zoom level a tile fetch should use for this camera.
     */
    tileZoomLevel(): number;
    /**
     * Lists every tile at `tile_zoom_level` whose area intersects the visible
     * ground, sorted row-major from the north.
     *
     * # Parameters
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     * - `tile_zoom_level` — zoom level of the listed tiles.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid viewport.
     */
    visibleTileKeys(viewport: ViewportSize, fieldOfViewDegrees: number, tileZoomLevel: number): Array<TileKey>;
    /**
     * Zooms by `delta_zoom_levels` (levels; positive zooms in) keeping the
     * world point under `focal_point` fixed under it. Answers the zoom
     * without the focal correction when the focal ray misses the ground
     * plane (above the horizon at steep pitch). Zoom clamps to the camera's
     * own level range before the focal correction applies, so a clamped
     * zoom still holds the focal point.
     *
     * # Parameters
     * - `delta_zoom_levels` — zoom change in levels.
     * - `focal_point` — screen pixel that stays fixed during the zoom.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the viewport extent is not
     * positive.
     */
    zoomByLevelsAroundScreenPoint(deltaZoomLevels: number, focalPoint: ScreenPoint, viewport: ViewportSize, fieldOfViewDegrees: number): MapCameraLike;
    /**
     * The camera's zoom level.
     */
    zoomLevel(): number;
}
/**
 * @deprecated Use `MapCameraLike` instead.
 */
export type MapCameraInterface = MapCameraLike;
/**
 * Anchored map camera: geographic center, zoom level, bearing and pitch. The
 * ground point under the center always sits at the viewport center; zoom and
 * pitch are clamped to their valid ranges and bearing wraps into
 * `[0, 360)`.
 */
export declare class MapCamera extends UniffiAbstractObject implements MapCameraLike {
    readonly [uniffiTypeNameSymbol] = "MapCamera";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds a camera at the given center, zoom level, bearing and pitch.
     *
     * # Parameters
     * - `center` — geographic point placed at the viewport center.
     * - `zoom_level` — zoom level, clamped to the valid range.
     * - `bearing_degrees` — clockwise rotation from north, wrapped into
     *   `[0, 360)`.
     * - `pitch_degrees` — tilt from straight down, clamped to the valid
     *   range.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the center is not a valid
     * coordinate or when a numeric argument is not finite.
     */
    constructor(center: GeographicCoordinate, zoomLevel: number, bearingDegrees: number, pitchDegrees: number);
    /**
     * Builds the camera that frames a bounding box inside the viewport's
     * inset region: top-down and north-up by construction (pitch and bearing
     * zero), zoomed to the largest level keeping the whole box inside the
     * inset area and clamped to `maximum_zoom_level`; the center is anchored
     * on the inset region's center.
     *
     * # Parameters
     * - `bounding_box` — the area to frame.
     * - `viewport` — viewport extent in pixels.
     * - `edge_insets` — pixels kept clear on each viewport edge.
     * - `maximum_zoom_level` — upper zoom bound for the fitted camera.
     *
     * # Errors
     * Throws when the insets or the maximum zoom are not finite usable
     * values, when the insets are negative or leave no inset area, or when
     * the box spans no positive world area.
     */
    static fitBounds(boundingBox: BoundingBox, viewport: ViewportSize, edgeInsets: EdgeInsets, maximumZoomLevel: number): MapCameraLike;
    /**
     * Eases from `start_camera` toward `target_camera` over `fraction`.
     *
     * The SDK's one camera-interpolation curve: the fraction is clamped into
     * `[0, 1]` and eased with smoothstep, the center travels the shortest
     * longitude path in Mercator space, zoom and pitch interpolate linearly,
     * and the bearing takes the shortest arc. Fractions at or below zero
     * answer `start_camera` verbatim and fractions at or above one answer
     * `target_camera` verbatim, so an animation's endpoints are exact.
     *
     * # Parameters
     * - `start_camera` — the pose the interpolation starts from.
     * - `target_camera` — the pose the interpolation heads toward.
     * - `fraction` — animation progress, clamped into `[0, 1]`.
     *
     * # Returns
     * The camera pose at the eased progress between the two poses.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when `fraction` is not finite.
     */
    static interpolate(startCamera: MapCameraLike, targetCamera: MapCameraLike, fraction: number): MapCameraLike;
    /**
     * The camera's bearing in degrees clockwise from north, within
     * `[0, 360)`.
     */
    bearingDegrees(): number;
    /**
     * Reads the camera's state back as it was constructed. The getters make
     * the framing chosen by `fit_bounds` readable: the fitted zoom level, its
     * anchored center, and the constructed bearing and pitch. Read-only: the
     * camera has no setters, so a new pose is a new camera.
     */
    center(): GeographicCoordinate;
    /**
     * Ground meters represented by one screen pixel at the camera's center:
     * the equatorial ground meters per pixel at the camera's zoom level times
     * the cosine of the center latitude, so the answer shrinks toward the
     * poles exactly like the projected ground.
     *
     * At any nonzero pitch this is an approximation valid at the viewport's
     * center column: the value is computed for a flat center and does not fold
     * pitch into the answer.
     *
     * # Parameters
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid viewport.
     */
    groundMetersPerScreenPixel(viewport: ViewportSize, fieldOfViewDegrees: number): number;
    /**
     * Pans by a pointer travel of `delta_x_pixels` x `delta_y_pixels`
     * (screen pixels, x right / y down): the ground point the pointer just
     * moved over becomes the new camera center, so map content tracks the
     * pointer exactly. Answers the camera unchanged when the delta's ground
     * ray misses the plane (above the horizon at steep pitch). Gesture
     * recognition stays in your UI layer; this call performs the camera math.
     *
     * # Parameters
     * - `delta_x_pixels` — horizontal pointer travel in pixels.
     * - `delta_y_pixels` — vertical pointer travel in pixels.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the viewport extent is not
     * positive.
     */
    panByScreenPixels(deltaXPixels: number, deltaYPixels: number, viewport: ViewportSize, fieldOfViewDegrees: number): MapCameraLike;
    /**
     * The camera's pitch in degrees.
     */
    pitchDegrees(): number;
    /**
     * Projects a coordinate to viewport pixels (origin top-left, y down).
     *
     * # Parameters
     * - `coordinate` — the point to project.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Returns
     * The screen position, or null when the point lies behind the camera.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid coordinate or viewport.
     */
    projectToScreen(coordinate: GeographicCoordinate, viewport: ViewportSize, fieldOfViewDegrees: number): ScreenPoint | undefined;
    /**
     * Rotates the bearing by `delta_bearing_degrees` (degrees clockwise,
     * wrapping into `[0, 360)`) keeping the world point under `focal_point`
     * fixed under it. Answers the rotation without the focal correction when
     * the focal ray misses the ground plane, which produces the touch-point
     * turn a two-finger gesture implies.
     *
     * # Parameters
     * - `delta_bearing_degrees` — bearing change in degrees.
     * - `focal_point` — screen pixel that stays fixed during the rotation.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the viewport extent is not
     * positive.
     */
    rotateByDegreesAroundScreenPoint(deltaBearingDegrees: number, focalPoint: ScreenPoint, viewport: ViewportSize, fieldOfViewDegrees: number): MapCameraLike;
    /**
     * Unprojects a viewport pixel back onto the ground plane.
     *
     * # Parameters
     * - `screen_point` — the pixel to unproject.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Returns
     * The ground coordinate, or null when the ray misses the ground
     * (typically below the horizon at steep pitch).
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid viewport.
     */
    screenToGroundCoordinate(screenPoint: ScreenPoint, viewport: ViewportSize, fieldOfViewDegrees: number): GeographicCoordinate | undefined;
    /**
     * Nearest whole zoom level a tile fetch should use for this camera.
     */
    tileZoomLevel(): number;
    /**
     * Lists every tile at `tile_zoom_level` whose area intersects the visible
     * ground, sorted row-major from the north.
     *
     * # Parameters
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     * - `tile_zoom_level` — zoom level of the listed tiles.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` for an invalid viewport.
     */
    visibleTileKeys(viewport: ViewportSize, fieldOfViewDegrees: number, tileZoomLevel: number): Array<TileKey>;
    /**
     * Zooms by `delta_zoom_levels` (levels; positive zooms in) keeping the
     * world point under `focal_point` fixed under it. Answers the zoom
     * without the focal correction when the focal ray misses the ground
     * plane (above the horizon at steep pitch). Zoom clamps to the camera's
     * own level range before the focal correction applies, so a clamped
     * zoom still holds the focal point.
     *
     * # Parameters
     * - `delta_zoom_levels` — zoom change in levels.
     * - `focal_point` — screen pixel that stays fixed during the zoom.
     * - `viewport` — viewport extent in pixels.
     * - `field_of_view_degrees` — vertical field of view of the projection.
     *
     * # Errors
     * Throws `InvalidCoordinateInput` when the viewport extent is not
     * positive.
     */
    zoomByLevelsAroundScreenPoint(deltaZoomLevels: number, focalPoint: ScreenPoint, viewport: ViewportSize, fieldOfViewDegrees: number): MapCameraLike;
    /**
     * The camera's zoom level.
     */
    zoomLevel(): number;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is MapCamera;
}
/**
 * Raster-tile provider contract. Implement this interface and register the
 * implementation with `MapSdk::register_raster_tile_provider_from_foreign` to
 * serve the SDK's raster-tile calls.
 */
export interface RasterTileProvider {
    /**
     * Fetches one web-mercator XYZ raster tile at the requested resolution.
     *
     * # Parameters
     * - `tile_x` — tile column.
     * - `tile_y` — tile row, counted from the north.
     * - `zoom_level` — zoom level of the tile.
     * - `image_format` — requested image encoding.
     * - `tile_resolution` — requested pixel resolution.
     *
     * # Returns
     * The fetched tile, reporting the format and resolution it actually
     * contains.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchRasterTile(tileX: number, tileY: number, zoomLevel: number, imageFormat: RasterImageFormat, tileResolution: RasterTileResolution, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RasterTileData>;
}
/**
 * Raster-tile provider contract. Implement this interface and register the
 * implementation with `MapSdk::register_raster_tile_provider_from_foreign` to
 * serve the SDK's raster-tile calls.
 */
export declare class RasterTileProviderImpl extends UniffiAbstractObject implements RasterTileProvider {
    readonly [uniffiTypeNameSymbol] = "RasterTileProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Fetches one web-mercator XYZ raster tile at the requested resolution.
     *
     * # Parameters
     * - `tile_x` — tile column.
     * - `tile_y` — tile row, counted from the north.
     * - `zoom_level` — zoom level of the tile.
     * - `image_format` — requested image encoding.
     * - `tile_resolution` — requested pixel resolution.
     *
     * # Returns
     * The fetched tile, reporting the format and resolution it actually
     * contains.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchRasterTile(tileX: number, tileY: number, zoomLevel: number, imageFormat: RasterImageFormat, tileResolution: RasterTileResolution, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RasterTileData>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is RasterTileProviderImpl;
}
/**
 * Routing contract implemented by foreign code and registered on `MapSdk`
 * through `register_routing_provider_from_foreign`.
 */
export interface RoutingProvider {
    /**
     * Calculates a route through the ordered waypoints with the given
     * options.
     *
     * # Parameters
     * - `waypoints` — the ordered stops, starting at the origin.
     * - `route_options` — transport mode, strategy, units and features to
     *   avoid.
     *
     * # Returns
     * A route with one leg per consecutive waypoint pair.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    calculateRoute(waypoints: Array<GeographicCoordinate>, routeOptions: RouteOptions, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Route>;
}
/**
 * Routing contract implemented by foreign code and registered on `MapSdk`
 * through `register_routing_provider_from_foreign`.
 */
export declare class RoutingProviderImpl extends UniffiAbstractObject implements RoutingProvider {
    readonly [uniffiTypeNameSymbol] = "RoutingProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Calculates a route through the ordered waypoints with the given
     * options.
     *
     * # Parameters
     * - `waypoints` — the ordered stops, starting at the origin.
     * - `route_options` — transport mode, strategy, units and features to
     *   avoid.
     *
     * # Returns
     * A route with one leg per consecutive waypoint pair.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    calculateRoute(waypoints: Array<GeographicCoordinate>, routeOptions: RouteOptions, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Route>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is RoutingProviderImpl;
}
/**
 * Place-search contract implemented by foreign code and registered on
 * `MapSdk` through `register_search_place_provider_from_foreign`.
 */
export interface SearchPlaceProvider {
    /**
     * Returns fast completion candidates while the user types.
     *
     * # Parameters
     * - `query_text` — the partial query entered so far.
     * - `search_boundary` — an optional area to prefer or restrict results
     *   to.
     *
     * # Returns
     * Completion candidates in the implementation's relevance order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    searchAutocomplete(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns full search results for a settled query.
     *
     * # Parameters
     * - `query_text` — the complete query.
     * - `search_boundary` — an optional area to prefer or restrict results
     *   to.
     *
     * # Returns
     * Matching places in the implementation's relevance order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    searchPlaces(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
}
/**
 * Place-search contract implemented by foreign code and registered on
 * `MapSdk` through `register_search_place_provider_from_foreign`.
 */
export declare class SearchPlaceProviderImpl extends UniffiAbstractObject implements SearchPlaceProvider {
    readonly [uniffiTypeNameSymbol] = "SearchPlaceProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Returns fast completion candidates while the user types.
     *
     * # Parameters
     * - `query_text` — the partial query entered so far.
     * - `search_boundary` — an optional area to prefer or restrict results
     *   to.
     *
     * # Returns
     * Completion candidates in the implementation's relevance order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    searchAutocomplete(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns full search results for a settled query.
     *
     * # Parameters
     * - `query_text` — the complete query.
     * - `search_boundary` — an optional area to prefer or restrict results
     *   to.
     *
     * # Returns
     * Matching places in the implementation's relevance order.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    searchPlaces(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is SearchPlaceProviderImpl;
}
/**
 * Traffic-flow contract implemented by foreign code and registered on
 * `MapSdk` through `register_traffic_flow_provider_from_foreign`.
 */
export interface TrafficFlowProvider {
    /**
     * Fetches per-segment flow observations inside a bounding box.
     *
     * # Parameters
     * - `bounding_box` — the area to report flow for.
     *
     * # Returns
     * One observation per segment inside the area.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchTrafficFlow(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficFlowData>>;
}
/**
 * Traffic-flow contract implemented by foreign code and registered on
 * `MapSdk` through `register_traffic_flow_provider_from_foreign`.
 */
export declare class TrafficFlowProviderImpl extends UniffiAbstractObject implements TrafficFlowProvider {
    readonly [uniffiTypeNameSymbol] = "TrafficFlowProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Fetches per-segment flow observations inside a bounding box.
     *
     * # Parameters
     * - `bounding_box` — the area to report flow for.
     *
     * # Returns
     * One observation per segment inside the area.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchTrafficFlow(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficFlowData>>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is TrafficFlowProviderImpl;
}
/**
 * Traffic-incident contract implemented by foreign code and registered on
 * `MapSdk` through `register_traffic_incident_provider_from_foreign`.
 */
export interface TrafficIncidentProvider {
    /**
     * Fetches incidents intersecting a bounding box.
     *
     * # Parameters
     * - `bounding_box` — the area to report incidents for.
     *
     * # Returns
     * Every incident inside the area.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchTrafficIncidents(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficIncident>>;
}
/**
 * Traffic-incident contract implemented by foreign code and registered on
 * `MapSdk` through `register_traffic_incident_provider_from_foreign`.
 */
export declare class TrafficIncidentProviderImpl extends UniffiAbstractObject implements TrafficIncidentProvider {
    readonly [uniffiTypeNameSymbol] = "TrafficIncidentProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Fetches incidents intersecting a bounding box.
     *
     * # Parameters
     * - `bounding_box` — the area to report incidents for.
     *
     * # Returns
     * Every incident inside the area.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchTrafficIncidents(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficIncident>>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is TrafficIncidentProviderImpl;
}
/**
 * Vector-tile provider contract. Implement this interface and register the
 * implementation with `MapSdk::register_vector_tile_provider_from_foreign` to
 * serve the SDK's vector-tile calls.
 *
 * The provider serves one web-mercator XYZ tileset and reports its tileset
 * name, attribution, zoom span, wire encoding and style hints through
 * `source_descriptor`. A provider-backed vector base installed with
 * `MapView::set_provider_vector_tile_source` then paints that tileset. The
 * encoding and hints are advisory: each fetched tile reports the encoding
 * its payload actually arrived in, and the installed style decides the
 * document.
 */
export interface VectorTileProvider {
    /**
     * Fetches one web-mercator XYZ vector tile in its wire encoding.
     *
     * # Parameters
     * - `tile_x` — tile column.
     * - `tile_y` — tile row, counted from the north.
     * - `zoom_level` — zoom level of the tile.
     *
     * # Returns
     * The tile bytes together with the encoding they arrived in.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure, or to refuse a tile outside the served zoom span.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchVectorTile(tileX: number, tileY: number, zoomLevel: number, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<VectorTileData>;
    /**
     * Describes the served tileset: tileset name, attribution, zoom span,
     * wire encoding and style hints.
     */
    sourceDescriptor(): VectorTileSourceDescriptor;
}
/**
 * Vector-tile provider contract. Implement this interface and register the
 * implementation with `MapSdk::register_vector_tile_provider_from_foreign` to
 * serve the SDK's vector-tile calls.
 *
 * The provider serves one web-mercator XYZ tileset and reports its tileset
 * name, attribution, zoom span, wire encoding and style hints through
 * `source_descriptor`. A provider-backed vector base installed with
 * `MapView::set_provider_vector_tile_source` then paints that tileset. The
 * encoding and hints are advisory: each fetched tile reports the encoding
 * its payload actually arrived in, and the installed style decides the
 * document.
 */
export declare class VectorTileProviderImpl extends UniffiAbstractObject implements VectorTileProvider {
    readonly [uniffiTypeNameSymbol] = "VectorTileProviderImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Fetches one web-mercator XYZ vector tile in its wire encoding.
     *
     * # Parameters
     * - `tile_x` — tile column.
     * - `tile_y` — tile row, counted from the north.
     * - `zoom_level` — zoom level of the tile.
     *
     * # Returns
     * The tile bytes together with the encoding they arrived in.
     *
     * # Errors
     * Throw `SdkError` to report a transport, parsing, rejection or rate
     * limit failure, or to refuse a tile outside the served zoom span.
     *
     * # Async
     * Runs asynchronously on behalf of the calling SDK call.
     */
    fetchVectorTile(tileX: number, tileY: number, zoomLevel: number, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<VectorTileData>;
    /**
     * Describes the served tileset: tileset name, attribution, zoom span,
     * wire encoding and style hints.
     */
    sourceDescriptor(): VectorTileSourceDescriptor;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is VectorTileProviderImpl;
}
/**
 * Provider entry point of the SDK: resolves every call through the providers
 * registered on the object. Construct the object with no providers, then
 * register them: native integrations through the SDK's own registration calls
 * and foreign integrations through the `register_*_from_foreign` methods (see
 * the provider contract interfaces above). A call into a contract with no
 * registered provider throws `ProviderNotConfigured` naming the contract.
 *
 * The calls cover geocoding (forward and reverse), routing, distance matrix,
 * place search, traffic incidents, traffic flow, raster tiles and vector
 * tiles. Elevation and offline routing have no provider contract here:
 * offline routing is the standalone `offline_route_from_archive_bytes`
 * function.
 */
export interface MapSdkLike {
    /**
     * Calculates durations and distances for every origin-destination pair.
     *
     * # Parameters
     * - `origins` — origin points.
     * - `destinations` — destination points.
     * - `transportation_mode` — mode of transport for the matrix.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid point, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateDistanceMatrix(origins: Array<GeographicCoordinate>, destinations: Array<GeographicCoordinate>, transportationMode: TransportationMode, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<DistanceMatrix>;
    /**
     * Calculates a route through the ordered waypoints with the given
     * options.
     *
     * # Parameters
     * - `waypoints` — ordered route points; every one must be a valid
     *   coordinate.
     * - `route_options` — transport mode, strategy, units and avoid options.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid waypoint, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateRoute(waypoints: Array<GeographicCoordinate>, routeOptions: RouteOptions, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Route>;
    /**
     * Chooses the provider that serves one capability, leaving every other
     * capability untouched.
     *
     * The SDK builds provider implementations into the binary under stable
     * keys; this call is how an application selects one. A key may serve
     * several capabilities, so an application that wants one vendor
     * everywhere configures each capability in turn, or calls
     * `configure_provider_set` for the all-in-one convenience.
     *
     * # Parameters
     * - `contract` — the capability whose provider is being chosen.
     * - `provider_key` — the stable key of a provider built into this SDK
     *   build.
     * - `credential` — the provider's credential; an empty string is
     *   accepted only for a provider that needs none.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when the key is unknown to this build
     * or serves no implementation of `contract`, `ProviderRequestRejected`
     * when the provider declares a credential and the supplied one is blank,
     * and the provider's own failure when its construction fails. A refused
     * call leaves the previously serving provider in place.
     */
    configureProvider(contract: ProviderContract, providerKey: string, credential: string): void;
    /**
     * Registers every capability the provider named by `provider_key` serves
     * from one credential, with the SDK defaults for base URL, rate limiting
     * and retries.
     *
     * One call and one credential enable that provider's whole set — for the
     * full-service provider, geocoding, routing, distance matrix, place
     * search, traffic incidents, traffic flow and raster tiles. Re-registration
     * replaces every capability of the named provider. A capability the
     * provider does not serve stays on whichever provider served it before;
     * elevation has no provider and keeps throwing `ProviderNotConfigured`.
     * The raster-tile contract is installed uncached, so a previously
     * installed tile cache and its terms are dropped.
     *
     * # Parameters
     * - `provider_key` — the stable key of a provider built into this SDK.
     * - `credential` — the provider credential; a provider that requires one
     *   refuses a blank value.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when the key is unknown to this build and
     * `ProviderRequestRejected` when a required credential is blank; a
     * provider's own construction failure passes through verbatim.
     */
    configureProviderSet(providerKey: string, credential: string): void;
    /**
     * Fetches elevation samples for ordered points.
     *
     * # Parameters
     * - `points` — the coordinates to sample, in order.
     *
     * # Returns
     * One sample per requested point, in the same order.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without an elevation provider,
     * `InvalidCoordinateInput` for an invalid point, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchElevationPoints(points: Array<GeographicCoordinate>, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<ElevationPoint>>;
    /**
     * Fetches one web-mercator XYZ raster tile at the requested resolution.
     *
     * # Parameters
     * - `tile_x` — tile column.
     * - `tile_y` — tile row, counted from the north.
     * - `zoom_level` — zoom level of the tile.
     * - `image_format` — requested image encoding.
     * - `tile_resolution` — requested pixel resolution.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a raster-tile provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchRasterTile(tileX: number, tileY: number, zoomLevel: number, imageFormat: RasterImageFormat, tileResolution: RasterTileResolution, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RasterTileData>;
    /**
     * Returns per-segment flow observations inside the bounding box.
     *
     * # Parameters
     * - `bounding_box` — area to query.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a traffic-flow provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchTrafficFlow(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficFlowData>>;
    /**
     * Returns incidents that intersect the bounding box.
     *
     * # Parameters
     * - `bounding_box` — area to query.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a traffic-incidents provider, or
     * the provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchTrafficIncidents(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficIncident>>;
    /**
     * Delivers up to `maximum_count` of the most recent buffered events at
     * `minimum_severity` or above to the listener, oldest first, and returns
     * how many were delivered.
     *
     * The flush does not remove events, so a later flush can deliver them
     * again. The flush is bounded and synchronous; the listener must not
     * block.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     * - `maximum_count` — upper bound on delivered events.
     *
     * # Returns
     * The number of events delivered.
     */
    flushRecentDiagnosticEvents(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity, maximumCount: number): number;
    /**
     * Resolves a free-form address text into candidate places, best match
     * first.
     *
     * # Parameters
     * - `address_text` — the address to resolve.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a geocoding provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    forwardGeocode(addressText: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns the retained diagnostics of failed provider calls made by
     * foreign provider implementations, oldest first.
     *
     * A failure is recorded whether the implementation threw one of the
     * contract's `SdkError` variants or failed without a mapped error. The
     * buffer keeps a bounded number of the most recent failures and drops
     * older ones. Reading is non-destructive: the call neither records nor
     * clears entries. The typed error still surfaces at the failing call; this
     * readback lets a failure be classified after the fact. See
     * `ProviderFailureDiagnostic` for the fields of an entry.
     *
     * # Returns
     * The retained entries, oldest first.
     */
    latestProviderFailureDiagnostics(): Array<ProviderFailureDiagnostic>;
    /**
     * Reports which provider serves each capability, in a stable order, for
     * a settings surface or a startup check.
     *
     * Every capability the SDK defines appears in the answer, including the
     * ones with no provider installed; those carry an empty key and name and
     * `registered` false. The readback never mutates the registry.
     */
    providerRegistrations(): Array<ProviderRegistration>;
    /**
     * Reads the effective raster-tile caching terms of the installed cache,
     * for display on a settings page. Reports the time-to-live currently in
     * force (the category default, or the last accepted override clamped to
     * the provider's ceiling), the provider's declared ceiling, and the
     * category default. Read-only: the readback never mutates the cache.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed, naming
     * `TileCache` as the unconfigured backing store.
     */
    rasterTileCacheTerms(): TileCacheTerms;
    /**
     * Registers a distance-matrix implementation. The provider starts
     * serving `calculate_distance_matrix` once this call returns.
     */
    registerDistanceMatrixProviderFromForeign(distanceMatrixProvider: DistanceMatrixProvider): void;
    /**
     * Registers an elevation implementation. The provider starts serving
     * `fetch_elevation_points` once this call returns.
     */
    registerElevationProviderFromForeign(elevationProvider: ElevationProvider): void;
    /**
     * Registers a geocoding implementation. The provider starts serving
     * `forward_geocode` and `reverse_geocode` once this call returns.
     */
    registerGeocodingProviderFromForeign(geocodingProvider: GeocodingProvider): void;
    /**
     * Registers a raster-tile implementation. The provider starts serving
     * `fetch_raster_tile` once this call returns.
     */
    registerRasterTileProviderFromForeign(rasterTileProvider: RasterTileProvider): void;
    /**
     * Registers a routing implementation. The provider starts serving
     * `calculate_route` once this call returns.
     */
    registerRoutingProviderFromForeign(routingProvider: RoutingProvider): void;
    /**
     * Registers a place-search implementation. The provider starts serving
     * `search` and `suggest` once this call returns.
     */
    registerSearchPlaceProviderFromForeign(searchPlaceProvider: SearchPlaceProvider): void;
    /**
     * Registers a traffic-flow implementation. The provider starts serving
     * `fetch_traffic_flow` once this call returns.
     */
    registerTrafficFlowProviderFromForeign(trafficFlowProvider: TrafficFlowProvider): void;
    /**
     * Registers a traffic-incident implementation. The provider starts
     * serving `fetch_traffic_incidents` once this call returns.
     */
    registerTrafficIncidentProviderFromForeign(trafficIncidentProvider: TrafficIncidentProvider): void;
    /**
     * Registers a provider-neutral raster base map: any web-mercator XYZ
     * tileset that publishes a `{z}/{x}/{y}` URL template.
     *
     * The registration replaces the raster-tile contract only; every other
     * provider keeps serving. It also drops any installed tile cache, because
     * the cache's terms belong to the provider that installed it; a later
     * `raster_tile_cache_terms` then throws the not-configured error rather
     * than reporting another provider's ceiling. Re-registering replaces the
     * source.
     *
     * # Parameters
     * - `source` — the tile source and its terms.
     *
     * # Errors
     * A malformed template, a blank source name or an inverted zoom range
     * throws `InvalidCoordinateInput` with a precise detail, and the previous
     * source keeps serving.
     */
    registerUrlTemplateRasterTileSource(source: UrlTemplateRasterTileSource): void;
    /**
     * Registers a vector-tile implementation written in application code.
     * The provider starts serving `fetch_vector_tile` once this call returns,
     * and `MapView::set_provider_vector_tile_source` installs a base from it
     * when the source names the application key `application`.
     */
    registerVectorTileProviderFromForeign(vectorTileProvider: VectorTileProvider): void;
    /**
     * Resolves a coordinate into candidate places describing that position.
     *
     * # Parameters
     * - `coordinate` — the position to describe.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a geocoding provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    reverseGeocode(coordinate: GeographicCoordinate, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Reports which transport modes and which strategy the serving routing
     * provider can honour.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider.
     */
    routeCapabilities(): RouteCapabilities;
    /**
     * Returns full search results for a settled query.
     *
     * # Parameters
     * - `query_text` — the settled query.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    search(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Registers the provider named by `provider_key` from one credential,
     * exactly like `configure_provider_set`, and wraps its raster-tile
     * provider in a disk response cache.
     *
     * The key names a credentialed provider that serves raster tiles and
     * declares raster-tile caching terms. The registration installs every
     * capability that provider serves, so one call and one credential enable
     * the whole set. The cache is a SQLite database opened (or created) at
     * `tile_cache_database_path` and bounded by
     * `tile_cache_absolute_maximum_bytes`. Cached tile responses follow the
     * tiles category's time-to-live (thirty days by default, clamped to the
     * provider's declared terms ceiling); a cache miss goes to the network
     * and back-fills the cache, so pre-warmed tiles keep rendering when the
     * network is unavailable. Re-registration replaces the providers,
     * including the cached raster-tile provider.
     *
     * # Parameters
     * - `provider_key` — the stable key of a credentialed provider built into
     *   this SDK that serves raster tiles and declares caching terms.
     * - `credential` — the provider credential.
     * - `tile_cache_database_path` — non-empty absolute path of the cache
     *   database.
     * - `tile_cache_absolute_maximum_bytes` — positive byte budget of the
     *   cache.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when the key is unknown to this build,
     * and `ProviderRequestRejected` when the provider serves no raster tiles,
     * declares no raster-tile caching terms, or requires a credential and the
     * supplied one is blank. Throws `InvalidCoordinateInput` when the path is
     * empty or the byte budget is not positive, and `CacheOperationFailure`
     * when the cache cannot be opened or refuses the quota; the detail names
     * the reason verbatim.
     */
    setProviderCredentialWithTileCache(providerKey: string, credential: string, tileCacheDatabasePath: string, tileCacheAbsoluteMaximumBytes: bigint): void;
    /**
     * Overrides the installed raster-tile cache's time-to-live in seconds.
     *
     * A zero value is refused, because it would expire every entry on capture
     * and store nothing. A value above the installed provider's declared
     * terms ceiling is accepted, and the ceiling clamps what the cache stores;
     * `raster_tile_cache_terms` reports the effective value.
     *
     * # Parameters
     * - `time_to_live_seconds` — requested time-to-live.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed, naming
     * `TileCache` as the unconfigured backing store, and
     * `InvalidCoordinateInput` for a zero time-to-live.
     */
    setRasterTileCacheTimeToLive(timeToLiveSeconds: bigint): void;
    /**
     * Enables or disables the bounded, redacted response prefix carried by
     * provider request observations.
     *
     * The switch is off by default. While it is on, each provider request
     * observation carries the first 512 bytes of the response body in
     * `ProviderRequestTrace.response_excerpt`, truncated on a character
     * boundary, with credential-bearing JSON members and `name=value`
     * assignments replaced by `***`. Turning it off empties the field on the
     * observations that follow. The switch is process-wide.
     *
     * # Parameters
     * - `enabled` — whether observations capture the response prefix.
     */
    setResponseExcerptCapture(enabled: boolean): void;
    /**
     * Subscribes `listener` to the SDK's structured log events. Only events at
     * `minimum_severity` or above are delivered. Coordinates inside event
     * messages are rounded before delivery, and API keys are never included.
     *
     * Listener callbacks run on the threads that produce the events and must
     * not block. Subscribing an already subscribed listener replaces its
     * severity threshold.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     */
    subscribeToDiagnosticEvents(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity): void;
    /**
     * Returns fast completion candidates while the user types.
     *
     * # Parameters
     * - `query_text` — the text being typed.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    suggest(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Reads the installed tile payload cache's exact counters and occupancy,
     * for a diagnostics panel or a developer console.
     *
     * Both the raster base and the vector base fetch through the same
     * installed store, so one counter pair covers every payload lookup: a
     * hit was answered without a provider request and a miss went to the
     * provider (including a store read failure that degraded to a fetch).
     * The readback is read-only and never mutates the cache.
     *
     * # Returns
     * The counters and occupancy, or null when no tile cache is installed,
     * which is every browser session and a keyless native session.
     */
    tileCacheStatistics(): TileCacheStatistics | undefined;
    /**
     * Reads the serving traffic-flow cache's counters and budget, for a
     * diagnostics panel or a developer console.
     *
     * The hits and misses prove a repeated pane was answered without asking
     * the provider; the entry count and budget show how many cells the cache
     * holds and how many it may hold before the least recently used is
     * evicted. Read-only: the readback never mutates the cache.
     *
     * # Returns
     * The counters and configuration, or null when no traffic-flow provider
     * is registered or the registered provider owns its own freshness policy
     * and answers uncached.
     */
    trafficFlowCacheStatistics(): TrafficFlowCacheStatistics | undefined;
    /**
     * Reports whether a vector-tile provider is registered: `true` once
     * `register_vector_tile_provider_from_foreign` has returned, `false`
     * while the slot is empty.
     */
    vectorTileProviderIsRegistered(): boolean;
}
/**
 * @deprecated Use `MapSdkLike` instead.
 */
export type MapSdkInterface = MapSdkLike;
/**
 * Provider entry point of the SDK: resolves every call through the providers
 * registered on the object. Construct the object with no providers, then
 * register them: native integrations through the SDK's own registration calls
 * and foreign integrations through the `register_*_from_foreign` methods (see
 * the provider contract interfaces above). A call into a contract with no
 * registered provider throws `ProviderNotConfigured` naming the contract.
 *
 * The calls cover geocoding (forward and reverse), routing, distance matrix,
 * place search, traffic incidents, traffic flow, raster tiles and vector
 * tiles. Elevation and offline routing have no provider contract here:
 * offline routing is the standalone `offline_route_from_archive_bytes`
 * function.
 */
export declare class MapSdk extends UniffiAbstractObject implements MapSdkLike {
    readonly [uniffiTypeNameSymbol] = "MapSdk";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Creates the SDK with no providers registered. Register providers before
     * the first call that needs one.
     */
    constructor();
    /**
     * Calculates durations and distances for every origin-destination pair.
     *
     * # Parameters
     * - `origins` — origin points.
     * - `destinations` — destination points.
     * - `transportation_mode` — mode of transport for the matrix.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid point, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateDistanceMatrix(origins: Array<GeographicCoordinate>, destinations: Array<GeographicCoordinate>, transportationMode: TransportationMode, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<DistanceMatrix>;
    /**
     * Calculates a route through the ordered waypoints with the given
     * options.
     *
     * # Parameters
     * - `waypoints` — ordered route points; every one must be a valid
     *   coordinate.
     * - `route_options` — transport mode, strategy, units and avoid options.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid waypoint, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateRoute(waypoints: Array<GeographicCoordinate>, routeOptions: RouteOptions, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Route>;
    /**
     * Chooses the provider that serves one capability, leaving every other
     * capability untouched.
     *
     * The SDK builds provider implementations into the binary under stable
     * keys; this call is how an application selects one. A key may serve
     * several capabilities, so an application that wants one vendor
     * everywhere configures each capability in turn, or calls
     * `configure_provider_set` for the all-in-one convenience.
     *
     * # Parameters
     * - `contract` — the capability whose provider is being chosen.
     * - `provider_key` — the stable key of a provider built into this SDK
     *   build.
     * - `credential` — the provider's credential; an empty string is
     *   accepted only for a provider that needs none.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when the key is unknown to this build
     * or serves no implementation of `contract`, `ProviderRequestRejected`
     * when the provider declares a credential and the supplied one is blank,
     * and the provider's own failure when its construction fails. A refused
     * call leaves the previously serving provider in place.
     */
    configureProvider(contract: ProviderContract, providerKey: string, credential: string): void;
    /**
     * Registers every capability the provider named by `provider_key` serves
     * from one credential, with the SDK defaults for base URL, rate limiting
     * and retries.
     *
     * One call and one credential enable that provider's whole set — for the
     * full-service provider, geocoding, routing, distance matrix, place
     * search, traffic incidents, traffic flow and raster tiles. Re-registration
     * replaces every capability of the named provider. A capability the
     * provider does not serve stays on whichever provider served it before;
     * elevation has no provider and keeps throwing `ProviderNotConfigured`.
     * The raster-tile contract is installed uncached, so a previously
     * installed tile cache and its terms are dropped.
     *
     * # Parameters
     * - `provider_key` — the stable key of a provider built into this SDK.
     * - `credential` — the provider credential; a provider that requires one
     *   refuses a blank value.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when the key is unknown to this build and
     * `ProviderRequestRejected` when a required credential is blank; a
     * provider's own construction failure passes through verbatim.
     */
    configureProviderSet(providerKey: string, credential: string): void;
    /**
     * Fetches elevation samples for ordered points.
     *
     * # Parameters
     * - `points` — the coordinates to sample, in order.
     *
     * # Returns
     * One sample per requested point, in the same order.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without an elevation provider,
     * `InvalidCoordinateInput` for an invalid point, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchElevationPoints(points: Array<GeographicCoordinate>, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<ElevationPoint>>;
    /**
     * Fetches one web-mercator XYZ raster tile at the requested resolution.
     *
     * # Parameters
     * - `tile_x` — tile column.
     * - `tile_y` — tile row, counted from the north.
     * - `zoom_level` — zoom level of the tile.
     * - `image_format` — requested image encoding.
     * - `tile_resolution` — requested pixel resolution.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a raster-tile provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchRasterTile(tileX: number, tileY: number, zoomLevel: number, imageFormat: RasterImageFormat, tileResolution: RasterTileResolution, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RasterTileData>;
    /**
     * Returns per-segment flow observations inside the bounding box.
     *
     * # Parameters
     * - `bounding_box` — area to query.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a traffic-flow provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchTrafficFlow(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficFlowData>>;
    /**
     * Returns incidents that intersect the bounding box.
     *
     * # Parameters
     * - `bounding_box` — area to query.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a traffic-incidents provider, or
     * the provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    fetchTrafficIncidents(boundingBox: BoundingBox, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<TrafficIncident>>;
    /**
     * Delivers up to `maximum_count` of the most recent buffered events at
     * `minimum_severity` or above to the listener, oldest first, and returns
     * how many were delivered.
     *
     * The flush does not remove events, so a later flush can deliver them
     * again. The flush is bounded and synchronous; the listener must not
     * block.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     * - `maximum_count` — upper bound on delivered events.
     *
     * # Returns
     * The number of events delivered.
     */
    flushRecentDiagnosticEvents(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity, maximumCount: number): number;
    /**
     * Resolves a free-form address text into candidate places, best match
     * first.
     *
     * # Parameters
     * - `address_text` — the address to resolve.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a geocoding provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    forwardGeocode(addressText: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns the retained diagnostics of failed provider calls made by
     * foreign provider implementations, oldest first.
     *
     * A failure is recorded whether the implementation threw one of the
     * contract's `SdkError` variants or failed without a mapped error. The
     * buffer keeps a bounded number of the most recent failures and drops
     * older ones. Reading is non-destructive: the call neither records nor
     * clears entries. The typed error still surfaces at the failing call; this
     * readback lets a failure be classified after the fact. See
     * `ProviderFailureDiagnostic` for the fields of an entry.
     *
     * # Returns
     * The retained entries, oldest first.
     */
    latestProviderFailureDiagnostics(): Array<ProviderFailureDiagnostic>;
    /**
     * Reports which provider serves each capability, in a stable order, for
     * a settings surface or a startup check.
     *
     * Every capability the SDK defines appears in the answer, including the
     * ones with no provider installed; those carry an empty key and name and
     * `registered` false. The readback never mutates the registry.
     */
    providerRegistrations(): Array<ProviderRegistration>;
    /**
     * Reads the effective raster-tile caching terms of the installed cache,
     * for display on a settings page. Reports the time-to-live currently in
     * force (the category default, or the last accepted override clamped to
     * the provider's ceiling), the provider's declared ceiling, and the
     * category default. Read-only: the readback never mutates the cache.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed, naming
     * `TileCache` as the unconfigured backing store.
     */
    rasterTileCacheTerms(): TileCacheTerms;
    /**
     * Registers a distance-matrix implementation. The provider starts
     * serving `calculate_distance_matrix` once this call returns.
     */
    registerDistanceMatrixProviderFromForeign(distanceMatrixProvider: DistanceMatrixProvider): void;
    /**
     * Registers an elevation implementation. The provider starts serving
     * `fetch_elevation_points` once this call returns.
     */
    registerElevationProviderFromForeign(elevationProvider: ElevationProvider): void;
    /**
     * Registers a geocoding implementation. The provider starts serving
     * `forward_geocode` and `reverse_geocode` once this call returns.
     */
    registerGeocodingProviderFromForeign(geocodingProvider: GeocodingProvider): void;
    /**
     * Registers a raster-tile implementation. The provider starts serving
     * `fetch_raster_tile` once this call returns.
     */
    registerRasterTileProviderFromForeign(rasterTileProvider: RasterTileProvider): void;
    /**
     * Registers a routing implementation. The provider starts serving
     * `calculate_route` once this call returns.
     */
    registerRoutingProviderFromForeign(routingProvider: RoutingProvider): void;
    /**
     * Registers a place-search implementation. The provider starts serving
     * `search` and `suggest` once this call returns.
     */
    registerSearchPlaceProviderFromForeign(searchPlaceProvider: SearchPlaceProvider): void;
    /**
     * Registers a traffic-flow implementation. The provider starts serving
     * `fetch_traffic_flow` once this call returns.
     */
    registerTrafficFlowProviderFromForeign(trafficFlowProvider: TrafficFlowProvider): void;
    /**
     * Registers a traffic-incident implementation. The provider starts
     * serving `fetch_traffic_incidents` once this call returns.
     */
    registerTrafficIncidentProviderFromForeign(trafficIncidentProvider: TrafficIncidentProvider): void;
    /**
     * Registers a provider-neutral raster base map: any web-mercator XYZ
     * tileset that publishes a `{z}/{x}/{y}` URL template.
     *
     * The registration replaces the raster-tile contract only; every other
     * provider keeps serving. It also drops any installed tile cache, because
     * the cache's terms belong to the provider that installed it; a later
     * `raster_tile_cache_terms` then throws the not-configured error rather
     * than reporting another provider's ceiling. Re-registering replaces the
     * source.
     *
     * # Parameters
     * - `source` — the tile source and its terms.
     *
     * # Errors
     * A malformed template, a blank source name or an inverted zoom range
     * throws `InvalidCoordinateInput` with a precise detail, and the previous
     * source keeps serving.
     */
    registerUrlTemplateRasterTileSource(source: UrlTemplateRasterTileSource): void;
    /**
     * Registers a vector-tile implementation written in application code.
     * The provider starts serving `fetch_vector_tile` once this call returns,
     * and `MapView::set_provider_vector_tile_source` installs a base from it
     * when the source names the application key `application`.
     */
    registerVectorTileProviderFromForeign(vectorTileProvider: VectorTileProvider): void;
    /**
     * Resolves a coordinate into candidate places describing that position.
     *
     * # Parameters
     * - `coordinate` — the position to describe.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a geocoding provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    reverseGeocode(coordinate: GeographicCoordinate, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Reports which transport modes and which strategy the serving routing
     * provider can honour.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider.
     */
    routeCapabilities(): RouteCapabilities;
    /**
     * Returns full search results for a settled query.
     *
     * # Parameters
     * - `query_text` — the settled query.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    search(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Registers the provider named by `provider_key` from one credential,
     * exactly like `configure_provider_set`, and wraps its raster-tile
     * provider in a disk response cache.
     *
     * The key names a credentialed provider that serves raster tiles and
     * declares raster-tile caching terms. The registration installs every
     * capability that provider serves, so one call and one credential enable
     * the whole set. The cache is a SQLite database opened (or created) at
     * `tile_cache_database_path` and bounded by
     * `tile_cache_absolute_maximum_bytes`. Cached tile responses follow the
     * tiles category's time-to-live (thirty days by default, clamped to the
     * provider's declared terms ceiling); a cache miss goes to the network
     * and back-fills the cache, so pre-warmed tiles keep rendering when the
     * network is unavailable. Re-registration replaces the providers,
     * including the cached raster-tile provider.
     *
     * # Parameters
     * - `provider_key` — the stable key of a credentialed provider built into
     *   this SDK that serves raster tiles and declares caching terms.
     * - `credential` — the provider credential.
     * - `tile_cache_database_path` — non-empty absolute path of the cache
     *   database.
     * - `tile_cache_absolute_maximum_bytes` — positive byte budget of the
     *   cache.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when the key is unknown to this build,
     * and `ProviderRequestRejected` when the provider serves no raster tiles,
     * declares no raster-tile caching terms, or requires a credential and the
     * supplied one is blank. Throws `InvalidCoordinateInput` when the path is
     * empty or the byte budget is not positive, and `CacheOperationFailure`
     * when the cache cannot be opened or refuses the quota; the detail names
     * the reason verbatim.
     */
    setProviderCredentialWithTileCache(providerKey: string, credential: string, tileCacheDatabasePath: string, tileCacheAbsoluteMaximumBytes: bigint): void;
    /**
     * Overrides the installed raster-tile cache's time-to-live in seconds.
     *
     * A zero value is refused, because it would expire every entry on capture
     * and store nothing. A value above the installed provider's declared
     * terms ceiling is accepted, and the ceiling clamps what the cache stores;
     * `raster_tile_cache_terms` reports the effective value.
     *
     * # Parameters
     * - `time_to_live_seconds` — requested time-to-live.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed, naming
     * `TileCache` as the unconfigured backing store, and
     * `InvalidCoordinateInput` for a zero time-to-live.
     */
    setRasterTileCacheTimeToLive(timeToLiveSeconds: bigint): void;
    /**
     * Enables or disables the bounded, redacted response prefix carried by
     * provider request observations.
     *
     * The switch is off by default. While it is on, each provider request
     * observation carries the first 512 bytes of the response body in
     * `ProviderRequestTrace.response_excerpt`, truncated on a character
     * boundary, with credential-bearing JSON members and `name=value`
     * assignments replaced by `***`. Turning it off empties the field on the
     * observations that follow. The switch is process-wide.
     *
     * # Parameters
     * - `enabled` — whether observations capture the response prefix.
     */
    setResponseExcerptCapture(enabled: boolean): void;
    /**
     * Subscribes `listener` to the SDK's structured log events. Only events at
     * `minimum_severity` or above are delivered. Coordinates inside event
     * messages are rounded before delivery, and API keys are never included.
     *
     * Listener callbacks run on the threads that produce the events and must
     * not block. Subscribing an already subscribed listener replaces its
     * severity threshold.
     *
     * # Parameters
     * - `listener` — the diagnostics listener.
     * - `minimum_severity` — lowest severity delivered.
     */
    subscribeToDiagnosticEvents(listener: SdkDiagnosticEventListener, minimumSeverity: SdkLogSeverity): void;
    /**
     * Returns fast completion candidates while the user types.
     *
     * # Parameters
     * - `query_text` — the text being typed.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    suggest(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Reads the installed tile payload cache's exact counters and occupancy,
     * for a diagnostics panel or a developer console.
     *
     * Both the raster base and the vector base fetch through the same
     * installed store, so one counter pair covers every payload lookup: a
     * hit was answered without a provider request and a miss went to the
     * provider (including a store read failure that degraded to a fetch).
     * The readback is read-only and never mutates the cache.
     *
     * # Returns
     * The counters and occupancy, or null when no tile cache is installed,
     * which is every browser session and a keyless native session.
     */
    tileCacheStatistics(): TileCacheStatistics | undefined;
    /**
     * Reads the serving traffic-flow cache's counters and budget, for a
     * diagnostics panel or a developer console.
     *
     * The hits and misses prove a repeated pane was answered without asking
     * the provider; the entry count and budget show how many cells the cache
     * holds and how many it may hold before the least recently used is
     * evicted. Read-only: the readback never mutates the cache.
     *
     * # Returns
     * The counters and configuration, or null when no traffic-flow provider
     * is registered or the registered provider owns its own freshness policy
     * and answers uncached.
     */
    trafficFlowCacheStatistics(): TrafficFlowCacheStatistics | undefined;
    /**
     * Reports whether a vector-tile provider is registered: `true` once
     * `register_vector_tile_provider_from_foreign` has returned, `false`
     * while the slot is empty.
     */
    vectorTileProviderIsRegistered(): boolean;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is MapSdk;
}
/**
 * Navigation event listener. Implement this interface and subscribe it on
 * `Navigator`; each subscription delivers only the topic it was registered
 * for.
 *
 * # Threading
 * Callbacks run synchronously on the thread that drives the controller and
 * must not block. A callback that calls back into the controller while a
 * dispatch is in flight is suppressed: the state change behind it is already
 * applied, and only its broadcast is skipped.
 */
export interface NavigationListener {
    /**
     * Receives a deviation-status update (the deviation topic): off route on
     * entry and on every recorded measurement update while the deviation
     * persists, and on route when it clears.
     */
    onDeviationStatusChange(deviationStatusChange: DeviationStatusChange): void;
    /**
     * Receives the composed instruction payload of every dispatched state
     * change (the instructions topic).
     */
    onNavigationInstruction(instruction: NavigationInstruction): void;
    /**
     * Receives one phase transition per dispatched trip-state transition (the
     * phase topic).
     */
    onNavigationPhaseChange(navigationPhaseChange: NavigationPhaseChange): void;
    /**
     * Receives one utterance trigger when the controller's distance-band
     * policy judges the current fix newsworthy, for example when a trigger
     * band is crossed. The text is the composed speech text, verbatim and
     * never rewritten; playback and speech synthesis remain the
     * application's responsibility.
     */
    onSpeechInstruction(speechInstruction: SpeechInstruction): void;
}
/**
 * Navigation event listener. Implement this interface and subscribe it on
 * `Navigator`; each subscription delivers only the topic it was registered
 * for.
 *
 * # Threading
 * Callbacks run synchronously on the thread that drives the controller and
 * must not block. A callback that calls back into the controller while a
 * dispatch is in flight is suppressed: the state change behind it is already
 * applied, and only its broadcast is skipped.
 */
export declare class NavigationListenerImpl extends UniffiAbstractObject implements NavigationListener {
    readonly [uniffiTypeNameSymbol] = "NavigationListenerImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Receives a deviation-status update (the deviation topic): off route on
     * entry and on every recorded measurement update while the deviation
     * persists, and on route when it clears.
     */
    onDeviationStatusChange(deviationStatusChange: DeviationStatusChange): void;
    /**
     * Receives the composed instruction payload of every dispatched state
     * change (the instructions topic).
     */
    onNavigationInstruction(instruction: NavigationInstruction): void;
    /**
     * Receives one phase transition per dispatched trip-state transition (the
     * phase topic).
     */
    onNavigationPhaseChange(navigationPhaseChange: NavigationPhaseChange): void;
    /**
     * Receives one utterance trigger when the controller's distance-band
     * policy judges the current fix newsworthy, for example when a trigger
     * band is crossed. The text is the composed speech text, verbatim and
     * never rewritten; playback and speech synthesis remain the
     * application's responsibility.
     */
    onSpeechInstruction(speechInstruction: SpeechInstruction): void;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is NavigationListenerImpl;
}
/**
 * Handle for exactly one `(topic, listener)` subscription. Cancelling is
 * explicit and idempotent; dropping the handle does not unsubscribe.
 */
export interface SubscriptionLike {
    /**
     * Cancels this subscription, so the listener stops receiving the
     * subscription's topic from the next dispatch on. Idempotent.
     */
    cancel(): void;
}
/**
 * @deprecated Use `SubscriptionLike` instead.
 */
export type SubscriptionInterface = SubscriptionLike;
/**
 * Handle for exactly one `(topic, listener)` subscription. Cancelling is
 * explicit and idempotent; dropping the handle does not unsubscribe.
 */
export declare class Subscription extends UniffiAbstractObject implements SubscriptionLike {
    readonly [uniffiTypeNameSymbol] = "Subscription";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Cancels this subscription, so the listener stops receiving the
     * subscription's topic from the next dispatch on. Idempotent.
     */
    cancel(): void;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is Subscription;
}
/**
 * The navigation controller: starts and stops trips, accepts position fixes
 * and reroutes, broadcasts every state change to the registered listeners,
 * and answers read-only state and instruction queries. Obtain routes from
 * `MapSdk::calculate_route` or `offline_route_from_archive_bytes` and start a
 * trip on them with this controller.
 *
 * The listener callbacks run synchronously on the thread that drives the
 * controller call; a listener calling back into the controller while a
 * dispatch is still in flight is suppressed, and only the broadcast is
 * skipped. The controller never holds its state lock across a listener
 * callback.
 */
export interface NavigatorLike {
    /**
     * Subscribes one listener to all four navigation topics (instructions,
     * deviation status, phase changes and speech instructions) in one call and
     * answers the composite subscription that cancels all four.
     *
     * Delivery semantics match the four individual `subscribe_to_*` calls: the
     * listener receives each topic on its own method, in registration order,
     * and `cancel()` removes every one of the four registrations (idempotent,
     * like a single-topic subscription).
     */
    addNavigationListener(listener: NavigationListener): SubscriptionLike;
    /**
     * Replaces the route of the active trip (a reroute).
     *
     * The replacement route must be anchored at the trip's current snapped
     * coordinate. The step-advance strategy for the new route is configured by
     * `step_advance_policy`; the deviation policy persists. A reroute offered
     * to an arrived trip is ignored, and without an active trip the event is
     * dropped. An in-flight reroute calculation is settled by this call
     * whether the route is applied or ignored, so the calculation gate reopens
     * after the integrator acts.
     *
     * # Errors
     * Throws `InvalidNavigationInput` for an invalid policy or an unrecognized
     * maneuver label.
     */
    applyReroute(route: Route, stepAdvancePolicy: StepAdvancePolicy): void;
    /**
     * Applies the reroute-recalculation gates to one reroute request.
     *
     * Returns true when every gate passes (no calculation in flight, outside
     * the cooldown window and, when both fix references exist, beyond the
     * movement threshold) and a calculation is marked as in flight, readable as
     * the trip state's `is_calculating_new_route`; returns false when the
     * request is refused. A request without an open, still-navigable trip (no
     * trip, or an arrived trip) is refused before the gates are consulted.
     *
     * A caller that receives true owes a settle: either the eventual
     * `apply_reroute` (applied or ignored) or `cancel_reroute_calculation`. The
     * trip's first attempt always passes the cooldown and movement gates.
     *
     * # Returns
     * True when the request passed the gates and a calculation is in flight.
     */
    beginRerouteCalculation(): boolean;
    /**
     * Settles an in-flight reroute calculation without applying a route, for
     * example when the integrator abandons the request. The calculation gate
     * reopens; the cooldown keeps running from the calculation's beginning and
     * the movement reference stays where it was. Idempotent.
     */
    cancelRerouteCalculation(): void;
    /**
     * Replaces the reroute-recalculation hysteresis policy in force, keeping
     * the gate's recorded state.
     *
     * # Parameters
     * - `reroute_policy` — cooldown and movement thresholds.
     *
     * # Errors
     * Throws `InvalidNavigationInput` when a threshold is not finite or is
     * negative; the policy in force is then untouched.
     */
    configureReroutePolicy(reroutePolicy: ReroutePolicy): void;
    /**
     * The composed turn-by-turn instruction payload of the current trip state,
     * or null without an active trip. Repeated reads of an unchanged state
     * return the same payload.
     */
    currentInstructions(): NavigationInstruction | undefined;
    /**
     * The state of the active trip, or null without one.
     */
    currentTripState(): TripNavigationState | undefined;
    /**
     * Begins navigating `route` with the given policies, replacing any active
     * trip. The initial instruction payload is dispatched; no deviation or
     * phase transitions exist yet. A route without traversable steps
     * represents an already-arrived trip.
     *
     * # Parameters
     * - `route` — the route to navigate.
     * - `unit_system` — units used in composed instruction text.
     * - `step_advance_policy` — step-advance strategy and thresholds.
     * - `deviation_policy` — off-route detection thresholds.
     *
     * # Errors
     * Throws `InvalidNavigationInput` for policies with non-finite or negative
     * thresholds, or for a route whose step maneuver label the SDK does not
     * recognize.
     */
    startNavigation(route: Route, unitSystem: UnitSystem, stepAdvancePolicy: StepAdvancePolicy, deviationPolicy: DeviationPolicy): void;
    /**
     * Ends the active trip and clears the trip state: after this call
     * `current_trip_state` and `current_instructions` answer null, and location
     * updates, reroutes and reroute requests are dropped until
     * `start_navigation` begins a new trip.
     *
     * The speech-trigger band memory and the reroute-recalculation gate are
     * reset with the trip; utterance identifiers stay monotonic across the stop
     * and the configured reroute policy persists. Listener subscriptions are
     * untouched and keep delivering the next trip's events. Stopping without an
     * active trip is a no-op.
     */
    stopNavigation(): void;
    /**
     * Subscribes the listener to the deviation-status topic, in registration
     * order.
     */
    subscribeToDeviationStatus(listener: NavigationListener): SubscriptionLike;
    /**
     * Subscribes the listener to the instructions topic: the composed
     * instruction payload of every dispatched state change, in registration
     * order.
     */
    subscribeToNavigationInstructions(listener: NavigationListener): SubscriptionLike;
    /**
     * Subscribes the listener to the phase-transition topic, in registration
     * order.
     */
    subscribeToPhaseChanges(listener: NavigationListener): SubscriptionLike;
    /**
     * Subscribes the listener to the speech-instruction trigger topic, in
     * registration order.
     *
     * The controller decides when a line is worth speaking. Trigger bands reuse
     * the display phrase's distance bands, so a spoken "in 100 meters" matches
     * the phrase shown in the payload; each band announces at most once per
     * step, and a minimum inter-utterance spacing and repeat distance suppress
     * chatter. Speech synthesis and playback remain the application's
     * responsibility.
     */
    subscribeToSpeechInstructions(listener: NavigationListener): SubscriptionLike;
    /**
     * Delivers one position fix to the active trip; without an active trip the
     * fix is dropped. Fixes without an accuracy report never trigger a step
     * advance and are never judged by the deviation detector.
     */
    updateLocation(locationUpdate: NavigationLocationUpdate): void;
}
/**
 * @deprecated Use `NavigatorLike` instead.
 */
export type NavigatorInterface = NavigatorLike;
/**
 * The navigation controller: starts and stops trips, accepts position fixes
 * and reroutes, broadcasts every state change to the registered listeners,
 * and answers read-only state and instruction queries. Obtain routes from
 * `MapSdk::calculate_route` or `offline_route_from_archive_bytes` and start a
 * trip on them with this controller.
 *
 * The listener callbacks run synchronously on the thread that drives the
 * controller call; a listener calling back into the controller while a
 * dispatch is still in flight is suppressed, and only the broadcast is
 * skipped. The controller never holds its state lock across a listener
 * callback.
 */
export declare class Navigator extends UniffiAbstractObject implements NavigatorLike {
    readonly [uniffiTypeNameSymbol] = "Navigator";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds the controller with no active trip and no subscriptions.
     */
    constructor();
    /**
     * Subscribes one listener to all four navigation topics (instructions,
     * deviation status, phase changes and speech instructions) in one call and
     * answers the composite subscription that cancels all four.
     *
     * Delivery semantics match the four individual `subscribe_to_*` calls: the
     * listener receives each topic on its own method, in registration order,
     * and `cancel()` removes every one of the four registrations (idempotent,
     * like a single-topic subscription).
     */
    addNavigationListener(listener: NavigationListener): SubscriptionLike;
    /**
     * Replaces the route of the active trip (a reroute).
     *
     * The replacement route must be anchored at the trip's current snapped
     * coordinate. The step-advance strategy for the new route is configured by
     * `step_advance_policy`; the deviation policy persists. A reroute offered
     * to an arrived trip is ignored, and without an active trip the event is
     * dropped. An in-flight reroute calculation is settled by this call
     * whether the route is applied or ignored, so the calculation gate reopens
     * after the integrator acts.
     *
     * # Errors
     * Throws `InvalidNavigationInput` for an invalid policy or an unrecognized
     * maneuver label.
     */
    applyReroute(route: Route, stepAdvancePolicy: StepAdvancePolicy): void;
    /**
     * Applies the reroute-recalculation gates to one reroute request.
     *
     * Returns true when every gate passes (no calculation in flight, outside
     * the cooldown window and, when both fix references exist, beyond the
     * movement threshold) and a calculation is marked as in flight, readable as
     * the trip state's `is_calculating_new_route`; returns false when the
     * request is refused. A request without an open, still-navigable trip (no
     * trip, or an arrived trip) is refused before the gates are consulted.
     *
     * A caller that receives true owes a settle: either the eventual
     * `apply_reroute` (applied or ignored) or `cancel_reroute_calculation`. The
     * trip's first attempt always passes the cooldown and movement gates.
     *
     * # Returns
     * True when the request passed the gates and a calculation is in flight.
     */
    beginRerouteCalculation(): boolean;
    /**
     * Settles an in-flight reroute calculation without applying a route, for
     * example when the integrator abandons the request. The calculation gate
     * reopens; the cooldown keeps running from the calculation's beginning and
     * the movement reference stays where it was. Idempotent.
     */
    cancelRerouteCalculation(): void;
    /**
     * Replaces the reroute-recalculation hysteresis policy in force, keeping
     * the gate's recorded state.
     *
     * # Parameters
     * - `reroute_policy` — cooldown and movement thresholds.
     *
     * # Errors
     * Throws `InvalidNavigationInput` when a threshold is not finite or is
     * negative; the policy in force is then untouched.
     */
    configureReroutePolicy(reroutePolicy: ReroutePolicy): void;
    /**
     * The composed turn-by-turn instruction payload of the current trip state,
     * or null without an active trip. Repeated reads of an unchanged state
     * return the same payload.
     */
    currentInstructions(): NavigationInstruction | undefined;
    /**
     * The state of the active trip, or null without one.
     */
    currentTripState(): TripNavigationState | undefined;
    /**
     * Begins navigating `route` with the given policies, replacing any active
     * trip. The initial instruction payload is dispatched; no deviation or
     * phase transitions exist yet. A route without traversable steps
     * represents an already-arrived trip.
     *
     * # Parameters
     * - `route` — the route to navigate.
     * - `unit_system` — units used in composed instruction text.
     * - `step_advance_policy` — step-advance strategy and thresholds.
     * - `deviation_policy` — off-route detection thresholds.
     *
     * # Errors
     * Throws `InvalidNavigationInput` for policies with non-finite or negative
     * thresholds, or for a route whose step maneuver label the SDK does not
     * recognize.
     */
    startNavigation(route: Route, unitSystem: UnitSystem, stepAdvancePolicy: StepAdvancePolicy, deviationPolicy: DeviationPolicy): void;
    /**
     * Ends the active trip and clears the trip state: after this call
     * `current_trip_state` and `current_instructions` answer null, and location
     * updates, reroutes and reroute requests are dropped until
     * `start_navigation` begins a new trip.
     *
     * The speech-trigger band memory and the reroute-recalculation gate are
     * reset with the trip; utterance identifiers stay monotonic across the stop
     * and the configured reroute policy persists. Listener subscriptions are
     * untouched and keep delivering the next trip's events. Stopping without an
     * active trip is a no-op.
     */
    stopNavigation(): void;
    /**
     * Subscribes the listener to the deviation-status topic, in registration
     * order.
     */
    subscribeToDeviationStatus(listener: NavigationListener): SubscriptionLike;
    /**
     * Subscribes the listener to the instructions topic: the composed
     * instruction payload of every dispatched state change, in registration
     * order.
     */
    subscribeToNavigationInstructions(listener: NavigationListener): SubscriptionLike;
    /**
     * Subscribes the listener to the phase-transition topic, in registration
     * order.
     */
    subscribeToPhaseChanges(listener: NavigationListener): SubscriptionLike;
    /**
     * Subscribes the listener to the speech-instruction trigger topic, in
     * registration order.
     *
     * The controller decides when a line is worth speaking. Trigger bands reuse
     * the display phrase's distance bands, so a spoken "in 100 meters" matches
     * the phrase shown in the payload; each band announces at most once per
     * step, and a minimum inter-utterance spacing and repeat distance suppress
     * chatter. Speech synthesis and playback remain the application's
     * responsibility.
     */
    subscribeToSpeechInstructions(listener: NavigationListener): SubscriptionLike;
    /**
     * Delivers one position fix to the active trip; without an active trip the
     * fix is dropped. Fixes without an accuracy report never trigger a step
     * advance and are never judged by the deviation detector.
     */
    updateLocation(locationUpdate: NavigationLocationUpdate): void;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is Navigator;
}
/**
 * Offline region download progress listener. Implement this interface and
 * pass it to `OfflineManager::download_region`.
 *
 * # Progress
 * The listener receives one `Downloading` report with zero completions before
 * the first tile, one `Downloading` report per completed tile, and exactly
 * one terminal report: `Completed`, `Cancelled` or `Failed`. The counts are
 * the download's own honest totals, distinguishing tiles fetched from the
 * provider from tiles the store already held.
 *
 * # Threading
 * Callbacks run on an SDK worker thread, never on the caller's thread. They
 * must not block and must not call back into the same `OfflineManager`; a
 * platform surface marshals to its UI thread.
 */
export interface RegionDownloadProgressListener {
    /**
     * Receives one progress report.
     */
    onRegionDownloadProgress(progress: RegionDownloadProgress): void;
}
/**
 * Offline region download progress listener. Implement this interface and
 * pass it to `OfflineManager::download_region`.
 *
 * # Progress
 * The listener receives one `Downloading` report with zero completions before
 * the first tile, one `Downloading` report per completed tile, and exactly
 * one terminal report: `Completed`, `Cancelled` or `Failed`. The counts are
 * the download's own honest totals, distinguishing tiles fetched from the
 * provider from tiles the store already held.
 *
 * # Threading
 * Callbacks run on an SDK worker thread, never on the caller's thread. They
 * must not block and must not call back into the same `OfflineManager`; a
 * platform surface marshals to its UI thread.
 */
export declare class RegionDownloadProgressListenerImpl extends UniffiAbstractObject implements RegionDownloadProgressListener {
    readonly [uniffiTypeNameSymbol] = "RegionDownloadProgressListenerImpl";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    private constructor();
    /**
     * Receives one progress report.
     */
    onRegionDownloadProgress(progress: RegionDownloadProgress): void;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is RegionDownloadProgressListenerImpl;
}
/**
 * Offline tile-cache settings facade over a `MapSdk`. The members behave like
 * `MapSdk::raster_tile_cache_terms` and
 * `MapSdk::set_raster_tile_cache_time_to_live`: without a cache installed
 * through `set_provider_credential_with_tile_cache`, both throw
 * `ProviderNotConfigured` naming `TileCache`.
 */
export interface OfflineManagerLike {
    /**
     * Cancels the region's in-flight download if one exists. Cancellation is
     * idempotent and a successful partial result: the partial region is kept
     * and resumable. A no-op for an unknown, finished or already cancelled
     * region.
     *
     * # Parameters
     * - `region_id` — the region whose download is cancelled.
     */
    cancelRegionDownload(regionId: string): void;
    /**
     * Deletes the region's stored tiles and its membership, and answers what
     * was removed. A tile another live region still claims is kept.
     *
     * # Parameters
     * - `region_id` — the region to delete.
     *
     * # Returns
     * The removed entry count and payload bytes.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed and `InvalidCoordinateInput` naming the identifier when no
     * region is stored under it.
     */
    deleteRegion(regionId: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RegionRemovalReport>;
    /**
     * Downloads the region's tiles into the installed cache and answers the
     * region's record as it stands on disk afterwards. The download reports
     * progress to `progress_listener` and is resumable: a failure or a
     * cancellation keeps the tiles that did arrive and the membership that
     * names the missing ones, so the next call fetches only those.
     *
     * A region already downloading is refused; a different region downloads
     * concurrently.
     *
     * # Parameters
     * - `region` — the region to download.
     * - `progress_listener` — receives the download's progress reports.
     *
     * # Returns
     * The region's record after the download. A cancelled download answers
     * the partial record with a terminal `Cancelled` report, not an error.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed; `InvalidCoordinateInput` for an invalid definition or a
     * region above the provider's declared maximum zoom level; the
     * provider's typed failure when a tile cannot be fetched; and
     * `CacheOperationFailure` when the region is already downloading or the
     * store refuses a write.
     */
    downloadRegion(region: RegionDefinition, progressListener: RegionDownloadProgressListener, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RegionRecord>;
    /**
     * Reads one stored region's record.
     *
     * # Parameters
     * - `region_id` — the region to read.
     *
     * # Returns
     * The region's record, or null when no region is stored under the
     * identifier.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed, and `CacheOperationFailure` when the stored record is
     * corrupted.
     */
    regionRecord(regionId: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RegionRecord | undefined>;
    /**
     * Lists every region stored on disk, in the store's listing order.
     *
     * # Returns
     * The stored regions' records.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed, and `CacheOperationFailure` when a stored record is
     * corrupted.
     */
    regionRecords(asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<RegionRecord>>;
    /**
     * Answers how many tiles the region enumerates, so a settings surface can
     * warn about a large download before starting it. The call only validates
     * the definition and enumerates tiles; nothing is written.
     *
     * # Parameters
     * - `region` — the region to size.
     *
     * # Returns
     * The number of tiles the region's zoom range and bounding box enumerate.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed, and `InvalidCoordinateInput` when the bounding box is not
     * canonical, the zoom range is inverted, the maximum zoom level exceeds
     * the installed provider's declared maximum, the requested retention is
     * zero, or the region enumerates more than the supported tile cap.
     */
    regionTileCount(region: RegionDefinition): bigint;
    /**
     * Reserves a payload-byte budget for tile packs beside the general
     * LRU cache. Every later `download_region` enforces it: a download that
     * would take its pack past the budget stops, keeps the tiles already
     * stored and their membership, and reports `CacheOperationFailure`; a
     * later call under a raised budget resumes the remaining tiles.
     *
     * The budget is its own reserve, so ordinary cache eviction never frees
     * a present pack tile, and the structural 65,536-tile cap remains the
     * only tile-count limit. A region download that would exceed the
     * provider's own cache retention terms stores at those terms exactly as
     * before.
     *
     * # Parameters
     * - `byte_budget` — maximum payload bytes the packs may hold.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed and `InvalidCoordinateInput` for a zero budget, which would
     * refuse every pack download.
     */
    setTilePackByteBudget(byteBudget: bigint): void;
    /**
     * Overrides the installed raster-tile cache's time-to-live in seconds; the
     * provider's declared terms ceiling still clamps what the cache stores, and
     * `tile_cache_terms` reports the effective value.
     *
     * # Parameters
     * - `time_to_live_seconds` — requested time-to-live.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed and
     * `InvalidCoordinateInput` for a zero time-to-live.
     */
    setTileTimeToLive(timeToLiveSeconds: bigint): void;
    /**
     * Reads the effective raster-tile caching terms of the installed cache.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed.
     */
    tileCacheTerms(): TileCacheTerms;
    /**
     * Reads the effective payload-byte budget reserved for tile packs. The
     * value is the last accepted reservation, or the SDK default when the
     * application has not reserved one; the readback never changes the
     * cache.
     *
     * # Returns
     * The effective pack byte budget in bytes.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed.
     */
    tilePackByteBudget(): bigint;
}
/**
 * @deprecated Use `OfflineManagerLike` instead.
 */
export type OfflineManagerInterface = OfflineManagerLike;
/**
 * Offline tile-cache settings facade over a `MapSdk`. The members behave like
 * `MapSdk::raster_tile_cache_terms` and
 * `MapSdk::set_raster_tile_cache_time_to_live`: without a cache installed
 * through `set_provider_credential_with_tile_cache`, both throw
 * `ProviderNotConfigured` naming `TileCache`.
 */
export declare class OfflineManager extends UniffiAbstractObject implements OfflineManagerLike {
    readonly [uniffiTypeNameSymbol] = "OfflineManager";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds the manager over the SDK whose installed tile cache it reads and
     * tunes.
     */
    constructor(mapSdk: MapSdkLike);
    /**
     * Cancels the region's in-flight download if one exists. Cancellation is
     * idempotent and a successful partial result: the partial region is kept
     * and resumable. A no-op for an unknown, finished or already cancelled
     * region.
     *
     * # Parameters
     * - `region_id` — the region whose download is cancelled.
     */
    cancelRegionDownload(regionId: string): void;
    /**
     * Deletes the region's stored tiles and its membership, and answers what
     * was removed. A tile another live region still claims is kept.
     *
     * # Parameters
     * - `region_id` — the region to delete.
     *
     * # Returns
     * The removed entry count and payload bytes.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed and `InvalidCoordinateInput` naming the identifier when no
     * region is stored under it.
     */
    deleteRegion(regionId: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RegionRemovalReport>;
    /**
     * Downloads the region's tiles into the installed cache and answers the
     * region's record as it stands on disk afterwards. The download reports
     * progress to `progress_listener` and is resumable: a failure or a
     * cancellation keeps the tiles that did arrive and the membership that
     * names the missing ones, so the next call fetches only those.
     *
     * A region already downloading is refused; a different region downloads
     * concurrently.
     *
     * # Parameters
     * - `region` — the region to download.
     * - `progress_listener` — receives the download's progress reports.
     *
     * # Returns
     * The region's record after the download. A cancelled download answers
     * the partial record with a terminal `Cancelled` report, not an error.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed; `InvalidCoordinateInput` for an invalid definition or a
     * region above the provider's declared maximum zoom level; the
     * provider's typed failure when a tile cannot be fetched; and
     * `CacheOperationFailure` when the region is already downloading or the
     * store refuses a write.
     */
    downloadRegion(region: RegionDefinition, progressListener: RegionDownloadProgressListener, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RegionRecord>;
    /**
     * Reads one stored region's record.
     *
     * # Parameters
     * - `region_id` — the region to read.
     *
     * # Returns
     * The region's record, or null when no region is stored under the
     * identifier.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed, and `CacheOperationFailure` when the stored record is
     * corrupted.
     */
    regionRecord(regionId: string, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<RegionRecord | undefined>;
    /**
     * Lists every region stored on disk, in the store's listing order.
     *
     * # Returns
     * The stored regions' records.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed, and `CacheOperationFailure` when a stored record is
     * corrupted.
     */
    regionRecords(asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<RegionRecord>>;
    /**
     * Answers how many tiles the region enumerates, so a settings surface can
     * warn about a large download before starting it. The call only validates
     * the definition and enumerates tiles; nothing is written.
     *
     * # Parameters
     * - `region` — the region to size.
     *
     * # Returns
     * The number of tiles the region's zoom range and bounding box enumerate.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed, and `InvalidCoordinateInput` when the bounding box is not
     * canonical, the zoom range is inverted, the maximum zoom level exceeds
     * the installed provider's declared maximum, the requested retention is
     * zero, or the region enumerates more than the supported tile cap.
     */
    regionTileCount(region: RegionDefinition): bigint;
    /**
     * Reserves a payload-byte budget for tile packs beside the general
     * LRU cache. Every later `download_region` enforces it: a download that
     * would take its pack past the budget stops, keeps the tiles already
     * stored and their membership, and reports `CacheOperationFailure`; a
     * later call under a raised budget resumes the remaining tiles.
     *
     * The budget is its own reserve, so ordinary cache eviction never frees
     * a present pack tile, and the structural 65,536-tile cap remains the
     * only tile-count limit. A region download that would exceed the
     * provider's own cache retention terms stores at those terms exactly as
     * before.
     *
     * # Parameters
     * - `byte_budget` — maximum payload bytes the packs may hold.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed and `InvalidCoordinateInput` for a zero budget, which would
     * refuse every pack download.
     */
    setTilePackByteBudget(byteBudget: bigint): void;
    /**
     * Overrides the installed raster-tile cache's time-to-live in seconds; the
     * provider's declared terms ceiling still clamps what the cache stores, and
     * `tile_cache_terms` reports the effective value.
     *
     * # Parameters
     * - `time_to_live_seconds` — requested time-to-live.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed and
     * `InvalidCoordinateInput` for a zero time-to-live.
     */
    setTileTimeToLive(timeToLiveSeconds: bigint): void;
    /**
     * Reads the effective raster-tile caching terms of the installed cache.
     *
     * # Errors
     * Throws `ProviderNotConfigured` when no tile cache is installed.
     */
    tileCacheTerms(): TileCacheTerms;
    /**
     * Reads the effective payload-byte budget reserved for tile packs. The
     * value is the last accepted reservation, or the SDK default when the
     * application has not reserved one; the readback never changes the
     * cache.
     *
     * # Returns
     * The effective pack byte budget in bytes.
     *
     * # Errors
     * Throws `ProviderNotConfigured` naming `TileCache` when no tile cache is
     * installed.
     */
    tilePackByteBudget(): bigint;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is OfflineManager;
}
/**
 * Validates and smooths one host's position stream.
 *
 * The host owns the operating system's location API and its permission
 * prompt, and reports the resulting fixes and failures here. The controller
 * validates each fix, ignores stationary repeats when smoothing course,
 * tracks staleness and records source failures, so the renderer's location
 * indicator, a follow camera and the navigation controller read one
 * consistent stream.
 */
export interface PositionControllerLike {
    /**
     * Accepts one fix from the host's source.
     *
     * # Parameters
     * - `fix` — the coordinate and the source's optional accuracy, course
     *   and timestamp.
     *
     * # Errors
     * The coordinate must be inside its canonical ranges and every reported
     * scalar must be finite (accuracy and timestamp also non-negative). An
     * invalid fix throws with the validator's detail and leaves the previous
     * state in force.
     */
    feedFix(fix: PositionFix): void;
    /**
     * Whether the latest fix is older than the staleness threshold at
     * `now_seconds`. A fix without a timestamp is never stale.
     */
    isStale(nowSeconds: number): boolean;
    /**
     * The latest accepted fix, or null before the first accepted one.
     */
    latestFix(): PositionFix | undefined;
    /**
     * The smoothed course across the most recent fixes that reported one, in
     * degrees clockwise from true north, or null when no fix carried a
     * course.
     */
    smoothedCourseDegrees(): number | undefined;
    /**
     * Records a source failure. The latest fix stays readable while the
     * source recovers; a later successful fix clears the status.
     */
    sourceFailed(error: PositionSourceError): void;
    /**
     * The last source failure, or null when the last event was a fix.
     */
    sourceStatus(): PositionSourceError | undefined;
}
/**
 * @deprecated Use `PositionControllerLike` instead.
 */
export type PositionControllerInterface = PositionControllerLike;
/**
 * Validates and smooths one host's position stream.
 *
 * The host owns the operating system's location API and its permission
 * prompt, and reports the resulting fixes and failures here. The controller
 * validates each fix, ignores stationary repeats when smoothing course,
 * tracks staleness and records source failures, so the renderer's location
 * indicator, a follow camera and the navigation controller read one
 * consistent stream.
 */
export declare class PositionController extends UniffiAbstractObject implements PositionControllerLike {
    readonly [uniffiTypeNameSymbol] = "PositionController";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds an empty controller with the default course-smoothing window
     * and staleness threshold.
     */
    constructor();
    /**
     * Accepts one fix from the host's source.
     *
     * # Parameters
     * - `fix` — the coordinate and the source's optional accuracy, course
     *   and timestamp.
     *
     * # Errors
     * The coordinate must be inside its canonical ranges and every reported
     * scalar must be finite (accuracy and timestamp also non-negative). An
     * invalid fix throws with the validator's detail and leaves the previous
     * state in force.
     */
    feedFix(fix: PositionFix): void;
    /**
     * Whether the latest fix is older than the staleness threshold at
     * `now_seconds`. A fix without a timestamp is never stale.
     */
    isStale(nowSeconds: number): boolean;
    /**
     * The latest accepted fix, or null before the first accepted one.
     */
    latestFix(): PositionFix | undefined;
    /**
     * The smoothed course across the most recent fixes that reported one, in
     * degrees clockwise from true north, or null when no fix carried a
     * course.
     */
    smoothedCourseDegrees(): number | undefined;
    /**
     * Records a source failure. The latest fix stays readable while the
     * source recovers; a later successful fix clears the status.
     */
    sourceFailed(error: PositionSourceError): void;
    /**
     * The last source failure, or null when the last event was a fix.
     */
    sourceStatus(): PositionSourceError | undefined;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is PositionController;
}
/**
 * An immutable simulated trip over one planned route: distance-parameterized
 * interpolation along the route's own polyline at a caller-chosen pace. The
 * SDK carries no pacing policy and no default speed.
 */
export interface RouteSimulatorLike {
    /**
     * The fix at `elapsed_seconds` of simulated travel, clamped into
     * `[0, total_duration_seconds()]`.
     */
    fixAtElapsedSeconds(elapsedSeconds: number): SimulatedTripFix;
    /**
     * The fix at `travelled_meters` from the route start, clamped into
     * `[0, total_distance_meters()]`.
     */
    fixAtTravelledMeters(travelledMeters: number): SimulatedTripFix;
    /**
     * Total length of the route's flattened polyline, in meters.
     */
    totalDistanceMeters(): number;
    /**
     * Total simulated travel time at the chosen pace, in seconds.
     */
    totalDurationSeconds(): number;
}
/**
 * @deprecated Use `RouteSimulatorLike` instead.
 */
export type RouteSimulatorInterface = RouteSimulatorLike;
/**
 * An immutable simulated trip over one planned route: distance-parameterized
 * interpolation along the route's own polyline at a caller-chosen pace. The
 * SDK carries no pacing policy and no default speed.
 */
export declare class RouteSimulator extends UniffiAbstractObject implements RouteSimulatorLike {
    readonly [uniffiTypeNameSymbol] = "RouteSimulator";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds the simulator over `route`.
     *
     * # Parameters
     * - `route` — the planned route to simulate.
     * - `pace` — travel speed and multiplier.
     *
     * # Errors
     * Throws when the pace's speed or multiplier is non-finite or not strictly
     * positive, or when the route's legs and steps carry no usable geometry.
     */
    constructor(route: Route, pace: SimulatedTripPace);
    /**
     * The fix at `elapsed_seconds` of simulated travel, clamped into
     * `[0, total_duration_seconds()]`.
     */
    fixAtElapsedSeconds(elapsedSeconds: number): SimulatedTripFix;
    /**
     * The fix at `travelled_meters` from the route start, clamped into
     * `[0, total_distance_meters()]`.
     */
    fixAtTravelledMeters(travelledMeters: number): SimulatedTripFix;
    /**
     * Total length of the route's flattened polyline, in meters.
     */
    totalDistanceMeters(): number;
    /**
     * Total simulated travel time at the chosen pace, in seconds.
     */
    totalDurationSeconds(): number;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is RouteSimulator;
}
/**
 * Routing facade over a `MapSdk`'s registered providers. Construction and
 * failure semantics match `SearchEngine`'s: the engine shares the SDK's
 * providers and behaves like the matching `MapSdk` members.
 */
export interface RoutingEngineLike {
    /**
     * Calculates durations and distances for every origin-destination pair.
     *
     * # Parameters
     * - `origins` — origin points.
     * - `destinations` — destination points.
     * - `transportation_mode` — mode of transport for the matrix.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid point, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateDistanceMatrix(origins: Array<GeographicCoordinate>, destinations: Array<GeographicCoordinate>, transportationMode: TransportationMode, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<DistanceMatrix>;
    /**
     * Calculates a route through the ordered waypoints with the given options.
     *
     * # Parameters
     * - `waypoints` — ordered route points; every one must be a valid
     *   coordinate.
     * - `route_options` — transport mode, strategy, units and avoid options.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid waypoint, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateRoute(waypoints: Array<GeographicCoordinate>, routeOptions: RouteOptions, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Route>;
    /**
     * Reports which transport modes and which strategy the serving routing
     * provider can honour.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider.
     */
    routeCapabilities(): RouteCapabilities;
}
/**
 * @deprecated Use `RoutingEngineLike` instead.
 */
export type RoutingEngineInterface = RoutingEngineLike;
/**
 * Routing facade over a `MapSdk`'s registered providers. Construction and
 * failure semantics match `SearchEngine`'s: the engine shares the SDK's
 * providers and behaves like the matching `MapSdk` members.
 */
export declare class RoutingEngine extends UniffiAbstractObject implements RoutingEngineLike {
    readonly [uniffiTypeNameSymbol] = "RoutingEngine";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds the engine over the SDK whose providers serve its calls.
     */
    constructor(mapSdk: MapSdkLike);
    /**
     * Calculates durations and distances for every origin-destination pair.
     *
     * # Parameters
     * - `origins` — origin points.
     * - `destinations` — destination points.
     * - `transportation_mode` — mode of transport for the matrix.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid point, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateDistanceMatrix(origins: Array<GeographicCoordinate>, destinations: Array<GeographicCoordinate>, transportationMode: TransportationMode, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<DistanceMatrix>;
    /**
     * Calculates a route through the ordered waypoints with the given options.
     *
     * # Parameters
     * - `waypoints` — ordered route points; every one must be a valid
     *   coordinate.
     * - `route_options` — transport mode, strategy, units and avoid options.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider,
     * `InvalidCoordinateInput` for an invalid waypoint, or the provider's own
     * typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    calculateRoute(waypoints: Array<GeographicCoordinate>, routeOptions: RouteOptions, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Route>;
    /**
     * Reports which transport modes and which strategy the serving routing
     * provider can honour.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a routing provider.
     */
    routeCapabilities(): RouteCapabilities;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is RoutingEngine;
}
/**
 * Search and geocoding facade over a `MapSdk`'s registered providers. A call
 * into an unregistered contract throws `ProviderNotConfigured` with the
 * contract name, exactly like the matching `MapSdk` member.
 */
export interface SearchEngineLike {
    /**
     * Resolves a coordinate into candidate places describing that position.
     *
     * # Parameters
     * - `coordinate` — the position to describe, in canonical degrees.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a geocoding provider,
     * `InvalidCoordinateInput` for an invalid coordinate, or the provider's
     * own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    reverseGeocode(coordinate: GeographicCoordinate, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns full search results for a settled query.
     *
     * # Parameters
     * - `query_text` — the settled query.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    search(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns fast completion candidates while the user types.
     *
     * # Parameters
     * - `query_text` — the text being typed.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    suggest(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
}
/**
 * @deprecated Use `SearchEngineLike` instead.
 */
export type SearchEngineInterface = SearchEngineLike;
/**
 * Search and geocoding facade over a `MapSdk`'s registered providers. A call
 * into an unregistered contract throws `ProviderNotConfigured` with the
 * contract name, exactly like the matching `MapSdk` member.
 */
export declare class SearchEngine extends UniffiAbstractObject implements SearchEngineLike {
    readonly [uniffiTypeNameSymbol] = "SearchEngine";
    readonly [destructorGuardSymbol]: UniffiGcObject;
    readonly [pointerLiteralSymbol]: UniffiHandle;
    /**
     * Builds the engine over the SDK whose providers serve its calls.
     */
    constructor(mapSdk: MapSdkLike);
    /**
     * Resolves a coordinate into candidate places describing that position.
     *
     * # Parameters
     * - `coordinate` — the position to describe, in canonical degrees.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a geocoding provider,
     * `InvalidCoordinateInput` for an invalid coordinate, or the provider's
     * own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    reverseGeocode(coordinate: GeographicCoordinate, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns full search results for a settled query.
     *
     * # Parameters
     * - `query_text` — the settled query.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    search(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    /**
     * Returns fast completion candidates while the user types.
     *
     * # Parameters
     * - `query_text` — the text being typed.
     * - `search_boundary` — optional area that restricts the search.
     *
     * # Errors
     * Throws `ProviderNotConfigured` without a place-search provider, or the
     * provider's own typed failure.
     *
     * # Async
     * Runs asynchronously; the call does not block the calling thread.
     */
    suggest(queryText: string, searchBoundary: BoundingBox | undefined, asyncOpts_?: {
        signal: AbortSignal;
    }): Promise<Array<Place>>;
    uniffiDestroy(): void;
    static instanceOf(obj_: any): obj_ is SearchEngine;
}
/**
 * This should be called before anything else.
 *
 * It is likely that this is being done for you by the library's `index.ts`.
 *
 * It checks versions of uniffi between when the Rust scaffolding was generated
 * and when the bindings were generated.
 *
 * It also initializes the machinery to enable Rust to talk back to Javascript.
 */
declare function uniffiEnsureInitialized(): void;
declare const _default: Readonly<{
    initialize: typeof uniffiEnsureInitialized;
    converters: {
        FfiConverterTypeActiveManeuverInstruction: {
            readFromCursor(c: Cursor): ActiveManeuverInstruction;
            writeIntoCursor(value: ActiveManeuverInstruction, c: Cursor): void;
            allocationSize(value: ActiveManeuverInstruction): number;
            lift(value: UniffiByteArray): ActiveManeuverInstruction;
            lower(value: ActiveManeuverInstruction, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeAvoidOptions: {
            readFromCursor(c: Cursor): AvoidOptions;
            writeIntoCursor(value: AvoidOptions, c: Cursor): void;
            allocationSize(value: AvoidOptions): number;
            lift(value: UniffiByteArray): AvoidOptions;
            lower(value: AvoidOptions, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeBoundingBox: {
            readFromCursor(c: Cursor): BoundingBox;
            writeIntoCursor(value: BoundingBox, c: Cursor): void;
            allocationSize(value: BoundingBox): number;
            lift(value: UniffiByteArray): BoundingBox;
            lower(value: BoundingBox, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDeviationGradeKind: {
            readFromCursor(c: Cursor): DeviationGradeKind;
            writeIntoCursor(value: DeviationGradeKind, c: Cursor): void;
            allocationSize(value: DeviationGradeKind): number;
            lift(value: UniffiByteArray): DeviationGradeKind;
            lower(value: DeviationGradeKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDeviationInfo: {
            readFromCursor(c: Cursor): DeviationInfo;
            writeIntoCursor(value: DeviationInfo, c: Cursor): void;
            allocationSize(value: DeviationInfo): number;
            lift(value: UniffiByteArray): DeviationInfo;
            lower(value: DeviationInfo, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDeviationPolicy: {
            readFromCursor(c: Cursor): DeviationPolicy;
            writeIntoCursor(value: DeviationPolicy, c: Cursor): void;
            allocationSize(value: DeviationPolicy): number;
            lift(value: UniffiByteArray): DeviationPolicy;
            lower(value: DeviationPolicy, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDeviationPolicyKind: {
            readFromCursor(c: Cursor): DeviationPolicyKind;
            writeIntoCursor(value: DeviationPolicyKind, c: Cursor): void;
            allocationSize(value: DeviationPolicyKind): number;
            lift(value: UniffiByteArray): DeviationPolicyKind;
            lower(value: DeviationPolicyKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDeviationStatusChange: {
            readFromCursor(c: Cursor): DeviationStatusChange;
            writeIntoCursor(value: DeviationStatusChange, c: Cursor): void;
            allocationSize(value: DeviationStatusChange): number;
            lift(value: UniffiByteArray): DeviationStatusChange;
            lower(value: DeviationStatusChange, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDeviationStatusChangeKind: {
            readFromCursor(c: Cursor): DeviationStatusChangeKind;
            writeIntoCursor(value: DeviationStatusChangeKind, c: Cursor): void;
            allocationSize(value: DeviationStatusChangeKind): number;
            lift(value: UniffiByteArray): DeviationStatusChangeKind;
            lower(value: DeviationStatusChangeKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDiagnostics: FfiConverterObject<DiagnosticsLike>;
        FfiConverterTypeDistanceMatrix: {
            readFromCursor(c: Cursor): DistanceMatrix;
            writeIntoCursor(value: DistanceMatrix, c: Cursor): void;
            allocationSize(value: DistanceMatrix): number;
            lift(value: UniffiByteArray): DistanceMatrix;
            lower(value: DistanceMatrix, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDistanceMatrixEntry: {
            readFromCursor(c: Cursor): DistanceMatrixEntry;
            writeIntoCursor(value: DistanceMatrixEntry, c: Cursor): void;
            allocationSize(value: DistanceMatrixEntry): number;
            lift(value: UniffiByteArray): DistanceMatrixEntry;
            lower(value: DistanceMatrixEntry, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDistanceMatrixProvider: FfiConverterObjectWithCallbacks<DistanceMatrixProvider>;
        FfiConverterTypeDistancePhrase: {
            readFromCursor(c: Cursor): DistancePhrase;
            writeIntoCursor(value: DistancePhrase, c: Cursor): void;
            allocationSize(value: DistancePhrase): number;
            lift(value: UniffiByteArray): DistancePhrase;
            lower(value: DistancePhrase, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDistancePhraseKind: {
            readFromCursor(c: Cursor): DistancePhraseKind;
            writeIntoCursor(value: DistancePhraseKind, c: Cursor): void;
            allocationSize(value: DistancePhraseKind): number;
            lift(value: UniffiByteArray): DistancePhraseKind;
            lower(value: DistancePhraseKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeDistanceUnit: {
            readFromCursor(c: Cursor): DistanceUnit;
            writeIntoCursor(value: DistanceUnit, c: Cursor): void;
            allocationSize(value: DistanceUnit): number;
            lift(value: UniffiByteArray): DistanceUnit;
            lower(value: DistanceUnit, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeEdgeInsets: {
            readFromCursor(c: Cursor): EdgeInsets;
            writeIntoCursor(value: EdgeInsets, c: Cursor): void;
            allocationSize(value: EdgeInsets): number;
            lift(value: UniffiByteArray): EdgeInsets;
            lower(value: EdgeInsets, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeElevationPoint: {
            readFromCursor(c: Cursor): ElevationPoint;
            writeIntoCursor(value: ElevationPoint, c: Cursor): void;
            allocationSize(value: ElevationPoint): number;
            lift(value: UniffiByteArray): ElevationPoint;
            lower(value: ElevationPoint, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeElevationProvider: FfiConverterObjectWithCallbacks<ElevationProvider>;
        FfiConverterTypeFrameStatistics: {
            readFromCursor(c: Cursor): FrameStatistics;
            writeIntoCursor(value: FrameStatistics, c: Cursor): void;
            allocationSize(value: FrameStatistics): number;
            lift(value: UniffiByteArray): FrameStatistics;
            lower(value: FrameStatistics, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeGeocodeQuality: {
            readFromCursor(c: Cursor): GeocodeQuality;
            writeIntoCursor(value: GeocodeQuality, c: Cursor): void;
            allocationSize(value: GeocodeQuality): number;
            lift(value: UniffiByteArray): GeocodeQuality;
            lower(value: GeocodeQuality, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeGeocodingProvider: FfiConverterObjectWithCallbacks<GeocodingProvider>;
        FfiConverterTypeGeographicCoordinate: {
            readFromCursor(c: Cursor): GeographicCoordinate;
            writeIntoCursor(value: GeographicCoordinate, c: Cursor): void;
            allocationSize(value: GeographicCoordinate): number;
            lift(value: UniffiByteArray): GeographicCoordinate;
            lower(value: GeographicCoordinate, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeLocationIndicatorState: {
            readFromCursor(c: Cursor): LocationIndicatorState;
            writeIntoCursor(value: LocationIndicatorState, c: Cursor): void;
            allocationSize(value: LocationIndicatorState): number;
            lift(value: UniffiByteArray): LocationIndicatorState;
            lower(value: LocationIndicatorState, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeLocationIndicatorStyle: {
            readFromCursor(c: Cursor): LocationIndicatorStyle;
            writeIntoCursor(value: LocationIndicatorStyle, c: Cursor): void;
            allocationSize(value: LocationIndicatorStyle): number;
            lift(value: UniffiByteArray): LocationIndicatorStyle;
            lower(value: LocationIndicatorStyle, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeLocationIndicatorVisualKind: {
            readFromCursor(c: Cursor): LocationIndicatorVisualKind;
            writeIntoCursor(value: LocationIndicatorVisualKind, c: Cursor): void;
            allocationSize(value: LocationIndicatorVisualKind): number;
            lift(value: UniffiByteArray): LocationIndicatorVisualKind;
            lower(value: LocationIndicatorVisualKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeLogEvent: {
            readFromCursor(c: Cursor): LogEvent;
            writeIntoCursor(value: LogEvent, c: Cursor): void;
            allocationSize(value: LogEvent): number;
            lift(value: UniffiByteArray): LogEvent;
            lower(value: LogEvent, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeManeuverInstructionText: {
            readFromCursor(c: Cursor): ManeuverInstructionText;
            writeIntoCursor(value: ManeuverInstructionText, c: Cursor): void;
            allocationSize(value: ManeuverInstructionText): number;
            lift(value: UniffiByteArray): ManeuverInstructionText;
            lower(value: ManeuverInstructionText, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeManeuverInstructionTextKind: {
            readFromCursor(c: Cursor): ManeuverInstructionTextKind;
            writeIntoCursor(value: ManeuverInstructionTextKind, c: Cursor): void;
            allocationSize(value: ManeuverInstructionTextKind): number;
            lift(value: UniffiByteArray): ManeuverInstructionTextKind;
            lower(value: ManeuverInstructionTextKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeMapCamera: FfiConverterObject<MapCameraLike>;
        FfiConverterTypeMapOverlay: {
            readFromCursor(c: Cursor): MapOverlay;
            writeIntoCursor(value: MapOverlay, c: Cursor): void;
            allocationSize(value: MapOverlay): number;
            lift(value: UniffiByteArray): MapOverlay;
            lower(value: MapOverlay, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeMapOverlayKind: {
            readFromCursor(c: Cursor): MapOverlayKind;
            writeIntoCursor(value: MapOverlayKind, c: Cursor): void;
            allocationSize(value: MapOverlayKind): number;
            lift(value: UniffiByteArray): MapOverlayKind;
            lower(value: MapOverlayKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeMapSdk: FfiConverterObject<MapSdkLike>;
        FfiConverterTypeNavigationInstruction: {
            readFromCursor(c: Cursor): NavigationInstruction;
            writeIntoCursor(value: NavigationInstruction, c: Cursor): void;
            allocationSize(value: NavigationInstruction): number;
            lift(value: UniffiByteArray): NavigationInstruction;
            lower(value: NavigationInstruction, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeNavigationListener: FfiConverterObjectWithCallbacks<NavigationListener>;
        FfiConverterTypeNavigationLocationUpdate: {
            readFromCursor(c: Cursor): NavigationLocationUpdate;
            writeIntoCursor(value: NavigationLocationUpdate, c: Cursor): void;
            allocationSize(value: NavigationLocationUpdate): number;
            lift(value: UniffiByteArray): NavigationLocationUpdate;
            lower(value: NavigationLocationUpdate, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeNavigationPhase: {
            readFromCursor(c: Cursor): NavigationPhase;
            writeIntoCursor(value: NavigationPhase, c: Cursor): void;
            allocationSize(value: NavigationPhase): number;
            lift(value: UniffiByteArray): NavigationPhase;
            lower(value: NavigationPhase, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeNavigationPhaseChange: {
            readFromCursor(c: Cursor): NavigationPhaseChange;
            writeIntoCursor(value: NavigationPhaseChange, c: Cursor): void;
            allocationSize(value: NavigationPhaseChange): number;
            lift(value: UniffiByteArray): NavigationPhaseChange;
            lower(value: NavigationPhaseChange, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeNavigator: FfiConverterObject<NavigatorLike>;
        FfiConverterTypeNormalizedWorldCoordinate: {
            readFromCursor(c: Cursor): NormalizedWorldCoordinate;
            writeIntoCursor(value: NormalizedWorldCoordinate, c: Cursor): void;
            allocationSize(value: NormalizedWorldCoordinate): number;
            lift(value: UniffiByteArray): NormalizedWorldCoordinate;
            lower(value: NormalizedWorldCoordinate, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeOfflineManager: FfiConverterObject<OfflineManagerLike>;
        FfiConverterTypeOverlayColor: {
            readFromCursor(c: Cursor): OverlayColor;
            writeIntoCursor(value: OverlayColor, c: Cursor): void;
            allocationSize(value: OverlayColor): number;
            lift(value: UniffiByteArray): OverlayColor;
            lower(value: OverlayColor, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypePlace: {
            readFromCursor(c: Cursor): Place;
            writeIntoCursor(value: Place, c: Cursor): void;
            allocationSize(value: Place): number;
            lift(value: UniffiByteArray): Place;
            lower(value: Place, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypePositionController: FfiConverterObject<PositionControllerLike>;
        FfiConverterTypePositionFix: {
            readFromCursor(c: Cursor): PositionFix;
            writeIntoCursor(value: PositionFix, c: Cursor): void;
            allocationSize(value: PositionFix): number;
            lift(value: UniffiByteArray): PositionFix;
            lower(value: PositionFix, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypePositionSourceError: {
            readFromCursor(c: Cursor): PositionSourceError;
            writeIntoCursor(value: PositionSourceError, c: Cursor): void;
            allocationSize(value: PositionSourceError): number;
            lift(value: UniffiByteArray): PositionSourceError;
            lower(value: PositionSourceError, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeProviderContract: {
            readFromCursor(c: Cursor): ProviderContract;
            writeIntoCursor(value: ProviderContract, c: Cursor): void;
            allocationSize(value: ProviderContract): number;
            lift(value: UniffiByteArray): ProviderContract;
            lower(value: ProviderContract, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeProviderFailureClassification: {
            readFromCursor(c: Cursor): ProviderFailureClassification;
            writeIntoCursor(value: ProviderFailureClassification, c: Cursor): void;
            allocationSize(value: ProviderFailureClassification): number;
            lift(value: UniffiByteArray): ProviderFailureClassification;
            lower(value: ProviderFailureClassification, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeProviderFailureDiagnostic: {
            readFromCursor(c: Cursor): ProviderFailureDiagnostic;
            writeIntoCursor(value: ProviderFailureDiagnostic, c: Cursor): void;
            allocationSize(value: ProviderFailureDiagnostic): number;
            lift(value: UniffiByteArray): ProviderFailureDiagnostic;
            lower(value: ProviderFailureDiagnostic, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeProviderRegistration: {
            readFromCursor(c: Cursor): ProviderRegistration;
            writeIntoCursor(value: ProviderRegistration, c: Cursor): void;
            allocationSize(value: ProviderRegistration): number;
            lift(value: UniffiByteArray): ProviderRegistration;
            lower(value: ProviderRegistration, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeProviderRequestTrace: {
            readFromCursor(c: Cursor): ProviderRequestTrace;
            writeIntoCursor(value: ProviderRequestTrace, c: Cursor): void;
            allocationSize(value: ProviderRequestTrace): number;
            lift(value: UniffiByteArray): ProviderRequestTrace;
            lower(value: ProviderRequestTrace, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeProviderVectorTileSource: {
            readFromCursor(c: Cursor): ProviderVectorTileSource;
            writeIntoCursor(value: ProviderVectorTileSource, c: Cursor): void;
            allocationSize(value: ProviderVectorTileSource): number;
            lift(value: UniffiByteArray): ProviderVectorTileSource;
            lower(value: ProviderVectorTileSource, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRasterImageFormat: {
            readFromCursor(c: Cursor): RasterImageFormat;
            writeIntoCursor(value: RasterImageFormat, c: Cursor): void;
            allocationSize(value: RasterImageFormat): number;
            lift(value: UniffiByteArray): RasterImageFormat;
            lower(value: RasterImageFormat, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRasterTileData: {
            readFromCursor(c: Cursor): RasterTileData;
            writeIntoCursor(value: RasterTileData, c: Cursor): void;
            allocationSize(value: RasterTileData): number;
            lift(value: UniffiByteArray): RasterTileData;
            lower(value: RasterTileData, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRasterTileProvider: FfiConverterObjectWithCallbacks<RasterTileProvider>;
        FfiConverterTypeRasterTileResolution: {
            readFromCursor(c: Cursor): RasterTileResolution;
            writeIntoCursor(value: RasterTileResolution, c: Cursor): void;
            allocationSize(value: RasterTileResolution): number;
            lift(value: UniffiByteArray): RasterTileResolution;
            lower(value: RasterTileResolution, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRegionDefinition: {
            readFromCursor(c: Cursor): RegionDefinition;
            writeIntoCursor(value: RegionDefinition, c: Cursor): void;
            allocationSize(value: RegionDefinition): number;
            lift(value: UniffiByteArray): RegionDefinition;
            lower(value: RegionDefinition, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRegionDownloadPhase: {
            readFromCursor(c: Cursor): RegionDownloadPhase;
            writeIntoCursor(value: RegionDownloadPhase, c: Cursor): void;
            allocationSize(value: RegionDownloadPhase): number;
            lift(value: UniffiByteArray): RegionDownloadPhase;
            lower(value: RegionDownloadPhase, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRegionDownloadProgress: {
            readFromCursor(c: Cursor): RegionDownloadProgress;
            writeIntoCursor(value: RegionDownloadProgress, c: Cursor): void;
            allocationSize(value: RegionDownloadProgress): number;
            lift(value: UniffiByteArray): RegionDownloadProgress;
            lower(value: RegionDownloadProgress, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRegionDownloadProgressListener: FfiConverterObjectWithCallbacks<RegionDownloadProgressListener>;
        FfiConverterTypeRegionRecord: {
            readFromCursor(c: Cursor): RegionRecord;
            writeIntoCursor(value: RegionRecord, c: Cursor): void;
            allocationSize(value: RegionRecord): number;
            lift(value: UniffiByteArray): RegionRecord;
            lower(value: RegionRecord, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRegionRemovalReport: {
            readFromCursor(c: Cursor): RegionRemovalReport;
            writeIntoCursor(value: RegionRemovalReport, c: Cursor): void;
            allocationSize(value: RegionRemovalReport): number;
            lift(value: UniffiByteArray): RegionRemovalReport;
            lower(value: RegionRemovalReport, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeReroutePolicy: {
            readFromCursor(c: Cursor): ReroutePolicy;
            writeIntoCursor(value: ReroutePolicy, c: Cursor): void;
            allocationSize(value: ReroutePolicy): number;
            lift(value: UniffiByteArray): ReroutePolicy;
            lower(value: ReroutePolicy, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRoute: {
            readFromCursor(c: Cursor): Route;
            writeIntoCursor(value: Route, c: Cursor): void;
            allocationSize(value: Route): number;
            lift(value: UniffiByteArray): Route;
            lower(value: Route, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRouteCapabilities: {
            readFromCursor(c: Cursor): RouteCapabilities;
            writeIntoCursor(value: RouteCapabilities, c: Cursor): void;
            allocationSize(value: RouteCapabilities): number;
            lift(value: UniffiByteArray): RouteCapabilities;
            lower(value: RouteCapabilities, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRouteLeg: {
            readFromCursor(c: Cursor): RouteLeg;
            writeIntoCursor(value: RouteLeg, c: Cursor): void;
            allocationSize(value: RouteLeg): number;
            lift(value: UniffiByteArray): RouteLeg;
            lower(value: RouteLeg, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRouteOptions: {
            readFromCursor(c: Cursor): RouteOptions;
            writeIntoCursor(value: RouteOptions, c: Cursor): void;
            allocationSize(value: RouteOptions): number;
            lift(value: UniffiByteArray): RouteOptions;
            lower(value: RouteOptions, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRouteSimulator: FfiConverterObject<RouteSimulatorLike>;
        FfiConverterTypeRouteStep: {
            readFromCursor(c: Cursor): RouteStep;
            writeIntoCursor(value: RouteStep, c: Cursor): void;
            allocationSize(value: RouteStep): number;
            lift(value: UniffiByteArray): RouteStep;
            lower(value: RouteStep, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRouteStepPosition: {
            readFromCursor(c: Cursor): RouteStepPosition;
            writeIntoCursor(value: RouteStepPosition, c: Cursor): void;
            allocationSize(value: RouteStepPosition): number;
            lift(value: UniffiByteArray): RouteStepPosition;
            lower(value: RouteStepPosition, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRouteStrategy: {
            readFromCursor(c: Cursor): RouteStrategy;
            writeIntoCursor(value: RouteStrategy, c: Cursor): void;
            allocationSize(value: RouteStrategy): number;
            lift(value: UniffiByteArray): RouteStrategy;
            lower(value: RouteStrategy, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeRoutingEngine: FfiConverterObject<RoutingEngineLike>;
        FfiConverterTypeRoutingProvider: FfiConverterObjectWithCallbacks<RoutingProvider>;
        FfiConverterTypeScreenPoint: {
            readFromCursor(c: Cursor): ScreenPoint;
            writeIntoCursor(value: ScreenPoint, c: Cursor): void;
            allocationSize(value: ScreenPoint): number;
            lift(value: UniffiByteArray): ScreenPoint;
            lower(value: ScreenPoint, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSdkDiagnosticEventListener: FfiConverterObjectWithCallbacks<SdkDiagnosticEventListener>;
        FfiConverterTypeSdkError: {
            readFromCursor(c: Cursor): SdkError;
            writeIntoCursor(value: SdkError, c: Cursor): void;
            allocationSize(value: SdkError): number;
            lift(value: UniffiByteArray): SdkError;
            lower(value: SdkError, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSdkLogSeverity: {
            readFromCursor(c: Cursor): SdkLogSeverity;
            writeIntoCursor(value: SdkLogSeverity, c: Cursor): void;
            allocationSize(value: SdkLogSeverity): number;
            lift(value: UniffiByteArray): SdkLogSeverity;
            lower(value: SdkLogSeverity, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSearchEngine: FfiConverterObject<SearchEngineLike>;
        FfiConverterTypeSearchPlaceProvider: FfiConverterObjectWithCallbacks<SearchPlaceProvider>;
        FfiConverterTypeSimulatedTripFix: {
            readFromCursor(c: Cursor): SimulatedTripFix;
            writeIntoCursor(value: SimulatedTripFix, c: Cursor): void;
            allocationSize(value: SimulatedTripFix): number;
            lift(value: UniffiByteArray): SimulatedTripFix;
            lower(value: SimulatedTripFix, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSimulatedTripPace: {
            readFromCursor(c: Cursor): SimulatedTripPace;
            writeIntoCursor(value: SimulatedTripPace, c: Cursor): void;
            allocationSize(value: SimulatedTripPace): number;
            lift(value: UniffiByteArray): SimulatedTripPace;
            lower(value: SimulatedTripPace, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSourceHeader: {
            readFromCursor(c: Cursor): SourceHeader;
            writeIntoCursor(value: SourceHeader, c: Cursor): void;
            allocationSize(value: SourceHeader): number;
            lift(value: UniffiByteArray): SourceHeader;
            lower(value: SourceHeader, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSpeechInstruction: {
            readFromCursor(c: Cursor): SpeechInstruction;
            writeIntoCursor(value: SpeechInstruction, c: Cursor): void;
            allocationSize(value: SpeechInstruction): number;
            lift(value: UniffiByteArray): SpeechInstruction;
            lower(value: SpeechInstruction, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSpeechInstructionKind: {
            readFromCursor(c: Cursor): SpeechInstructionKind;
            writeIntoCursor(value: SpeechInstructionKind, c: Cursor): void;
            allocationSize(value: SpeechInstructionKind): number;
            lift(value: UniffiByteArray): SpeechInstructionKind;
            lower(value: SpeechInstructionKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeStepAdvancePolicy: {
            readFromCursor(c: Cursor): StepAdvancePolicy;
            writeIntoCursor(value: StepAdvancePolicy, c: Cursor): void;
            allocationSize(value: StepAdvancePolicy): number;
            lift(value: UniffiByteArray): StepAdvancePolicy;
            lower(value: StepAdvancePolicy, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeStepAdvancePolicyKind: {
            readFromCursor(c: Cursor): StepAdvancePolicyKind;
            writeIntoCursor(value: StepAdvancePolicyKind, c: Cursor): void;
            allocationSize(value: StepAdvancePolicyKind): number;
            lift(value: UniffiByteArray): StepAdvancePolicyKind;
            lower(value: StepAdvancePolicyKind, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeSubscription: FfiConverterObject<SubscriptionLike>;
        FfiConverterTypeSurfaceHandle: {
            readFromCursor(c: Cursor): SurfaceHandle;
            writeIntoCursor(value: SurfaceHandle, c: Cursor): void;
            allocationSize(value: SurfaceHandle): number;
            lift(value: UniffiByteArray): SurfaceHandle;
            lower(value: SurfaceHandle, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTileCacheStatistics: {
            readFromCursor(c: Cursor): TileCacheStatistics;
            writeIntoCursor(value: TileCacheStatistics, c: Cursor): void;
            allocationSize(value: TileCacheStatistics): number;
            lift(value: UniffiByteArray): TileCacheStatistics;
            lower(value: TileCacheStatistics, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTileCacheTerms: {
            readFromCursor(c: Cursor): TileCacheTerms;
            writeIntoCursor(value: TileCacheTerms, c: Cursor): void;
            allocationSize(value: TileCacheTerms): number;
            lift(value: UniffiByteArray): TileCacheTerms;
            lower(value: TileCacheTerms, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTileKey: {
            readFromCursor(c: Cursor): TileKey;
            writeIntoCursor(value: TileKey, c: Cursor): void;
            allocationSize(value: TileKey): number;
            lift(value: UniffiByteArray): TileKey;
            lower(value: TileKey, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTrafficFlowCacheStatistics: {
            readFromCursor(c: Cursor): TrafficFlowCacheStatistics;
            writeIntoCursor(value: TrafficFlowCacheStatistics, c: Cursor): void;
            allocationSize(value: TrafficFlowCacheStatistics): number;
            lift(value: UniffiByteArray): TrafficFlowCacheStatistics;
            lower(value: TrafficFlowCacheStatistics, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTrafficFlowCongestionLevel: {
            readFromCursor(c: Cursor): TrafficFlowCongestionLevel;
            writeIntoCursor(value: TrafficFlowCongestionLevel, c: Cursor): void;
            allocationSize(value: TrafficFlowCongestionLevel): number;
            lift(value: UniffiByteArray): TrafficFlowCongestionLevel;
            lower(value: TrafficFlowCongestionLevel, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTrafficFlowData: {
            readFromCursor(c: Cursor): TrafficFlowData;
            writeIntoCursor(value: TrafficFlowData, c: Cursor): void;
            allocationSize(value: TrafficFlowData): number;
            lift(value: UniffiByteArray): TrafficFlowData;
            lower(value: TrafficFlowData, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTrafficFlowProvider: FfiConverterObjectWithCallbacks<TrafficFlowProvider>;
        FfiConverterTypeTrafficIncident: {
            readFromCursor(c: Cursor): TrafficIncident;
            writeIntoCursor(value: TrafficIncident, c: Cursor): void;
            allocationSize(value: TrafficIncident): number;
            lift(value: UniffiByteArray): TrafficIncident;
            lower(value: TrafficIncident, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTrafficIncidentProvider: FfiConverterObjectWithCallbacks<TrafficIncidentProvider>;
        FfiConverterTypeTrafficIncidentSeverity: {
            readFromCursor(c: Cursor): TrafficIncidentSeverity;
            writeIntoCursor(value: TrafficIncidentSeverity, c: Cursor): void;
            allocationSize(value: TrafficIncidentSeverity): number;
            lift(value: UniffiByteArray): TrafficIncidentSeverity;
            lower(value: TrafficIncidentSeverity, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTrafficIncidentType: {
            readFromCursor(c: Cursor): TrafficIncidentType;
            writeIntoCursor(value: TrafficIncidentType, c: Cursor): void;
            allocationSize(value: TrafficIncidentType): number;
            lift(value: UniffiByteArray): TrafficIncidentType;
            lower(value: TrafficIncidentType, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTransportationMode: {
            readFromCursor(c: Cursor): TransportationMode;
            writeIntoCursor(value: TransportationMode, c: Cursor): void;
            allocationSize(value: TransportationMode): number;
            lift(value: UniffiByteArray): TransportationMode;
            lower(value: TransportationMode, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTripNavigationState: {
            readFromCursor(c: Cursor): TripNavigationState;
            writeIntoCursor(value: TripNavigationState, c: Cursor): void;
            allocationSize(value: TripNavigationState): number;
            lift(value: UniffiByteArray): TripNavigationState;
            lower(value: TripNavigationState, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeTripProgress: {
            readFromCursor(c: Cursor): TripProgress;
            writeIntoCursor(value: TripProgress, c: Cursor): void;
            allocationSize(value: TripProgress): number;
            lift(value: UniffiByteArray): TripProgress;
            lower(value: TripProgress, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeUnitSystem: {
            readFromCursor(c: Cursor): UnitSystem;
            writeIntoCursor(value: UnitSystem, c: Cursor): void;
            allocationSize(value: UnitSystem): number;
            lift(value: UniffiByteArray): UnitSystem;
            lower(value: UnitSystem, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeUpcomingManeuverInstruction: {
            readFromCursor(c: Cursor): UpcomingManeuverInstruction;
            writeIntoCursor(value: UpcomingManeuverInstruction, c: Cursor): void;
            allocationSize(value: UpcomingManeuverInstruction): number;
            lift(value: UniffiByteArray): UpcomingManeuverInstruction;
            lower(value: UpcomingManeuverInstruction, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeUrlTemplateRasterTileSource: {
            readFromCursor(c: Cursor): UrlTemplateRasterTileSource;
            writeIntoCursor(value: UrlTemplateRasterTileSource, c: Cursor): void;
            allocationSize(value: UrlTemplateRasterTileSource): number;
            lift(value: UniffiByteArray): UrlTemplateRasterTileSource;
            lower(value: UrlTemplateRasterTileSource, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeUrlTemplateVectorTileSource: {
            readFromCursor(c: Cursor): UrlTemplateVectorTileSource;
            writeIntoCursor(value: UrlTemplateVectorTileSource, c: Cursor): void;
            allocationSize(value: UrlTemplateVectorTileSource): number;
            lift(value: UniffiByteArray): UrlTemplateVectorTileSource;
            lower(value: UrlTemplateVectorTileSource, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeVectorTileData: {
            readFromCursor(c: Cursor): VectorTileData;
            writeIntoCursor(value: VectorTileData, c: Cursor): void;
            allocationSize(value: VectorTileData): number;
            lift(value: UniffiByteArray): VectorTileData;
            lower(value: VectorTileData, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeVectorTileEncoding: {
            readFromCursor(c: Cursor): VectorTileEncoding;
            writeIntoCursor(value: VectorTileEncoding, c: Cursor): void;
            allocationSize(value: VectorTileEncoding): number;
            lift(value: UniffiByteArray): VectorTileEncoding;
            lower(value: VectorTileEncoding, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeVectorTileProvider: FfiConverterObjectWithCallbacks<VectorTileProvider>;
        FfiConverterTypeVectorTileSourceDescriptor: {
            readFromCursor(c: Cursor): VectorTileSourceDescriptor;
            writeIntoCursor(value: VectorTileSourceDescriptor, c: Cursor): void;
            allocationSize(value: VectorTileSourceDescriptor): number;
            lift(value: UniffiByteArray): VectorTileSourceDescriptor;
            lower(value: VectorTileSourceDescriptor, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeVectorTileSourceLayerCount: {
            readFromCursor(c: Cursor): VectorTileSourceLayerCount;
            writeIntoCursor(value: VectorTileSourceLayerCount, c: Cursor): void;
            allocationSize(value: VectorTileSourceLayerCount): number;
            lift(value: UniffiByteArray): VectorTileSourceLayerCount;
            lower(value: VectorTileSourceLayerCount, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeVectorTileSourceStatus: {
            readFromCursor(c: Cursor): VectorTileSourceStatus;
            writeIntoCursor(value: VectorTileSourceStatus, c: Cursor): void;
            allocationSize(value: VectorTileSourceStatus): number;
            lift(value: UniffiByteArray): VectorTileSourceStatus;
            lower(value: VectorTileSourceStatus, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
        FfiConverterTypeViewportSize: {
            readFromCursor(c: Cursor): ViewportSize;
            writeIntoCursor(value: ViewportSize, c: Cursor): void;
            allocationSize(value: ViewportSize): number;
            lift(value: UniffiByteArray): ViewportSize;
            lower(value: ViewportSize, alloc: import("@ubjs/core").RustBufferAllocator): UniffiByteArray;
        };
    };
}>;
export default _default;
