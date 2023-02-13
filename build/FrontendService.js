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
const fs = __importStar(require("fs"));
const env_1 = require("./env");
const path_1 = __importDefault(require("path"));
const PostgresSetup_1 = __importDefault(require("./PostgresSetup"));
const zlib_1 = require("zlib");
function EndReponse(response, data, closeConnection = false) {
    if (!response.ended) {
        response.end(data, closeConnection);
    }
}
class FrontEndcontroller extends HasApp_1.default {
    constructor() {
        super(env_1.env.frontend_port);
        this.onAbortNoAction = () => { };
        this.searchLockLimit = env_1.env.search_limit;
        this.searchLock = 0;
        this.searchQuery1Name = 'search-query-1';
        this.searchQuery1 = `SELECT level,server,time,message,data FROM ${env_1.env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel IN ($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7
    OFFSET $8 LIMIT $9`;
        this.searchQuery2Name = 'search-query-2';
        this.searchQuery2 = `SELECT level,server,time,message,data FROM ${env_1.env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel IN ($2)
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6
    OFFSET $7 LIMIT $8`;
        this.searchQuery1CountName = 'search-query-1-count';
        this.searchQuery1Count = `SELECT COUNT(*) as count FROM ${env_1.env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel IN ($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7`;
        this.searchQuery2CountName = 'search-query-2-count';
        this.searchQuery2Count = `SELECT COUNT(*) as count FROM ${env_1.env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel IN $2
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6`;
        this.metricsQueryName = 'search-query-2-count';
        this.metricsQuery = `SELECT server,time,data FROM ${env_1.env.postgres_table} WHERE 
    channel = 'metrics'
    AND level = 0
    AND time BETWEEN $1 AND $2`;
        this.postgresPool = (0, PostgresSetup_1.default)();
        this.bind('post', '/search', this.search);
        this.bind('post', '/metrics', this.searchMetrics);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);
        this.bind('post', '/channels', this.getChannels);
        ['app.html',
            'favicon.ico',
            'style.css',
            'translation.js',
            'frontend.js'].forEach((element) => {
            this.serveFile(element);
        });
        this.startListening();
    }
    bind(method, routePattern, handler) {
        handler = handler.bind(this);
        this.app[method](routePattern, (response, request) => {
            response.onAborted(() => { response.ended = true; });
            let headers = {};
            request.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });
            let body = Buffer.from('');
            response.onData(async (data, isLast) => {
                body = Buffer.concat([body, Buffer.from(data)]);
                if (isLast) {
                    handler(new RequestData_1.default(headers, body.toString()), response);
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
                EndReponse(response, data);
            });
        });
    }
    authTest(request, response) {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }
        return EndReponse(response, 'Authenticated');
    }
    async getServers(request, response) {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }
        let query = await this.postgresPool.query("get-servers", "SELECT DISTINCT server from logs ORDER BY server DESC", []);
        let data = query.map(entry => {
            return entry.server;
        });
        EndReponse(response, JSON.stringify(data));
    }
    async getChannels(request, response) {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }
        let data = await this.getChannelArray();
        EndReponse(response, JSON.stringify(data));
    }
    async getChannelArray() {
        let query = await this.postgresPool.query("get-channels", "SELECT DISTINCT channel from logs WHERE channel != 'metrics' ORDER BY channel DESC", []);
        let data = query.map(entry => {
            return entry.channel;
        });
        return data;
    }
    parametersInvalid(parameters) {
        return parameters.intervalStart == 0 && parameters.intervalEnd == 0 ||
            parameters.page < 0 ||
            parameters.pageSize < 1 ||
            parameters.minimumLevel > parameters.maximumLevel ||
            !Array.isArray(parameters.servers);
    }
    async searchMetrics(request, response) {
        await this.search(request, response, 'metrics');
    }
    async search(request, response, mode = 'database') {
        if (request.headers['auth-token'] != env_1.env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }
        if (this.searchLock >= this.searchLockLimit) {
            return EndReponse(response, 'Locked');
        }
        try {
            this.searchLock++;
            let data = JSON.parse(request.data);
            if (mode === 'metrics') {
                await this.metricsSearch(data, response);
            }
            else {
                await this.databaseSearch(data, response);
            }
        }
        catch (err) {
            response.writeStatus('500 Internal Server Error');
            EndReponse(response, JSON.stringify({
                message: err.message,
                stack: err.stack,
            }));
        }
        finally {
            this.searchLock--;
        }
    }
    async databaseSearch(parametersRaw, response) {
        if (this.parametersInvalid(parametersRaw)) {
            response.writeStatus('400 Bad Request');
            EndReponse(response, 'Parameters are not within acceptable ranges');
            return;
        }
        else {
            let parameters = parametersRaw;
            if (typeof parameters.searchTerm !== 'string') {
                parameters.searchTerm = JSON.stringify(parameters.searchTerm);
            }
            let data = await this.databaseLookup(parameters.searchTerm, parameters.servers, parameters.channels, parameters.minimumLevel, parameters.maximumLevel, parameters.intervalEnd, parameters.intervalStart, parameters.page * parameters.pageSize, parameters.pageSize);
            data.pageSize = parameters.pageSize;
            data.page = parameters.page;
            response.writeStatus('200 OK');
            response.writeHeader('Content-Encoding', 'gzip');
            EndReponse(response, (0, zlib_1.gzipSync)(JSON.stringify(data), { level: 9, memLevel: 9 }));
        }
    }
    async metricsSearch(parametersRaw, response) {
        let parameters = parametersRaw;
        let data = await this.metricsLookup(parameters.intervalEnd, parameters.intervalStart);
        response.writeStatus('200 OK');
        response.writeHeader('Content-Encoding', 'gzip');
        EndReponse(response, (0, zlib_1.gzipSync)(JSON.stringify(data), { level: 9, memLevel: 9 }));
    }
    async metricsLookup(minimumTime, maximumTime) {
        let data = await this.postgresPool.query(this.metricsQueryName, this.metricsQuery, [minimumTime, maximumTime]);
        return {
            data,
            entryCount: 0,
            page: 0,
            pageSize: 0
        };
    }
    async databaseLookup(searchTerm, servers, channels, minimumLevel, maximumLevel, minimumTime, maximumTime, offset, pageSize) {
        let data;
        let entryCount;
        if (channels === undefined) {
            channels = await this.getChannelArray();
        }
        if (servers === undefined) {
            let parameters1 = [searchTerm, channels, minimumLevel, maximumLevel, maximumTime, minimumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery2Name, this.searchQuery2, parameters1);
            let parameters2 = [searchTerm, channels, minimumLevel, maximumLevel, maximumTime, minimumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery2CountName, this.searchQuery2Count, parameters2))[0].count;
        }
        else {
            let serverCasted = '{' + servers.join(',') + '}';
            let parameters1 = [searchTerm, channels, minimumLevel, maximumLevel, serverCasted, maximumTime, minimumTime, offset, pageSize];
            console.log(parameters1);
            data = await this.postgresPool.query(this.searchQuery1Name, this.searchQuery1, parameters1);
            let parameters2 = [searchTerm, channels, minimumLevel, maximumLevel, serverCasted, maximumTime, minimumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery1CountName, this.searchQuery1Count, parameters2))[0].count;
        }
        return {
            entryCount,
            data,
            pageSize: 0,
            page: 0
        };
    }
}
exports.default = FrontEndcontroller;
class SearchParameters {
    constructor() {
        this.minimumLevel = 0;
        this.maximumLevel = 0;
        this.intervalStart = 0;
        this.intervalEnd = 0;
        this.page = 0;
        this.pageSize = 0;
        this.searchTerm = '';
        this.servers = [];
    }
}
class MetricsParameters {
    constructor() {
        this.intervalStart = 0;
        this.intervalEnd = 0;
    }
}
class SearchResult {
    constructor() {
        this.entryCount = 0;
        this.data = [];
        this.pageSize = 0;
        this.page = 0;
    }
}
