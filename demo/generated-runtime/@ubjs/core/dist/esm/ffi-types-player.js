/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */
// Tag factories for the player `DEFINITIONS` object. The shim reads `.tag`
// (and `.name` for Callback/Struct, `.inner` for Reference/MutReference). This
// is the player subset of @ubjs/node's FfiType: the JSI shim handles scalars
// (Void..RustBuffer), Callback, Struct, and Reference/MutReference(Struct).
// `Reference`/`MutReference` wrap an inner FfiType (a pointer to it); generated
// vtable-init functions emit `Reference(Struct("...VTable..."))` for the
// vtable-pointer arg. The `.inner` key mirrors `@ubjs/node`'s canonical FfiType
// and the napi parser (`runtimes/napi/src/register/spec_from_js.rs`).
export const FfiType = {
    Void: { tag: "Void" },
    UInt8: { tag: "UInt8" },
    Int8: { tag: "Int8" },
    UInt16: { tag: "UInt16" },
    Int16: { tag: "Int16" },
    UInt32: { tag: "UInt32" },
    Int32: { tag: "Int32" },
    UInt64: { tag: "UInt64" },
    Int64: { tag: "Int64" },
    Float32: { tag: "Float32" },
    Float64: { tag: "Float64" },
    Handle: { tag: "Handle" },
    RustBuffer: { tag: "RustBuffer" },
    ForeignBytes: { tag: "ForeignBytes" },
    RustCallStatus: { tag: "RustCallStatus" },
    VoidPointer: { tag: "VoidPointer" },
    Callback: (name) => ({ tag: "Callback", name }),
    Struct: (name) => ({ tag: "Struct", name }),
    Reference: (inner) => ({ tag: "Reference", inner }),
    MutReference: (inner) => ({ tag: "MutReference", inner }),
};
//# sourceMappingURL=ffi-types-player.js.map