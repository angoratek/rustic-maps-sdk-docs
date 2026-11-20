"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FfiConverterUint8Array = exports.FfiConverterArrayBuffer = exports.FfiConverterMap = exports.FfiConverterArray = exports.FfiConverterOptional = exports.FfiConverterTimestamp = exports.FfiConverterDuration = exports.FfiConverterBool = exports.FfiConverterUInt64 = exports.FfiConverterUInt32 = exports.FfiConverterUInt16 = exports.FfiConverterUInt8 = exports.FfiConverterFloat64 = exports.FfiConverterFloat32 = exports.FfiConverterInt64 = exports.FfiConverterInt32 = exports.FfiConverterInt16 = exports.FfiConverterInt8 = exports.AbstractFfiConverterByteArray = void 0;
exports.uniffiCreateFfiConverterString = uniffiCreateFfiConverterString;
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */
const cursor_ts_1 = require("./cursor.js");
const errors_ts_1 = require("./errors.js");
class AbstractFfiConverterByteArray {
    lift(value) {
        const c = cursor_ts_1.Cursor.fromUint8Array(value);
        return this.readFromCursor(c);
    }
    lower(value, alloc) {
        const view = alloc(this.allocationSize(value));
        const c = cursor_ts_1.Cursor.fromUint8Array(view);
        this.writeIntoCursor(value, c);
        return view;
    }
}
exports.AbstractFfiConverterByteArray = AbstractFfiConverterByteArray;
/**
 * Build a primitive `FfiConverter` whose hot path delegates straight into
 * Cursor's monomorphic typed accessors. The returned object is a plain
 * module-level value (not a class instance) — V8 can inline `lift`/`lower`
 * trivially, and `readFromCursor`/`writeIntoCursor` are direct references
 * to the Cursor method wrappers (no per-call function-pointer dispatch via
 * the old `FfiConverterNumber(reader, writer, byteSize)` closure shape).
 */
