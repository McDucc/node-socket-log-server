"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ArrayBufferToString(arrayBuffer) {
    return Buffer.from(arrayBuffer).toString();
}
exports.default = ArrayBufferToString;
