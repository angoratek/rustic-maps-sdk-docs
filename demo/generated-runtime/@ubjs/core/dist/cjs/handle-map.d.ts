export type UniffiHandle = bigint;
export declare const defaultUniffiHandle: bigint;
export declare class UniffiHandleMap<T> {
    private map;
    private currentHandle;
    insert(value: T): UniffiHandle;
    get(handle: UniffiHandle): T;
    /**
     * Creates a second handle pointing to the same object. Rust calls this (via
     * `CallbackInterfaceClone`) when it clones an Arc holding a foreign-implemented
     * trait object, so two Arc references can exist with independent lifetimes.
     *
     * This clones the *handle*, not the object itself. Both handles resolve to the
     * same JS object reference, and removing either handle does not affect the other.
     */
    clone(handle: UniffiHandle): UniffiHandle;
    remove(handle: UniffiHandle): T | undefined;
    has(handle: UniffiHandle): boolean;
    get size(): number;
}
//# sourceMappingURL=handle-map.d.ts.map