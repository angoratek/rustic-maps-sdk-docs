export declare const TAG_I32 = 0;
export declare const TAG_I64 = 1;
export declare const TAG_F32 = 2;
export declare const TAG_F64 = 3;
/**
 * Emit a wasm trampoline module. `paramTags` are the trampoline's
 * exposed parameter type tags; `returnTag` is `undefined` for void.
 * `shapeId` is forwarded as the first arg to `__ubrn_dispatch`. */
export declare function emitTrampoline(shapeId: number, paramTags: number[], returnTag: number | undefined): Uint8Array;
