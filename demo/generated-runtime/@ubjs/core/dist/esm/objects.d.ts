import { Cursor } from "./cursor.ts";
import { AbstractFfiConverterByteArray, type FfiConverter, type RustBufferAllocator } from "./ffi-converters.ts";
import type { UniffiGcObject } from "./rust-call.ts";
import { type UniffiHandle, UniffiHandleMap } from "./handle-map.ts";
import { UniffiThrownObject } from "./errors.ts";
/**
 * Marker interface for all `interface` objects that cross the FFI.
 * Reminder: `interface` objects have methods written in Rust.
 *
 * This typesscript interface contains the unffi methods that are needed to make
 * the FFI work. It should shrink to zero methods.
 */
export declare abstract class UniffiAbstractObject {
    /**
     * Explicitly tell Rust to destroy the native peer that backs this object.
     *
     * Once this method has been called, any following method calls will throw an error.
     *
     * Can be called more than once.
     */
    abstract uniffiDestroy(): void;
    /**
     * A convenience method to use this object, then destroy it after its use.
     * @param block
     * @returns
     */
    uniffiUse<T>(block: (obj: this) => T): T;
}
/**
 * The interface for a helper class generated for each `interface` class.
 *
 * Methods of this interface are not exposed to the API.
 */
export interface UniffiObjectFactory<T> {
    bless(pointer: UniffiHandle): UniffiGcObject;
    unbless(ptr: UniffiGcObject): void;
    create(pointer: UniffiHandle): T;
    pointer(obj: T): UniffiHandle;
    clonePointer(obj: T): UniffiHandle;
    freePointer(pointer: UniffiHandle): void;
    isConcreteType(obj: any): obj is T;
}
/**
 * An FfiConverter for an object.
 */
export declare class FfiConverterObject<T> implements FfiConverter<UniffiHandle, T> {
    protected factory: UniffiObjectFactory<T>;
    constructor(factory: UniffiObjectFactory<T>);
    lift(value: UniffiHandle): T;
    lower(value: T, _alloc: RustBufferAllocator): UniffiHandle;
    readFromCursor(c: Cursor): T;
    writeIntoCursor(value: T, c: Cursor): void;
    protected lowerHandle(value: T): UniffiHandle;
    allocationSize(value: T): number;
}
export declare class FfiConverterObjectWithCallbacks<T> extends FfiConverterObject<T> {
    private handleMap;
    constructor(factory: UniffiObjectFactory<T>, handleMap?: UniffiHandleMap<T>);
    lower(value: T, alloc: RustBufferAllocator): UniffiHandle;
    lift(value: UniffiHandle): T;
    drop(handle: UniffiHandle): T | undefined;
    /**
     * Called by Rust's `CallbackInterfaceClone` vtable entry when it clones an
     * Arc holding a foreign-implemented object. Returns a new handle pointing to
     * the same JS object; removing either handle does not affect the other.
     */
    clone(handle: UniffiHandle): UniffiHandle;
}
export declare class FfiConverterObjectAsError<T> extends AbstractFfiConverterByteArray<UniffiThrownObject<T>> {
    private typeName;
    private innerConverter;
    constructor(typeName: string, innerConverter: FfiConverter<UniffiHandle, T>);
    readFromCursor(c: Cursor): UniffiThrownObject<T>;
    writeIntoCursor(value: UniffiThrownObject<T>, c: Cursor): void;
    allocationSize(value: UniffiThrownObject<T>): number;
}
//# sourceMappingURL=objects.d.ts.map