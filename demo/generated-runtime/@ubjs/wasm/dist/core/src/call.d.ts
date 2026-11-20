import type { Memory } from "./memory.js";
import type { Scratch } from "./scratch.js";
import { type StructLayout } from "./marshal.js";
import type { FfiTypeDesc } from "./ffi-type.js";
import type { CallbackDef } from "./callback.js";
export interface FunctionDef {
    args: FfiTypeDesc[];
    ret: FfiTypeDesc;
    hasRustCallStatus: boolean;
}
export interface DispatchContext {
    memory: Memory;
    scratch: Scratch;
    structs: Map<string, StructLayout>;
    callbackDefs: Map<string, CallbackDef>;
    alloc: (size: number, align: number) => number;
    free: (ptr: number, size: number, align: number) => void;
    installCallback: (fn: (...args: any[]) => any, def: CallbackDef) => number;
    useJit: boolean;
}
/**
 * Probe for `new Function` availability. Returns true if we can JIT-compile
 * dispatchers; false under strict CSP. The probe is cheap (one Function
 * construction) and the result is captured at register() time for the
 * lifetime of the module.
 */
export declare function canUseFunctionConstructor(): boolean;
export declare function getCapacityHint(view: Uint8Array): number | undefined;
/**
 * Build a JIT-compiled dispatcher for a function whose arg/return types are
 * all in the "simple" set (scalars + `RustBuffer` + `Void` return). Returns
 * `undefined` for unsupported shapes (callback args, struct-by-value args,
 * etc.) so the caller falls back to the interpreted dispatcher.
 *
 * Offsets, scalar/RustBuffer call shape, and the inline status check are
 * baked into the body. The body refers to `mem`, `fn`, `alloc`, `ctx` and
 * a handful of helpers as free variables; they are passed in as
 * `new Function` constructor args so V8 can monomorphise the closure
 * identically to hand-written source.
 *
 * The body bakes in one register-time scratch base, so it carries the same
 * re-entrancy hazard as `buildInterpretedDispatcher`. See `Scratch.reserve`.
 */
export declare function buildJitDispatcher(ctx: DispatchContext, exportFn: Function, def: FunctionDef, fnName: string): ((...args: any[]) => unknown) | undefined;
export declare function specializeFunction(ctx: DispatchContext, exportFn: Function, def: FunctionDef, fnName?: string): (...jsArgs: any[]) => any;
