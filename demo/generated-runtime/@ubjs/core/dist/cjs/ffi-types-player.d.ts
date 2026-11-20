export declare const FfiType: {
    Void: {
        readonly tag: "Void";
    };
    UInt8: {
        readonly tag: "UInt8";
    };
    Int8: {
        readonly tag: "Int8";
    };
    UInt16: {
        readonly tag: "UInt16";
    };
    Int16: {
        readonly tag: "Int16";
    };
    UInt32: {
        readonly tag: "UInt32";
    };
    Int32: {
        readonly tag: "Int32";
    };
    UInt64: {
        readonly tag: "UInt64";
    };
    Int64: {
        readonly tag: "Int64";
    };
    Float32: {
        readonly tag: "Float32";
    };
    Float64: {
        readonly tag: "Float64";
    };
    Handle: {
        readonly tag: "Handle";
    };
    RustBuffer: {
        readonly tag: "RustBuffer";
    };
    ForeignBytes: {
        readonly tag: "ForeignBytes";
    };
    RustCallStatus: {
        readonly tag: "RustCallStatus";
    };
    VoidPointer: {
        readonly tag: "VoidPointer";
    };
    Callback: (name: string) => {
        readonly tag: "Callback";
        readonly name: string;
    };
    Struct: (name: string) => {
        readonly tag: "Struct";
        readonly name: string;
    };
    Reference: (inner: unknown) => {
        readonly tag: "Reference";
        readonly inner: unknown;
    };
    MutReference: (inner: unknown) => {
        readonly tag: "MutReference";
        readonly inner: unknown;
    };
};
//# sourceMappingURL=ffi-types-player.d.ts.map