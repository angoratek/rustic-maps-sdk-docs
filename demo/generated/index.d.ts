export * from './rustic_maps.js';
import * as rustic_maps from './rustic_maps.js';
import { type WasmSource } from '@ubjs/wasm';
export declare function uniffiInitAsync(source: WasmSource): Promise<void>;
declare const _default: {
    rustic_maps: typeof rustic_maps;
};
export default _default;
