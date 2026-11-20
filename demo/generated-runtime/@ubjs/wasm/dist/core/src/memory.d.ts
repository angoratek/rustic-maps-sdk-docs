export declare class Memory {
    private memory;
    private cachedDv;
    private cachedU8;
    constructor(memory: WebAssembly.Memory);
    /** Always-current DataView. Cheap if memory has not grown. */
    dv(): DataView;
    /** Always-current Uint8Array. Cheap if memory has not grown. */
    view(): Uint8Array;
    buffer(): ArrayBuffer;
    readU8(ptr: number): number;
    readU32(ptr: number): number;
    readI32(ptr: number): number;
    readU64(ptr: number): bigint;
    readF32(ptr: number): number;
    readF64(ptr: number): number;
    writeU8(ptr: number, v: number): void;
    writeU32(ptr: number, v: number): void;
    writeI32(ptr: number, v: number): void;
    writeU64(ptr: number, v: bigint): void;
    writeF32(ptr: number, v: number): void;
    writeF64(ptr: number, v: number): void;
    /** Returns a fresh `Uint8Array` copy of `[ptr, ptr+len)`. */
    readBytes(ptr: number, len: number): Uint8Array;
    writeBytes(ptr: number, src: Uint8Array): void;
}
