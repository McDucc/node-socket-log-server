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
let unit16s = [];
for (let i = 0; i < 5; i++) {
    unit16s.push(new Uint16Array(i * 32));
}
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
            maxBackpressure: 1024 * 1024,
            maxPayloadLength: 1024 * 1024,
            compression: uWebSockets_js_1.DISABLED,
            open: (ws) => {
            },
            upgrade: (res, req, context) => {
                console.log(`[${new Date().toISOString()}] Auth ok: `);
                res.upgrade({ uid: (0, uuid_1.v4)(), name: "k" }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
            },
            message(_ws, message) {
                letsgo(_ws);
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
function letsgo(ws) {
    for (let i = 0; i < 300; i++) {
        setTimeout(() => { name(Math.random() * 22, ws); }, 50);
    }
}
function name(num, ws) {
    let arr = unit16s[Math.floor(5 * Math.random())];
    for (let i = 0; i < arr.length; i++) {
        arr[i] = num;
    }
    ws.send(arr.buffer, true);
    setTimeout(() => { name(Math.random() * 60000, ws); }, 0);
}
