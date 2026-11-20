/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */
export class Memory {
    memory;
    cachedDv;
    cachedU8;
    constructor(memory) {
        this.memory = memory;
        this.cachedDv = new DataView(memory.buffer);
        this.cachedU8 = new Uint8Array(memory.buffer);
    }
    /** Always-current DataView. Cheap if memory has not grown. */
    dv() {
        if (this.cachedDv.buffer !== this.memory.buffer) {
            this.cachedDv = new DataView(this.memory.buffer);
        }
        return this.cachedDv;
    }
    /** Always-current Uint8Array. Cheap if memory has not grown. */
    view() {
        if (this.cachedU8.buffer !== this.memory.buffer) {
            this.cachedU8 = new Uint8Array(this.memory.buffer);
        }
        return this.cachedU8;
    }
    buffer() {
        return this.memory.buffer;
    }
    readU8(ptr) {
        return this.dv().getUint8(ptr);
    }
    readU32(ptr) {
        return this.dv().getUint32(ptr, true);
    }
    readI32(ptr) {
        return this.dv().getInt32(ptr, true);
    }
    readU64(ptr) {
        return this.dv().getBigUint64(ptr, true);
    }
    readF32(ptr) {
        return this.dv().getFloat32(ptr, true);
    }
    readF64(ptr) {
        return this.dv().getFloat64(ptr, true);
    }
    writeU8(ptr, v) {
        this.dv().setUint8(ptr, v);
    }
    writeU32(ptr, v) {
        this.dv().setUint32(ptr, v, true);
    }
    writeI32(ptr, v) {
        this.dv().setInt32(ptr, v, true);
    }
    writeU64(ptr, v) {
        this.dv().setBigUint64(ptr, v, true);
    }
    writeF32(ptr, v) {
        this.dv().setFloat32(ptr, v, true);
    }
    writeF64(ptr, v) {
        this.dv().setFloat64(ptr, v, true);
    }
    /** Returns a fresh `Uint8Array` copy of `[ptr, ptr+len)`. */
    readBytes(ptr, len) {
        return this.view().slice(ptr, ptr + len);
    }
    writeBytes(ptr, src) {
        this.view().set(src, ptr);
    }
}
