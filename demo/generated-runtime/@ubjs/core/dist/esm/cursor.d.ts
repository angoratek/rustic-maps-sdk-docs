/**
 * Positional reader/writer over an `ArrayBuffer` slice with monomorphic typed
 * accessors. One `DataView` and one `Uint8Array` are built at construction and
 * reused for every primitive operation — no per-read DataView allocation, no
 * function-pointer dispatch.
 *
 * Big-endian on the wire (matches the UniFFI RustBuffer wire format).
 */
export declare class Cursor {
    private readonly dv;
    private readonly u8;
    private readonly start;
    private readonly end;
    private pos;
    constructor(buffer: ArrayBuffer, offset: number, length: number);
    static fromUint8Array(view: Uint8Array): Cursor;
    remaining(): number;
    skip(n: number): void;
    readU8(): number;
    readI8(): number;
    readU16(): number;
    readI16(): number;
    readU32(): number;
    readI32(): number;
    readU64(): bigint;
    readI64(): bigint;
    readF32(): number;
    readF64(): number;
    readBool(): boolean;
    writeU8(v: number): void;
    writeI8(v: number): void;
    writeU16(v: number): void;
    writeI16(v: number): void;
    writeU32(v: number): void;
    writeI32(v: number): void;
    writeU64(v: bigint): void;
    writeI64(v: bigint): void;
    writeF32(v: number): void;
    writeF64(v: number): void;
    writeBool(v: boolean): void;
    readBytes(len: number): Uint8Array;
    readArrayBuffer(len: number): ArrayBuffer;
    writeBytes(src: Uint8Array): void;
    private boundsCheck;
}
//# sourceMappingURL=cursor.d.ts.map