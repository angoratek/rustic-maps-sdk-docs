import { UniffiNativeModule, type ImportResolver, type WasmSource, type ModuleDefinitions, type NativeModuleInterface } from "../../core/src/module.js";
export { FfiType } from "../../core/src/ffi-type.js";
export { UniffiNativeModule };
export type { WasmSource };
/**
 * `options.resolveModule` supplies the wasm's own module imports. A cdylib
 * that reached wasm-bindgen through its dependencies imports `./<lib>_bg.js`,
 * and the caller must hand that glue over — generated bindings import it
 * statically and pass it here. Without it, instantiation fails naming the
 * import it could not satisfy.
 */
export declare function openWasm(source: WasmSource, options?: {
    resolveModule?: ImportResolver;
}): Promise<UniffiNativeModule>;
/**
 * Node-only sync registration over an already-instantiated source. The fixture
 * test runner uses this path via wasm-as-ESM imports.
 */
export declare function registerSync(mod: UniffiNativeModule, defs: ModuleDefinitions): NativeModuleInterface;
