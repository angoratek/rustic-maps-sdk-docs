import { FfiConverterUInt64, } from "./ffi-converters.js";
import { UniffiHandleMap, defaultUniffiHandle, } from "./handle-map.js";
import { CALL_ERROR, CALL_UNEXPECTED_ERROR } from "./rust-call.js";
const handleConverter = FfiConverterUInt64;
export class FfiConverterCallback {
    handleMap;
    constructor(handleMap = new UniffiHandleMap()) {
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
        return handleConverter.allocationSize(defaultUniffiHandle);
    }
    clone(handle) {
        return this.handleMap.clone(handle);
    }
    drop(handle) {
        return this.handleMap.remove(handle);
    }
}
export function uniffiTraitInterfaceCall(makeCall, handleSuccess, handleError, lowerString, alloc) {
    try {
        handleSuccess(makeCall());
    }
    catch (e) {
        handleError(CALL_UNEXPECTED_ERROR, lowerString(e.toString(), alloc));
    }
}
export function uniffiTraitInterfaceCallWithError(makeCall, handleSuccess, handleError, isErrorType, lowerError, lowerString, alloc) {
    try {
        handleSuccess(makeCall());
    }
    catch (e) {
        // Hermes' prototype chain seems buggy, so we need to make our
        // own arrangements
        if (isErrorType(e)) {
            handleError(CALL_ERROR, lowerError(e, alloc));
        }
        else {
            handleError(CALL_UNEXPECTED_ERROR, lowerString(e.toString(), alloc));
        }
    }
}
//# sourceMappingURL=callbacks.js.map