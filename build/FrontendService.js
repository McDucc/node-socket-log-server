"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RequestData_1 = __importDefault(require("./RequestData"));
const HasApp_1 = __importDefault(require("./HasApp"));
const CleanUpService_1 = __importDefault(require("./CleanUpService"));
const Redis_1 = __importDefault(require("./Redis"));
const fs = __importStar(require("fs"));
class FrontEndcontroller extends HasApp_1.default {
    constructor() {
        super();
        new CleanUpService_1.default();
        this.bind('post', '/search', this.search);
        this.bind('get', '/app', this.loadApp);
        this.startListening();
        this.redis = Redis_1.default();
    }
    bind(method, routePattern, handler) {
        this.app[method](routePattern, (response, request) => {
            response.onAborted(() => { });
            let headers = {};
            request.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });
            let body = '';
            response.onData(async (data, isLast) => {
                body += data;
                if (isLast) {
                    handler(new RequestData_1.default(headers, body), response);
                }
            });
        });
    }
    async loadApp(request, response) {
        for (let a = 0; a < 200; a++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            console.log(a + a);
        }
        fs.readFile('./src/frontend/app.html', (err, data) => {
            if (err) {
                response.end('Sorry, something went wrong while loading the app.');
                console.log(err);
            }
            else {
                response.end(data);
            }
        });
    }
    search(request, response) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            let parameters = JSON.parse(request.data);
            let searchTerm = (_a = parameters.searchTerm) !== null && _a !== void 0 ? _a : '';
            let intervalStart = (_b = parameters.intervalStart) !== null && _b !== void 0 ? _b : 0;
            let intervalEnd = (_c = parameters.intervalEnd) !== null && _c !== void 0 ? _c : 0;
            let pageSize = (_d = parameters.pageSize) !== null && _d !== void 0 ? _d : 0;
            let page = (_e = parameters.page) !== null && _e !== void 0 ? _e : 0;
            let minimumSeverity = (_f = parameters.page) !== null && _f !== void 0 ? _f : 0;
            let maximumSeverity = (_g = parameters.page) !== null && _g !== void 0 ? _g : 10;
            if (searchTerm === '' || (intervalStart == 0 && intervalEnd == 0) || intervalStart < intervalEnd
                || page < 0 || pageSize < 0 || pageSize > 250 || minimumSeverity > maximumSeverity) {
                response.writeStatus('400 Bad Request');
                response.end('Parameters are not within acceptable ranges: ' + JSON.stringify({
                    searchTerm,
                    intervalStart,
                    intervalEnd,
                    pageSize,
                    page,
                    minimumSeverity,
                    maximumSeverity
                }));
            }
            else {
                let entryCount = 0;
                let data = [];
                let pageStart = page * pageSize;
                let pageEnd = pageStart + pageSize;
                this.redis.keys('log:*', (err, reply) => {
                    if (!err) {
                        reply.sort().reverse();
                        reply.some((setKey) => {
                            let time = Number.parseInt(setKey.substring(4, 13));
                            if (time < Date.now() - intervalEnd * 60000 && time > Date.now() - intervalStart * 60000) {
                                this.redis.smembers(setKey, (err, reply) => {
                                    if (!err) {
                                        reply.some((message) => {
                                            if (message.includes(searchTerm)) {
                                                let info = JSON.parse(message);
                                                if (info.severity >= minimumSeverity && info.severity <= maximumSeverity) {
                                                    if (entryCount >= pageStart && entryCount < pageEnd) {
                                                        data.push(message);
                                                    }
                                                    entryCount++;
                                                }
                                            }
                                            return entryCount >= pageEnd;
                                        });
                                    }
                                });
                            }
                            return entryCount >= pageEnd;
                        });
                    }
                    else {
                        console.log(err);
                    }
                    response.writeStatus('200 OK');
                    response.end(JSON.stringify(data));
                });
            }
        }
        catch (err) {
            response.writeStatus('500 Internal Server Error');
            response.end(JSON.stringify(err));
        }
    }
}
exports.default = FrontEndcontroller;
