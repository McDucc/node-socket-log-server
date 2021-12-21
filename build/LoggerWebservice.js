"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HasApp_1 = __importDefault(require("./HasApp"));
const Redis_1 = __importDefault(require("./Redis"));
const env_1 = require("./env");
const uWebSockets_js_1 = require("uWebSockets.js");
const globalFunctions_1 = __importDefault(require("./globalFunctions"));
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
            idleTimeout: 32,
            maxBackpressure: 32 * 1024,
            maxPayloadLength: 8 * 1024,
            compression: uWebSockets_js_1.DISABLED,
            open: (ws) => {
                this.redis.incr('ws-connections');
                console.log(`[${new Date().toISOString()}] WebSocket opened: ${(0, globalFunctions_1.default)(ws.getRemoteAddressAsText())}`);
            },
            upgrade: (res, req, context) => {
                if (req.getQuery() !== "auth=" + env_1.env.logger_password) {
                    res.writeStatus("401 Unauthorized");
                    res.end('Unauthorized');
                    console.log(`[${new Date().toISOString()}] Auth failed: ${(0, globalFunctions_1.default)(res.getRemoteAddressAsText())}`);
                }
                else {
                    res.upgrade({ uid: req.getHeader('id') }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
                }
            },
            message(_ws, message) {
                self.log((0, globalFunctions_1.default)(message));
            },
            drain: (_ws) => { },
            close: (_ws, code, _message) => {
                this.redis.decr('ws-connections');
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${code}`);
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
