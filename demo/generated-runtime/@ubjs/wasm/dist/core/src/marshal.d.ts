import { Memory } from "./memory.js";
import type { FfiTypeDesc } from "./ffi-type.js";
import { RustBuffer } from "@ubjs/core";
export declare const RUST_BUFFER_SIZE = 24;
export declare const RUST_CALL_STATUS_SIZE = 32;
export declare const FOREIGN_BYTES_SIZE = 8;
export interface RustBufferLike {
    capacity: bigint;
    len: bigint;
    dataPtr: number;
}
export declare function readRustBuffer(m: Memory, ptr: number): RustBufferLike;
export declare function writeRustBuffer(m: Memory, ptr: number, rb: RustBufferLike): void;
/**
 * Write a 24-byte `RustBuffer` struct at `ptr` (`capacity = len = bytes
 * .byteLength`, `dataPtr` pointing at the payload bytes inside wasm memory).
 *
 * Two payload paths:
 *
 * 1. **Wasm-aliased view (`lower(value, rustbuffer_alloc)`):** the converter
 *    has already written its bytes directly into a wasm allocation obtained
 *    from `rustbuffer_alloc(n)` — `bytes.buffer` is the wasm linear memory
 *    and `bytes.byteOffset` is the `dataPtr`. We just forward
 *    `(byteOffset, byteLength)` into the struct.
 *
 * 2. **JS-owned `Uint8Array`:** allocate a fresh wasm buffer of the right
 *    size and copy bytes in.
 *
 * Used on every wasm2 lower path that hands a `Uint8Array` to Rust through
 * a `RustBuffer` slot — top-level args, callback args/returns,
 * `RustCallStatus.errorBuf`, and `RustBuffer` fields inside structs.
 * Ownership of the payload bytes transfers to Rust, so the caller does
 * not free `dataPtr`.
 *
 * Throws if `bytes` is a detached view. A detached view is unrecoverable
 * (we cannot read its contents to copy them, and the source buffer is no
 * longer valid wasm memory either). It indicates a contract violation —
 * a wasm-aliased view was held across an operation that grew wasm memory.
 */
export declare function writeRustBufferPayload(m: Memory, alloc: (size: number, align: number) => number, ptr: number, bytes: Uint8Array): void;
export declare const RCS_ERROR_BUF_OFF = 8;
export interface RustCallStatusLike {
    code: number;
    errorBuf: RustBufferLike;
}
export declare function readRustCallStatus(m: Memory, ptr: number): RustCallStatusLike;
export declare function writeRustCallStatusZero(m: Memory, ptr: number): void;
export interface ForeignBytesLike {
    len: number;
    dataPtr: number;
}
export declare function readForeignBytes(m: Memory, ptr: number): ForeignBytesLike;
export declare function writeForeignBytes(m: Memory, ptr: number, fb: ForeignBytesLike): void;
export interface FieldDesc {
    name: string;
    type: FfiTypeDesc;
}
export interface CompiledField {
    name: string;
    offset: number;
    type: FfiTypeDesc;
    shape: ScalarShape;
}
export interface StructLayout {
    size: number;
    fields: CompiledField[];
    read: (m: Memory, ptr: number) => Record<string, unknown>;
    write: (m: Memory, ptr: number, value: Record<string, unknown>) => void;
}
export interface ScalarShape {
    size: number;
    align: number;
    read: (m: Memory, p: number) => unknown;
    write: (m: Memory, p: number, v: any) => void;
}
export declare function compileStructLayout(fields: FieldDesc[]): StructLayout;
/**
 * Lift a `RustBufferLike` view into a `RustBuffer` that aliases the wasm
 * `Memory.buffer()` directly — no intermediate copy. Use this on the hot
 * path for record-shaped types so lift/lower can read/write straight out
 * of wasm memory. The returned `RustBuffer` is only valid until the next
 * memory growth or boundary crossing that may detach the buffer.
 */
export declare function liftRustBufferOverMemory(m: Memory, rb: RustBufferLike): RustBuffer;
