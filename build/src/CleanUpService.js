"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Redis_1 = __importDefault(require("./Redis"));
var env_1 = require("../env");
var CleanUpService = /** @class */ (function () {
    function CleanUpService() {
        //Clean up logs in the configured interval
        setInterval(this.cleanup, 1000 * 60 * env_1.env.cleanup_interval);
    }
    CleanUpService.prototype.cleanup = function () {
        var redis = Redis_1.default();
        redis.keys('log:*', function (err, reply) {
            if (!err) {
                reply.forEach(function (element) {
                    var time = Number.parseInt(element.substring(4, 13));
                    if (time < Date.now() - env_1.env.maximum_log_age * 60000) {
                        redis.del(element);
                    }
                });
            }
            else {
                console.log(err);
            }
        });
    };
    return CleanUpService;
}());
exports.default = CleanUpService;
