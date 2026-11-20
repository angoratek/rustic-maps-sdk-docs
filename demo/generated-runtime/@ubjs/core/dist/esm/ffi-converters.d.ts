import { Cursor } from "./cursor.ts";
import { type UniffiByteArray } from "./ffi-types.ts";
export type RustBufferAllocator = (n: number) => Uint8Array;
export interface FfiConverter<FfiType, TsType> {
    lift(value: FfiType): TsType;
    lower(value: TsType, alloc: RustBufferAllocator): FfiType;
    readFromCursor(c: Cursor): TsType;
    writeIntoCursor(value: TsType, c: Cursor): void;
    allocationSize(value: TsType): number;
}
export declare abstract class AbstractFfiConverterByteArray<TsType> implements FfiConverter<UniffiByteArray, TsType> {
    lift(value: UniffiByteArray): TsType;
    lower(value: TsType, alloc: RustBufferAllocator): UniffiByteArray;
    abstract readFromCursor(c: Cursor): TsType;
    abstract writeIntoCursor(value: TsType, c: Cursor): void;
    abstract allocationSize(value: TsType): number;
}
export declare const FfiConverterInt8: FfiConverter<number, number>;
export declare const FfiConverterInt16: FfiConverter<number, number>;
export declare const FfiConverterInt32: FfiConverter<number, number>;
export declare const FfiConverterInt64: FfiConverter<bigint, bigint>;
export declare const FfiConverterFloat32: FfiConverter<number, number>;
export declare const FfiConverterFloat64: FfiConverter<number, number>;
export declare const FfiConverterUInt8: FfiConverter<number, number>;
export declare const FfiConverterUInt16: FfiConverter<number, number>;
export declare const FfiConverterUInt32: FfiConverter<number, number>;
export declare const FfiConverterUInt64: FfiConverter<bigint, bigint>;
export declare const FfiConverterBool: {
    lift: (n: number) => boolean;
    lower: (b: boolean, _alloc: RustBufferAllocator) => 0 | 1;
    allocationSize: (_v: boolean) => number;
    readFromCursor: (c: Cursor) => boolean;
    writeIntoCursor: (v: boolean, c: Cursor) => void;
};
export type UniffiDuration = number;
export declare const FfiConverterDuration: {
    readFromCursor(c: Cursor): UniffiDuration;
    writeIntoCursor(value: UniffiDuration, c: Cursor): void;
    allocationSize(_value: UniffiDuration): number;
    lift(value: UniffiByteArray): number;
    lower(value: number, alloc: RustBufferAllocator): UniffiByteArray;
};
export type UniffiTimestamp = Date;
export declare const FfiConverterTimestamp: {
    readFromCursor(c: Cursor): UniffiTimestamp;
    writeIntoCursor(value: UniffiTimestamp, c: Cursor): void;
    allocationSize(_value: UniffiTimestamp): number;
    lift(value: UniffiByteArray): Date;
    lower(value: Date, alloc: RustBufferAllocator): UniffiByteArray;
};
export declare class FfiConverterOptional<Item> extends AbstractFfiConverterByteArray<Item | undefined> {
    private itemConverter;
    constructor(itemConverter: FfiConverter<any, Item>);
    readFromCursor(c: Cursor): Item | undefined;
    writeIntoCursor(value: Item | undefined, c: Cursor): void;
    allocationSize(value: Item | undefined): number;
}
export declare class FfiConverterArray<Item> extends AbstractFfiConverterByteArray<Array<Item>> {
    private itemConverter;
    constructor(itemConverter: FfiConverter<any, Item>);
    readFromCursor(c: Cursor): Array<Item>;
    writeIntoCursor(array: Array<Item>, c: Cursor): void;
    allocationSize(array: Array<Item>): number;
}
export declare class FfiConverterMap<K, V> extends AbstractFfiConverterByteArray<Map<K, V>> {
    private keyConverter;
    private valueConverter;
    constructor(keyConverter: FfiConverter<any, K>, valueConverter: FfiConverter<any, V>);
    readFromCursor(c: Cursor): Map<K, V>;
    writeIntoCursor(map: Map<K, V>, c: Cursor): void;
    allocationSize(map: Map<K, V>): number;
}
export declare const FfiConverterArrayBuffer: {
    readFromCursor(c: Cursor): ArrayBuffer;
    writeIntoCursor(value: ArrayBuffer, c: Cursor): void;
    allocationSize(value: ArrayBuffer): number;
    lift(value: UniffiByteArray): ArrayBuffer;
    lower(value: ArrayBuffer, alloc: RustBufferAllocator): UniffiByteArray;
};
export declare const FfiConverterUint8Array: {
    readFromCursor(c: Cursor): Uint8Array;
    writeIntoCursor(value: Uint8Array, c: Cursor): void;
    allocationSize(value: Uint8Array): number;
    lift(value: UniffiByteArray): Uint8Array<ArrayBufferLike>;
    lower(value: Uint8Array<ArrayBufferLike>, alloc: RustBufferAllocator): UniffiByteArray;
};
type StringConverter = {
    stringToBytes: (s: string) => UniffiByteArray;
    bytesToString: (ab: UniffiByteArray) => string;
    stringByteLength: (s: string) => number;
    writeStringIntoBuffer?: (s: string, buf: any, offset: number) => number;
    readStringFromBuffer?: (buf: any, offset: number, length: number) => string;
};
export declare function uniffiCreateFfiConverterString(converter: StringConverter): FfiConverter<UniffiByteArray, string>;
export {};
//# sourceMappingURL=ffi-converters.d.ts.map