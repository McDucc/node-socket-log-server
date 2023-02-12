"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HasApp_1 = __importDefault(require("./HasApp"));
const env_1 = require("./env");
const uWebSockets_js_1 = require("uWebSockets.js");
const url_1 = require("url");
const PostgresSetup_1 = __importDefault(require("./PostgresSetup"));
const TablesSetup_1 = __importDefault(require("./TablesSetup"));
class LoggerWebservice extends HasApp_1.default {
    constructor() {
        super(env_1.env.logger_port);
        this.writeQueryName = 'write-log';
        this.writeQueryText = 'INSERT INTO logs (level,time,channel,message,server,data) VALUES ($1,$2,$3,$4,$5,$6)';
        this.postgresPool = (0, PostgresSetup_1.default)();
        (0, TablesSetup_1.default)(this.postgresPool);
        this.app.ws('/log', {
            idleTimeout: 32,
            maxBackpressure: 2 * 1024,
            maxPayloadLength: 4 * 1024,
            compression: uWebSockets_js_1.DEDICATED_COMPRESSOR_16KB,
            upgrade: (res, req, context) => {
                let parameters = new url_1.URLSearchParams(req.getQuery());
                if (!parameters.get('name') || !parameters.get('auth') || parameters.get('auth') != env_1.env.logger_password)
                    return res.end('Unauthorized or name / auth missing.');
                let name = parameters.get('name');
                let address = Buffer.from(res.getProxiedRemoteAddressAsText()).toString();
                console.log(`[${new Date().toISOString()}] Accepted connection with ${name}: ${address}`);
                res.upgrade({ name, address }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
            },
            message: (ws, message) => {
                try {
                    this.log(JSON.parse(Buffer.from(message).toString()), ws.name);
                }
                catch (_a) { }
            },
            drain: (_ws) => { },
            close: (ws, code, _message) => {
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${ws.address}, name: ${ws.name}, code: ${code}, message: ${Buffer.from(_message).toString()}`);
            }
        });
        this.startListening();
    }
    log(message, server) {
        if (message.level === undefined && message.channel === undefined && message.message === undefined) {
            this.databaseWrite(0, 'metrics', '', server, message.data);
        }
        else {
            this.databaseWrite(message.level, message.channel, message.message, server, message.data);
        }
    }
    databaseWrite(level, channel, message, server, data) {
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }
        this.postgresPool.query(this.writeQueryName, this.writeQueryText, [level, Date.now(), channel, message, server, data]);
    }
}
exports.default = LoggerWebservice;
class IncomingData {
    constructor() {
        this.level = 0;
        this.channel = '';
        this.message = '';
        this.data = '';
    }
}
