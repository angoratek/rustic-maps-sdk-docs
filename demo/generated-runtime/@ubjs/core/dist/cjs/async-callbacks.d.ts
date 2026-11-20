import { type UniffiByteArray } from "./ffi-types.ts";
import { type RustBufferAllocator } from "./ffi-converters.ts";
type UniffiForeignFutureFree = (handle: bigint) => void;
export type UniffiForeignFuture = {
    handle: bigint;
    free: UniffiForeignFutureFree;
};
export declare function uniffiTraitInterfaceCallAsync<T>(makeCall: (signal: AbortSignal) => Promise<T>, handleSuccess: (value: T) => void, handleError: (callStatus: number, errorBuffer: UniffiByteArray) => void, lowerString: (str: string, alloc: RustBufferAllocator) => UniffiByteArray, alloc: RustBufferAllocator): UniffiForeignFuture;
export declare function uniffiTraitInterfaceCallAsyncWithError<T, E>(makeCall: (signal: AbortSignal) => Promise<T>, handleSuccess: (value: T) => void, handleError: (callStatus: number, errorBuffer: UniffiByteArray) => void, isErrorType: (error: any) => boolean, lowerError: (error: E, alloc: RustBufferAllocator) => UniffiByteArray, lowerString: (str: string, alloc: RustBufferAllocator) => UniffiByteArray, alloc: RustBufferAllocator): UniffiForeignFuture;
export declare function uniffiForeignFutureHandleCount(): number;
export {};
//# sourceMappingURL=async-callbacks.d.ts.map