"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HasApp_1 = __importDefault(require("./HasApp"));
const Redis_1 = __importDefault(require("./Redis"));
const env_1 = require("./env");
const uWebSockets_js_1 = require("uWebSockets.js");
const uuid_1 = require("uuid");
const url_1 = require("url");
const globalFunctions_1 = require("./globalFunctions");
class LoggerWebservice extends HasApp_1.default {
    constructor() {
        super(env_1.env.logger_port);
        this.redis = (0, Redis_1.default)();
        this.webservice();
        this.startListening();
    }
    webservice() {
        let self = this;
        this.app.ws('/log', {
            idleTimeout: 240,
            maxBackpressure: 256 * 1024,
            maxPayloadLength: 8 * 1024,
            compression: uWebSockets_js_1.DISABLED,
            open: (ws) => {
                this.redis.sadd('servers', `${ws.name} (${globalFunctions_1.ArrayBufferDecoder.decode(ws.getRemoteAddressAsText())})`);
                console.log(`[${new Date().toISOString()}] WebSocket opened: ${ws.uid}, name: ${ws.name}, address: ${globalFunctions_1.ArrayBufferDecoder.decode(ws.getRemoteAddressAsText())}`);
            },
            upgrade: (res, req, context) => {
                let query = new url_1.URLSearchParams(req.getQuery());
                res.upgrade({ uid: (0, uuid_1.v4)(), name: "sus" }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
            },
            message(_ws, message) {
                _ws.send(Buffer.from(new Uint32Array(128)), true);
            },
            drain: (_ws) => { },
            close: (ws, code, _message) => {
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${ws.uid}, name: ${ws.name}, code: ${code}`);
            }
        });
    }
    log(data) {
        let time = Date.now();
        let logKey = 'log:' + (time - (time % (env_1.env.log_interval * 60000)));
        this.redis.sadd(logKey, data);
    }
}
exports.default = LoggerWebservice;
