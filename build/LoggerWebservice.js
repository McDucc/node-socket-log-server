"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HasApp_1 = __importDefault(require("./HasApp"));
const Redis_1 = __importDefault(require("./Redis"));
const env_1 = require("./env");
const uWebSockets_js_1 = require("uWebSockets.js");
const url_1 = require("url");
class LoggerWebservice extends HasApp_1.default {
    constructor() {
        super(env_1.env.logger_port);
        this.redisClients = [];
        for (let i = 0; i < 10; i++)
            this.redisClients[i] = (0, Redis_1.default)();
        this.app.ws('/log', {
            idleTimeout: 32,
            maxBackpressure: 256 * 1024,
            maxPayloadLength: 2 * 1024,
            compression: uWebSockets_js_1.DEDICATED_COMPRESSOR_16KB,
            upgrade: (res, req, context) => {
                let parameters = new url_1.URLSearchParams(req.getQuery());
                if (!parameters.get('name') || !parameters.get('auth') || parameters.get('auth') != env_1.env.logger_password)
                    return res.end('Unauthorized or name / auth missing.');
                let name = parameters.get('name');
                let address = Buffer.from(res.getProxiedRemoteAddressAsText()).toString();
                console.log(`[${new Date().toISOString()}] Accepted connection with ${name}: ${address}`);
                res.upgrade({ name }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
            },
            message: (_ws, message) => {
                this.log(Buffer.from(message).toString());
            },
            drain: (_ws) => { },
            close: (ws, code, _message) => {
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${ws.uuid}, name: ${ws.name}, code: ${code}, message: ${Buffer.from(_message).toString()}`);
            }
        });
        this.startListening();
    }
    log(data) {
        let time = Date.now();
        let logKey = 'log:' + (time - (time % (env_1.env.log_interval * 60000)));
        this.redisClients[time % 10].sadd(logKey, data);
    }
}
exports.default = LoggerWebservice;
