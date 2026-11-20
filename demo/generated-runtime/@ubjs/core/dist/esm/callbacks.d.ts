import { Cursor } from "./cursor.ts";
import { type FfiConverter, type RustBufferAllocator } from "./ffi-converters.ts";
import { type UniffiByteArray } from "./ffi-types.ts";
import { type UniffiHandle, UniffiHandleMap } from "./handle-map.ts";
export declare class FfiConverterCallback<T> implements FfiConverter<UniffiHandle, T> {
    private handleMap;
    constructor(handleMap?: UniffiHandleMap<T>);
    lift(value: UniffiHandle): T;
    lower(value: T, _alloc: RustBufferAllocator): UniffiHandle;
    readFromCursor(c: Cursor): T;
    writeIntoCursor(value: T, c: Cursor): void;
    allocationSize(value: T): number;
    clone(handle: UniffiHandle): UniffiHandle;
    drop(handle: UniffiHandle): T | undefined;
}
export type UniffiReferenceHolder<T> = {
    pointee: T;
};
export declare function uniffiTraitInterfaceCall<T>(makeCall: () => T, handleSuccess: (v: T) => void, handleError: (callStatus: number, errorBuffer: UniffiByteArray) => void, lowerString: (s: string, alloc: RustBufferAllocator) => UniffiByteArray, alloc: RustBufferAllocator): void;
export declare function uniffiTraitInterfaceCallWithError<T, E extends Error>(makeCall: () => T, handleSuccess: (v: T) => void, handleError: (callStatus: number, errorBuffer: UniffiByteArray) => void, isErrorType: (e: any) => e is E, lowerError: (err: E, alloc: RustBufferAllocator) => UniffiByteArray, lowerString: (s: string, alloc: RustBufferAllocator) => UniffiByteArray, alloc: RustBufferAllocator): void;
//# sourceMappingURL=callbacks.d.ts.map