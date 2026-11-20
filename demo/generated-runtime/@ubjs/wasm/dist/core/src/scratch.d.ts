type Alloc = (size: number) => number;
type Free = (ptr: number, size: number) => void;
/**
 * Stack-discipline bump arena over a region of wasm linear memory.
 *
 * `push(n)` returns a pointer to `n` bytes. If the arena is full, falls
 * back to the supplied allocator. `pop(ptr)` must be called in LIFO order
 * with the value returned by the matching `push`. If the pointer was an
 * overflow allocation, it is freed via the supplied free fn.
 */
export declare class Scratch {
    private arenaPtr;
    private arenaSize;
    private alloc;
    private free;
    private mark;
    private reservedHigh;
    private hasPushed;
    private overflow;
    private maxArenaSize;
    constructor(arenaPtr: number, arenaSize: number, alloc: Alloc, free: Free, maxArenaSize?: number);
    /**
     * Carve a permanent region from the arena, returning its starting offset
     * within wasm memory. Must be called BEFORE any push(). Survives every
     * push/pop cycle for the arena's lifetime.
     *
     * Note: the returned region is a SINGLE address shared across every caller
     * that holds it. It is suitable only for transient scratch within a single
     * synchronous call frame — callers must not assume its contents survive
     * across re-entry. If the wasm export whose dispatcher owns this region is
     * synchronously re-entered (e.g. via a JS callback that calls the same
     * export), the inner call will overwrite the outer call's scratch (status
     * byte, sret slot, lowered arg buffers). Callers that need re-entrant
     * isolation must use `push`/`pop` per call instead of reserving up front.
     */
    reserve(size: number): number;
    push(size: number): number;
    pop(ptr: number): void;
}
export {};
