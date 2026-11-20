import { UniffiNativeModule, type ImportResolver, type WasmSource } from "../../core/src/module.js";
export { FfiType } from "../../core/src/ffi-type.js";
export { UniffiNativeModule };
export type { WasmSource };
/**
 * `options.resolveModule` supplies the wasm's own module imports. A cdylib
 * that reached wasm-bindgen through its dependencies imports `./<lib>_bg.js`,
 * and the caller must hand that glue over — generated bindings import it
 * statically, which keeps it in the bundler's graph. Nothing here loads a
 * module at runtime, so a bundler sees no dynamic import to warn about.
 */
export declare function openWasm(source: WasmSource | Promise<Response>, options?: {
    resolveModule?: ImportResolver;
}): Promise<UniffiNativeModule>;
