"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var HasApp_1 = __importDefault(require("./HasApp"));
var Redis_1 = __importDefault(require("./Redis"));
var env_1 = require("../env");
var uWebSockets_js_1 = require("uWebSockets.js");
var LoggerWebservice = /** @class */ (function (_super) {
    __extends(LoggerWebservice, _super);
    function LoggerWebservice() {
        var _this = _super.call(this) || this;
        _this.redis = Redis_1.default();
        _this.startListening();
        return _this;
    }
    LoggerWebservice.prototype.webservice = function () {
        var decoder = new TextDecoder("utf-8");
        this.app.ws('/logws', {
            idleTimeout: 30,
            maxBackpressure: 1024,
            maxPayloadLength: 512,
            compression: uWebSockets_js_1.DISABLED,
            /*upgrade: (res, req, context) => {
                try {
                    if (!(req.getHeader('authorization') === env.logger_auth)) {
                        return res.writeStatus('401').end();
                    }
                }
                catch {
                    return res.writeStatus('401').end();
                }

                res.upgrade({ uid: req.getHeader('id') },
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context);
            },*/
            message: function (ws, message) {
                console.log(decoder.decode(message));
                //this.log(decoder.decode(message));
            }
        });
    };
    LoggerWebservice.prototype.log = function (data) {
        var time = Date.now();
        //Rounding to the specified interval.
        //Changing the interval does not have an effect on user experience, this is only for storage organization
        var logKey = 'log:' + (time - (time % (env_1.env.log_interval * 60000)));
        this.redis.sadd(logKey, data);
    };
    return LoggerWebservice;
}(HasApp_1.default));
exports.default = LoggerWebservice;
