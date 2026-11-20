export declare class UniffiError extends Error {
    constructor(enumTypeName: string, variantName: string, message?: string);
    static instanceOf(obj: any): obj is UniffiError;
}
export declare class UniffiThrownObject<T> extends Error {
    readonly inner: T;
    private static __baseTypeName;
    private readonly __baseTypeName;
    constructor(typeName: string, inner: T, message?: string);
    static instanceOf(err: any): err is UniffiThrownObject<unknown>;
}
export declare const UniffiInternalError: {
    ApiChecksumMismatch: {
        new (func: string): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    NumberOverflow: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    DateTimeOverflow: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    BufferOverflow: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    ContractVersionMismatch: {
        new (rustVersion: any, bindingsVersion: any): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    IncompleteData: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    AbortError: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    UnexpectedEnumCase: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    UnexpectedNullPointer: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    UnexpectedRustCallStatusCode: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    UnexpectedRustCallError: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    UnexpectedStaleHandle: {
        new (): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    RustPanic: {
        new (message: string): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
    Unimplemented: {
        new (message: string): {
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
    };
};
//# sourceMappingURL=errors.d.ts.map