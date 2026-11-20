export type UniffiByteArray = Uint8Array;
export declare class RustBuffer {
    private readOffset;
    private writeOffset;
    private capacity;
    arrayBuffer: ArrayBuffer;
    private constructor();
    /**
     * Allocate a JS-owned buffer of the given capacity. Used by tests; not by
     * the runtime path, which calls `RustBuffer.fromUint8Array(allocator(n))`
     * with a runtime-supplied allocator.
     */
    static withCapacity(capacity: number): RustBuffer;
    static empty(): RustBuffer;
    static fromArrayBuffer(buf: ArrayBuffer): RustBuffer;
    /**
     * Construct a RustBuffer that reads/writes directly out of a
     * `WebAssembly.Memory` backing buffer, with `readOffset`/`writeOffset`
     * pre-positioned at `dataPtr`. Allows record lift/lower to skip the
     * intermediate `Uint8Array` copy. The caller is responsible for the
     * buffer remaining attached for the duration of any read/write.
     */
    static fromWasmMemory(memoryBuffer: ArrayBuffer, dataPtr: number, len: number): RustBuffer;
    /**
     * Construct a `RustBuffer` over a `Uint8Array` view. Cursors track absolute
     * offsets into the backing `ArrayBuffer`, so `byteOffset` and `byteLength`
     * delimit the readable/writable region. Generalises `fromWasmMemory`.
     */
    static fromUint8Array(view: UniffiByteArray): RustBuffer;
    get length(): number;
    get byteArray(): UniffiByteArray;
    readArrayBuffer(numBytes: number): ArrayBuffer;
    readByteArray(numBytes: number): UniffiByteArray;
    writeArrayBuffer(buffer: ArrayBufferLike): void;
    writeByteArray(src: UniffiByteArray): void;
    /**
     * Advance the read cursor by `numBytes` and return the starting offset.
     * Used to construct a typed-array view directly over the backing store.
     */
    advanceReadOffset(numBytes: number): number;
    /**
     * Advance the write cursor by `numBytes` and return the starting offset.
     * Used to construct a typed-array view directly over the backing store.
     */
    advanceWriteOffset(numBytes: number): number;
    /**
     * Set the write cursor to an absolute position. Used to backfill after an
     * in-place encode reports the actual number of bytes written.
     */
    setWriteOffset(offset: number): void;
    protected checkOverflow(start: number, numBytes: number): number;
}
//# sourceMappingURL=ffi-types.d.ts.map