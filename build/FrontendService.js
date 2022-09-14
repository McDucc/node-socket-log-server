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
const env_1 = require("./env");
const path_1 = __importDefault(require("path"));
const util = __importStar(require("util"));
const ws_1 = __importDefault(require("ws"));
let w;
class FrontEndcontroller extends HasApp_1.default {
    constructor() {
        super(env_1.env.frontend_port);
        this.redis = (0, Redis_1.default)();
        this.searchLockLimit = 3;
        this.searchLock = 0;
        new CleanUpService_1.default();
        this.bind('post', '/search', this.search);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);
        this.serveFile('app.html');
        this.serveFile('favicon.ico');
        this.serveFile('style.css');
        this.serveFile('bootstrap.css');
        this.serveFile('bootstrap.css.map');
        this.serveFile('translation.js');
        this.serveFile('alpine.js');
        w = new ws_1.default("ws://127.0.0.1:8080/log");
        w.onmessage = (e) => { console.log((new Uint16Array(Buffer.from(e.data))).toString() + "\n"); };
        w.onopen = (e) => { w.send('HELLO'); };
        this.startListening();
        this.smemberPromise = util.promisify(this.redis.smembers);
        this.keysPromise = util.promisify(this.redis.keys);
    }
    bind(method, routePattern, handler) {
        handler = handler.bind(this);
        this.app[method](routePattern, function (response, request) {
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
    async serveFile(file) {
        let filePath = path_1.default.resolve(__dirname, './frontend/' + file);
        if (!fs.existsSync(filePath))
            console.log(new Error(filePath + ' does not exist and can not be bound to router!'));
        this.bind('get', '/' + file, (request, response) => {
            fs.readFile(filePath, (err, data) => {
                if (err)
                    console.log(err);
                response.end(data);
            });
        });
    }
    authTest(request, response) {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            response.end('Unauthenticated');
            return;
        }
        response.end('Authenticated');
        return;
    }
    getServers(request, response) {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            response.end('Unauthenticated');
            return;
        }
        this.redis.smembers('servers', (err, reply) => {
            if (err) {
                console.log(err);
            }
            response.end(JSON.stringify({
                data: reply
            }));
        });
    }
    async search(request, response) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            response.end('Unauthenticated');
            return;
        }
        if (this.searchLock >= this.searchLockLimit) {
            response.end('Locked');
            return;
        }
        try {
            this.searchLock++;
            let parameters = JSON.parse(request.data);
            (_a = parameters.searchTerms) !== null && _a !== void 0 ? _a : (parameters.searchTerms = []);
            (_b = parameters.intervalStart) !== null && _b !== void 0 ? _b : (parameters.intervalStart = 0);
            (_c = parameters.intervalEnd) !== null && _c !== void 0 ? _c : (parameters.intervalEnd = 0);
            (_d = parameters.pageSize) !== null && _d !== void 0 ? _d : (parameters.pageSize = 0);
            (_e = parameters.page) !== null && _e !== void 0 ? _e : (parameters.page = 0);
            (_f = parameters.minimumSeverity) !== null && _f !== void 0 ? _f : (parameters.minimumSeverity = 0);
            (_g = parameters.maximumSeverity) !== null && _g !== void 0 ? _g : (parameters.maximumSeverity = 10);
            (_h = parameters.servers) !== null && _h !== void 0 ? _h : (parameters.servers = []);
            if (!Array.isArray(parameters.searchTerms) ||
                (parameters.intervalStart == 0 && parameters.intervalEnd == 0) ||
                parameters.intervalStart < parameters.intervalEnd ||
                parameters.page < 0 ||
                parameters.pageSize < 0 ||
                parameters.minimumSeverity > parameters.maximumSeverity ||
                !Array.isArray(parameters.servers)) {
                response.writeStatus('400 Bad Request');
                response.end('Parameters are not within acceptable ranges');
                return;
            }
            else {
                let entryCount = 0;
                let data = [];
                let pageStart = parameters.page * parameters.pageSize;
                let pageEnd = (parameters.page + 1) * parameters.pageSize;
                let now = Date.now();
                let intervalEnd = now - parameters.intervalEnd * 60000;
                let intervalStart = now - parameters.intervalStart * 60000;
                let reply = await this.keysPromise('log:*');
                reply = reply.sort().reverse();
                if (!Array.isArray(parameters.searchTerms)) {
                    parameters.searchTerms = [parameters.searchTerms];
                }
                for (let i = 0; i < parameters.searchTerms.length; i++) {
                    if (typeof parameters.searchTerms[i] !== 'string')
                        parameters.searchTerms[i] = JSON.stringify(parameters.searchTerms[i]);
                }
                for (let i = 0; i < reply.length; i++) {
                    let setKey = reply[i];
                    let time = Number.parseInt(setKey.substring(4, 13));
                    if (time < intervalEnd && time > intervalStart)
                        entryCount = await this.searchSet(setKey, parameters.searchTerms, parameters.servers, parameters.minimumSeverity, parameters.maximumSeverity, entryCount, pageStart, pageEnd, data);
                    if (entryCount >= pageEnd)
                        break;
                }
                response.writeStatus('200 OK');
                response.end(JSON.stringify({ data }));
            }
        }
        catch (err) {
            response.writeStatus('500 Internal Server Error');
            response.end(JSON.stringify(err));
        }
        finally {
            this.searchLock--;
        }
    }
    async searchSet(setKey, searchTerms, servers, minimumSeverity, maximumSeverity, entryCount, pageStart, pageEnd, data) {
        try {
            let reply = await this.smemberPromise(setKey);
            reply.some((message) => {
                var _a;
                for (let i = 0; i < searchTerms.length; i++) {
                    let searchTerm = searchTerms[i];
                    if (searchTerm === '' || message.indexOf(searchTerm) >= 0) {
                        try {
                            let info = JSON.parse(message);
                            if (servers.length === 0 ||
                                servers.includes((_a = info.server) !== null && _a !== void 0 ? _a : 'UNDEFINED') &&
                                    typeof (info.severity) === 'number' &&
                                    info.severity >= minimumSeverity &&
                                    info.severity <= maximumSeverity) {
                                if (entryCount >= pageStart && entryCount < pageEnd) {
                                    data.push(message);
                                }
                                entryCount++;
                            }
                        }
                        catch (err) {
                            console.log(err);
                        }
                        break;
                    }
                }
                return entryCount >= pageEnd;
            });
        }
        catch (err) {
            console.log(err);
        }
        return entryCount;
    }
}
exports.default = FrontEndcontroller;
class MessageInfo {
    constructor(severity, server, data) {
        this.severity = severity;
        this.server = server;
        this.data = data;
    }
}
