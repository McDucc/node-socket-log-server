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
const HasApp_1 = __importDefault(require("./HasApp"));
const Redis_1 = __importDefault(require("./Redis"));
const env_1 = require("./env");
const uWebSockets_js_1 = require("uWebSockets.js");
const util = __importStar(require("util"));
class LoggerWebservice extends HasApp_1.default {
    constructor() {
        super();
        this.redis = Redis_1.default();
        this.webservice();
        this.startListening();
    }
    webservice() {
        let self = this;
        let decoder = new util.TextDecoder("utf-8");
        this.app.ws('/x', {
            idleTimeout: 32,
            maxBackpressure: 4096,
            maxPayloadLength: 8 * 1024,
            compression: uWebSockets_js_1.DISABLED,
            open(ws) {
            },
            upgrade: (res, req, context) => {
                res.upgrade({ uid: req.getHeader('id') }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
            },
            message(ws, message) {
                let time = Date.now();
                for (let a = 0; a < 300; a++) {
                    let w = new Array(15000);
                    for (let i = 0; i < 15000; i++) {
                        w[i] = i * i + i;
                    }
                    ws.send(w.toString());
                }
                console.log(Date.now() - time);
            },
            drain: (ws) => {
                console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
            },
            close: (ws, code, message) => {
                console.log('WebSocket closed');
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