function makePrimitive(read, write, byteSize) {
    return {
        lift: (v) => v,
        lower: (v, _alloc) => v,
        allocationSize: (_v) => byteSize,
        readFromCursor: read,
        writeIntoCursor: write,
    };
}
// Ints
exports.FfiConverterInt8 = makePrimitive((c) => c.readI8(), (v, c) => c.writeI8(v), 1);
exports.FfiConverterInt16 = makePrimitive((c) => c.readI16(), (v, c) => c.writeI16(v), 2);
exports.FfiConverterInt32 = makePrimitive((c) => c.readI32(), (v, c) => c.writeI32(v), 4);
exports.FfiConverterInt64 = makePrimitive((c) => c.readI64(), (v, c) => c.writeI64(v), 8);
// Floats
exports.FfiConverterFloat32 = makePrimitive((c) => c.readF32(), (v, c) => c.writeF32(v), 4);
exports.FfiConverterFloat64 = makePrimitive((c) => c.readF64(), (v, c) => c.writeF64(v), 8);
// UInts
exports.FfiConverterUInt8 = makePrimitive((c) => c.readU8(), (v, c) => c.writeU8(v), 1);
exports.FfiConverterUInt16 = makePrimitive((c) => c.readU16(), (v, c) => c.writeU16(v), 2);
exports.FfiConverterUInt32 = makePrimitive((c) => c.readU32(), (v, c) => c.writeU32(v), 4);
exports.FfiConverterUInt64 = makePrimitive((c) => c.readU64(), (v, c) => c.writeU64(v), 8);
// Bool — separate from `makePrimitive` because lift/lower convert between
// the on-the-wire `number` and JS `boolean` rather than passing through.
exports.FfiConverterBool = (() => {
    const read = (c) => c.readBool();
    const write = (v, c) => c.writeBool(v);
    return {
        lift: (n) => !!n,
        lower: (b, _alloc) => (b ? 1 : 0),
        allocationSize: (_v) => 1,
        readFromCursor: read,
        writeIntoCursor: write,
    };
})();
exports.FfiConverterDuration = (() => {
    const msPerSecBigInt = BigInt("1000");
    const nanosPerMs = 1e6;
    class FFIConverter extends AbstractFfiConverterByteArray {
        readFromCursor(c) {
            const secsBigInt = c.readU64();
            const nanos = c.readU32();
            const ms = Number(secsBigInt * msPerSecBigInt);
            if (ms === Number.POSITIVE_INFINITY || ms === Number.NEGATIVE_INFINITY) {
                throw new errors_ts_1.UniffiInternalError.NumberOverflow();
            }
            return ms + nanos / nanosPerMs;
        }
        writeIntoCursor(value, c) {
            const ms = value.valueOf();
            const secsBigInt = BigInt(Math.trunc(ms)) / msPerSecBigInt;
            const remainingNanos = (ms % 1000) * nanosPerMs;
            c.writeU64(secsBigInt);
            c.writeU32(remainingNanos);
        }
        allocationSize(_value) {
            return 12;
        }
    }
    return new FFIConverter();
})();
exports.FfiConverterTimestamp = (() => {
    const msPerSecBigInt = BigInt("1000");
    const nanosPerMs = 1e6;
    const msPerSec = 1e3;
    function safeDate(ms) {
        if (Math.abs(ms) > 8.64e15) {
            throw new errors_ts_1.UniffiInternalError.DateTimeOverflow();
        }
        return new Date(ms);
    }
    class FFIConverter extends AbstractFfiConverterByteArray {
        readFromCursor(c) {
            const secsBigInt = c.readI64();
            const nanos = c.readU32();
            const ms = Number(secsBigInt * msPerSecBigInt);
            if (ms >= 0) {
                return safeDate(ms + nanos / nanosPerMs);
            }
            else {
                return safeDate(ms - nanos / nanosPerMs);
            }
        }
        writeIntoCursor(value, c) {
            const ms = value.valueOf();
            const secsBigInt = BigInt(Math.trunc(ms / msPerSec));
            const remainingNanos = Math.abs((ms % msPerSec) * nanosPerMs);
            c.writeI64(secsBigInt);
            c.writeU32(remainingNanos);
        }
        allocationSize(_value) {
            return 12;
        }
    }
    return new FFIConverter();
})();
class FfiConverterOptional extends AbstractFfiConverterByteArray {
    itemConverter;
    constructor(itemConverter) {
        super();
        this.itemConverter = itemConverter;
    }
    readFromCursor(c) {
        const tag = c.readU8();
        return tag === 0 ? undefined : this.itemConverter.readFromCursor(c);
    }
    writeIntoCursor(value, c) {
        if (value === undefined) {
            c.writeU8(0);
            return;
        }
        c.writeU8(1);
        this.itemConverter.writeIntoCursor(value, c);
    }
    allocationSize(value) {
        return (1 + (value === undefined ? 0 : this.itemConverter.allocationSize(value)));
    }
}
exports.FfiConverterOptional = FfiConverterOptional;
class FfiConverterArray extends AbstractFfiConverterByteArray {
    itemConverter;
    constructor(itemConverter) {
        super();
        this.itemConverter = itemConverter;
    }
    readFromCursor(c) {
        const size = c.readI32();
        const array = new Array(size);
        for (let i = 0; i < size; i++) {
            array[i] = this.itemConverter.readFromCursor(c);
        }
        return array;
    }
    writeIntoCursor(array, c) {
        c.writeI32(array.length);
        for (const item of array) {
            this.itemConverter.writeIntoCursor(item, c);
        }
    }
    allocationSize(array) {
        let size = 4;
        for (const item of array) {
            size += this.itemConverter.allocationSize(item);
        }
        return size;
    }
}
exports.FfiConverterArray = FfiConverterArray;
class FfiConverterMap extends AbstractFfiConverterByteArray {
    keyConverter;
    valueConverter;
    constructor(keyConverter, valueConverter) {
        super();
        this.keyConverter = keyConverter;
        this.valueConverter = valueConverter;
    }
    readFromCursor(c) {
        const size = c.readI32();
        const map = new Map();
        for (let i = 0; i < size; i++) {
            map.set(this.keyConverter.readFromCursor(c), this.valueConverter.readFromCursor(c));
        }
        return map;
    }
    writeIntoCursor(map, c) {
        c.writeI32(map.size);
        for (const [k, v] of map.entries()) {
            this.keyConverter.writeIntoCursor(k, c);
            this.valueConverter.writeIntoCursor(v, c);
        }
    }
    allocationSize(map) {
        let size = 4;
        for (const [k, v] of map.entries()) {
            size +=
                this.keyConverter.allocationSize(k) +
                    this.valueConverter.allocationSize(v);
        }
        return size;
    }
}
exports.FfiConverterMap = FfiConverterMap;
exports.FfiConverterArrayBuffer = (() => {
    class FFIConverter extends AbstractFfiConverterByteArray {
        readFromCursor(c) {
            const length = c.readI32();
            return c.readArrayBuffer(length);
        }
        writeIntoCursor(value, c) {
            c.writeI32(value.byteLength);
            c.writeBytes(new Uint8Array(value));
        }
        allocationSize(value) {
            return 4 + value.byteLength;
        }
    }
    return new FFIConverter();
})();
exports.FfiConverterUint8Array = (() => {
    class FFIConverter extends AbstractFfiConverterByteArray {
        readFromCursor(c) {
            const length = c.readI32();
            return c.readBytes(length);
        }
        writeIntoCursor(value, c) {
            c.writeI32(value.byteLength);
            c.writeBytes(value);
        }
        allocationSize(value) {
            return 4 + value.byteLength;
        }
    }
    return new FFIConverter();
})();
function uniffiCreateFfiConverterString(converter) {
    class FFIConverter {
        lift(value) {
            return converter.bytesToString(value);
        }
        lower(value, _alloc) {
            return converter.stringToBytes(value);
        }
        readFromCursor(c) {
            const length = c.readI32();
            if (converter.readStringFromBuffer) {
                // Read directly from the cursor's backing ArrayBuffer — zero copy.
                // The helper takes an object with an `arrayBuffer` property plus an
                // absolute offset and length; for Cursor that's `u8.buffer` and
                // `start + pos`.
                const buf = { arrayBuffer: c.u8.buffer };
                const offset = c.start + c.pos;
                c.pos += length;
                return converter.readStringFromBuffer(buf, offset, length);
            }
            const bytes = c.readBytes(length);
            return converter.bytesToString(bytes);
        }
        writeIntoCursor(value, c) {
            if (converter.writeStringIntoBuffer) {
                // Encode the string into the buffer at the data offset (after the
                // i32 length prefix), then backfill the length prefix with the
                // actual bytes written. Skips one `stringByteLength` measurement
                // call per string compared to the writeBytes path below.
                const lengthPos = c.pos;
                // Reserve 4 bytes for the length prefix.
                c.pos += 4;
                const dataOffset = c.start + c.pos;
                // Synthetic buf with the cursor's underlying ArrayBuffer; helpers
                // use `buf.arrayBuffer` to construct a Uint8Array view.
                const buf = { arrayBuffer: c.u8.buffer };
                const bytesWritten = converter.writeStringIntoBuffer(value, buf, dataOffset);
                // Backfill the length prefix (big-endian i32, matches Cursor.writeI32).
                c.dv.setInt32(lengthPos, bytesWritten);
                c.pos += bytesWritten;
                return;
            }
            const bytes = converter.stringToBytes(value);
            c.writeI32(bytes.byteLength);
            c.writeBytes(bytes);
        }
        allocationSize(value) {
            return 4 + converter.stringByteLength(value);
        }
    }
    return new FFIConverter();
}
//# sourceMappingURL=ffi-converters.js.map