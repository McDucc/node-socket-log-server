"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
class FrontEndcontroller extends HasApp_1.default {
    constructor() {
        super(env_1.env.frontend_port);
        this.redis = (0, Redis_1.default)();
        this.onAbortNoAction = () => { };
        this.searchLockLimit = env_1.env.search_limit;
        this.searchLock = 0;
        new CleanUpService_1.default();
        this.bind('post', '/search', this.search);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);
        ['app.html',
            'favicon.ico',
            'style.css',
            'bootstrap.css',
            'bootstrap.css.map',
            'translation.js',
            'alpine.js',
            'frontend.js'].forEach((element) => {
            this.serveFile(element);
        });
        this.startListening();
    }
    bind(method, routePattern, handler) {
        handler = handler.bind(this);
        this.app[method](routePattern, (response, request) => {
            response.onAborted(this.onAbortNoAction);
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
            return response.end('Unauthenticated');
        }
        return response.end('Authenticated');
    }
    getServers(request, response) {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            return response.end('Unauthenticated');
        }
        this.redis.smembers('servers', (err, data) => {
            if (err)
                console.log(err);
            response.end(JSON.stringify(data));
        });
    }
    parametersInvalid(parameters) {
        return !Array.isArray(parameters.searchTerms) ||
            (parameters.intervalStart == 0 && parameters.intervalEnd == 0) ||
            parameters.intervalStart < parameters.intervalEnd ||
            parameters.page < 0 ||
            parameters.pageSize < 0 ||
            parameters.minimumLevel > parameters.maximumLevel ||
            !Array.isArray(parameters.servers);
    }
    async search(request, response) {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            return response.end('Unauthenticated');
        }
        if (this.searchLock >= this.searchLockLimit) {
            return response.end('Locked');
        }
        try {
            this.searchLock++;
            let parameters = JSON.parse(request.data);
            if (this.parametersInvalid(parameters)) {
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
                let reply = await new Promise((resolve) => {
                    this.redis.keys('log:*', (err, data) => resolve(err ? [] : data));
                });
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
                    let time = Number.parseInt(setKey.substring(4));
                    if (time < intervalEnd && time > intervalStart)
                        entryCount = await this.searchSet(setKey, parameters.searchTerms, parameters.servers, parameters.minimumLevel, parameters.maximumLevel, entryCount, pageStart, pageEnd, data);
                    if (entryCount >= pageEnd)
                        break;
                }
                response.writeStatus('200 OK');
                response.end(JSON.stringify({ data }));
            }
        }
        catch (err) {
            response.writeStatus('500 Internal Server Error');
            response.end(JSON.stringify({
                message: err.message,
                stack: err.stack,
            }));
        }
        finally {
            this.searchLock--;
        }
    }
    async SSCAN(key, pattern) {
        return new Promise((resolve) => {
            this.redis.sscan(key, '0', 'MATCH', pattern, (err, data) => resolve(err ? ['0', []] : data));
        });
    }
    async searchSet(setKey, searchTerms, servers, minimumLevel, maximumLevel, entryCount, pageStart, pageEnd, data) {
        let resultSet = {};
        for (let server of servers) {
            let basePattern = `server:*${server}*level: [${minimumLevel}-${maximumLevel}]*`;
            for (let searchTerm of searchTerms) {
                let result = await this.SSCAN(setKey, basePattern + searchTerm + '*');
                for (let element of result[1])
                    resultSet[element] = true;
            }
        }
        for (let message of Object.keys(resultSet)) {
            if (entryCount >= pageStart && entryCount < pageEnd) {
                data.push(message);
            }
            if (++entryCount >= pageEnd)
                break;
        }
        return entryCount;
    }
}
exports.default = FrontEndcontroller;
