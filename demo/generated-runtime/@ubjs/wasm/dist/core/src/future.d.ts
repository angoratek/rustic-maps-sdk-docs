import type { CallbackTable } from "./callback.js";
export declare class FutureRegistry {
    private callbacks;
    private nextData;
    private resolvers;
    private contShapeId;
    constructor(callbacks: CallbackTable);
    /**
     * Compile (once) the continuation trampoline and install it at
     * `tableIndex` in the host's indirect function table. Subsequent calls
     * reuse the cached shape but re-install at whichever table index the
     * caller asks for. Returns `tableIndex` for convenience.
     */
    installContinuation(tableIndex: number): number;
    /**
     * Allocate a fresh continuation cookie and record the resolver to be
     * invoked when the host wasm calls the continuation trampoline with that
     * cookie. The returned `bigint` is the `data` argument the caller should
     * thread through to the Rust-side `rust_future_poll(...)`-style export.
     */
    allocateContinuation(resolver: (code: number) => void): bigint;
}
