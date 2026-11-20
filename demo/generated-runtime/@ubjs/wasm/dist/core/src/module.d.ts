import { Memory } from "./memory.js";
import { Scratch } from "./scratch.js";
import { type FieldDesc } from "./marshal.js";
import { type FunctionDef } from "./call.js";
import { CallbackTable, type CallbackDef } from "./callback.js";
import { FutureRegistry } from "./future.js";
export type WasmSource = WebAssembly.Module | ArrayBuffer | Uint8Array | Response | URL | string;
export interface ModuleDefinitions {
    symbols: {
        rustbuffer_alloc: string;
        rustbuffer_free: string;
        rustbuffer_from_bytes: string;
    };
    functions: Record<string, FunctionDef>;
    callbacks: Record<string, CallbackDef>;
    structs: Record<string, FieldDesc[]>;
}
export type NativeModuleInterface = Record<string, (...args: any[]) => any>;
/**
 * Resolver for unrecognized wasm import modules. The runner side may run
 * `wasm-bindgen-cli --target bundler` against the cdylib, leaving the
 * rewritten wasm with imports against `./<crate>_bg.js`. The env-specific
 * entry (node/browser) supplies a resolver that dynamic-imports those
 * relative module paths and hands the named exports back. Any module the
 * resolver can't satisfy is filled with throwing stubs so calling into a
 * truly-unwired path fails loudly rather than silently no-op'ing.
 */
export type ImportResolver = (moduleName: string) => Promise<Record<string, unknown> | undefined>;
export declare class UniffiNativeModule {
    readonly memory: Memory;
    readonly scratch: Scratch;
    readonly exports: WebAssembly.Exports;
    readonly instance: WebAssembly.Instance;
    readonly callbacks: CallbackTable;
    readonly futures: FutureRegistry;
    readonly alloc: (size: number, align: number) => number;
    readonly free: (ptr: number, size: number, align: number) => void;
    private constructor();
    static open(source: WasmSource, options?: {
        resolveModule?: ImportResolver;
    }): Promise<UniffiNativeModule>;
    register(definitions: ModuleDefinitions, opts?: {
        disableJit?: boolean;
    }): Promise<NativeModuleInterface>;
    registerSync(definitions: ModuleDefinitions, opts?: {
        disableJit?: boolean;
    }): NativeModuleInterface;
}
