"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestData {
    constructor(headers, data) {
        this.headers = headers;
        this.data = data;
        this.data = Buffer.from(data).toString();
    }
}
exports.default = RequestData;
