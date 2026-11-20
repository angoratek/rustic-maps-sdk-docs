"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FfiConverterCallback = void 0;
exports.uniffiTraitInterfaceCall = uniffiTraitInterfaceCall;
exports.uniffiTraitInterfaceCallWithError = uniffiTraitInterfaceCallWithError;
const ffi_converters_ts_1 = require("./ffi-converters.js");
const handle_map_ts_1 = require("./handle-map.js");
const rust_call_ts_1 = require("./rust-call.js");
const handleConverter = ffi_converters_ts_1.FfiConverterUInt64;
class FfiConverterCallback {
    handleMap;
    constructor(handleMap = new handle_map_ts_1.UniffiHandleMap()) {
        this.handleMap = handleMap;
    }
    lift(value) {
        return this.handleMap.get(value);
    }
    lower(value, _alloc) {
        return this.handleMap.insert(value);
    }
    readFromCursor(c) {
        return this.lift(handleConverter.readFromCursor(c));
    }
    writeIntoCursor(value, c) {
        handleConverter.writeIntoCursor(this.handleMap.insert(value), c);
    }
    allocationSize(value) {
        return handleConverter.allocationSize(handle_map_ts_1.defaultUniffiHandle);
    }
    clone(handle) {
        return this.handleMap.clone(handle);
    }
    drop(handle) {
        return this.handleMap.remove(handle);
    }
}
exports.FfiConverterCallback = FfiConverterCallback;
function uniffiTraitInterfaceCall(makeCall, handleSuccess, handleError, lowerString, alloc) {
    try {
        handleSuccess(makeCall());
    }
    catch (e) {
        handleError(rust_call_ts_1.CALL_UNEXPECTED_ERROR, lowerString(e.toString(), alloc));
    }
}
function uniffiTraitInterfaceCallWithError(makeCall, handleSuccess, handleError, isErrorType, lowerError, lowerString, alloc) {
    try {
        handleSuccess(makeCall());
    }
    catch (e) {
        // Hermes' prototype chain seems buggy, so we need to make our
        // own arrangements
        if (isErrorType(e)) {
            handleError(rust_call_ts_1.CALL_ERROR, lowerError(e, alloc));
        }
        else {
            handleError(rust_call_ts_1.CALL_UNEXPECTED_ERROR, lowerString(e.toString(), alloc));
        }
    }
}
//# sourceMappingURL=callbacks.js.map