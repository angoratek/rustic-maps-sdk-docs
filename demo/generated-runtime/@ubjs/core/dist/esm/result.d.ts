import { type UniffiByteArray } from "./ffi-types.ts";
import { type UniffiReferenceHolder } from "./callbacks.ts";
import { type UniffiRustCallStatus } from "./rust-call.ts";
export type UniffiResult<T> = UniffiReferenceHolder<T> | UniffiRustCallStatus;
export declare const UniffiResult: {
    ready<T>(): UniffiResult<T>;
    writeError<T>(result: UniffiResult<T>, code: number, buf: UniffiByteArray): UniffiResult<T>;
    writeSuccess<T>(result: UniffiResult<T>, obj: T): UniffiResult<T>;
    success<T>(pointee: T): UniffiResult<T>;
};
//# sourceMappingURL=result.d.ts.map