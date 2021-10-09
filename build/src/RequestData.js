"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Wraps the data of the original request since it does not exist past the initial uws handler
 */
var RequestData = /** @class */ (function () {
    function RequestData(headers, data) {
        this.headers = headers;
        this.data = data;
    }
    return RequestData;
}());
exports.default = RequestData;
