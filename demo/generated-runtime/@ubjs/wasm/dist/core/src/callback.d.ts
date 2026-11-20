import type { FfiTypeDesc } from "./ffi-type.js";
import type { Memory } from "./memory.js";
import { type StructLayout } from "./marshal.js";
export interface CallbackDef {
    args: FfiTypeDesc[];
    ret: FfiTypeDesc;
    hasRustCallStatus: boolean;
    outReturn?: boolean;
}
/**
 * Per-instance dispatch table. `module.ts` owns one of these and routes the
 * `__ubrn_dispatch` import through `dispatch`.
 */
export declare class CallbackTable {
    private memory;
    private hostExports;
    /** Async compilation is not implemented; `false` is reserved for it. */
    private compileSync;
    private shapes;
    private shapesByShapeId;
    /**
     * Shapes that bypass the registry-by-handle path. The `RustFutureContinu-
     * ationCallback` shape lives here: its first argument is a u64 cookie, not
     * a UniFFI registry handle, so the per-shape callback owns its own routing
     * (e.g. the FutureRegistry's cookie -> resolver map).
     */
    private continuationShapes;
    /** Optional registration context: callback shape defs + compiled struct
     * layouts. Set by `module.ts` after `registerSync()` so `makeDispatchRoute`
     * can resolve `Callback`-typed args (function-table indices) into JS
     * callables that re-lower their args and dispatch through the indirect
     * function table. */
    private registrationContext?;
    constructor(memory: Memory, hostExports: WebAssembly.Exports, 
    /** Async compilation is not implemented; `false` is reserved for it. */
    compileSync?: boolean);
    setRegistrationContext(ctx: {
        callbackDefs: Map<string, CallbackDef>;
        structs: Map<string, StructLayout>;
    }): void;
    /**
     * Implements `env.__ubrn_dispatch`. Trampolines prepend their shape id and
     * forward everything else verbatim.
     *
     * On the registry path the host's first argument is the handle, per the
     * UniFFI vtable convention; it is stripped before calling the closure.
     *
     * For shapes registered via `registerContinuationShape` (e.g. the future
     * continuation callback) we forward all args verbatim — `args[0]` is a
     * cookie, not a handle, and the caller owns the lookup.
     */
    dispatch: (shapeId: number, ...args: any[]) => any;
    /**
     * Mark `shapeId` as a "continuation" shape — when the trampoline fires for
     * that shape we route directly to `fn(...args)` rather than going through
     * the registry-by-handle lookup. Used by `FutureRegistry`.
     */
    registerContinuationShape(shapeId: number, fn: (...args: any[]) => any): void;
    private fnSlotCache;
    installCallbackFunction(fn: (...args: any[]) => any, def: CallbackDef): number;
    private makeDispatchRoute;
    /**
     * Define (or look up, if already defined) the trampoline for a callback
     * shape. Returns the shape id, which is the index callers should pass to
     * `register`/`installAt`.
     */
    defineShape(_name: string, def: CallbackDef): number;
    /** Register a JS closure for `def`'s shape. Returns the handle. */
    register(name: string, fn: (...args: any[]) => any, def: CallbackDef): number;
    /** Drop a previously registered callback. */
    unregister(handle: number, def: CallbackDef): void;
    /** Number of live registrations for `def`'s shape. Used by tests and by
     * the generated `free` vtable hook to verify callbacks are released. */
    size(def: CallbackDef): number;
    /**
     * Install a shape's trampoline into the host's indirect function table at
     * `tableIndex`. The host wasm calls into the trampoline via
     * `call_indirect`, so this is how a JS callback becomes reachable from
     * Rust.
     *
     * Note: many callbacks of the same *shape* share one trampoline, but each
     * needs its own table slot because the host passes a fixed table index per
     * Rust-side callback object.
     */
    installAt(tableIndex: number, shapeId: number): void;
    private shapeIdFor;
    private signatureKey;
    /** Encode the trampoline's wasm-level signature and emit the wasm bytes
     * for it via the JS-side encoder in `trampoline.ts`. The wasm-level
     * params are `def.args` plus implicit i32 pointer args UniFFI tacks on
     * when `outReturn` / `hasRustCallStatus` are set; for `outReturn` the
     * return travels via the pointer, so the trampoline's wasm return is
     * void regardless of `def.ret`. */
    private compileTrampoline;
}
