"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Redis_1 = __importDefault(require("./Redis"));
const env_1 = require("./env");
class CleanUpService {
    constructor() {
        setInterval(this.cleanup, 1000 * 60 * env_1.env.cleanup_interval);
    }
    cleanup() {
        let redis = Redis_1.default();
        redis.keys('log:*', (err, reply) => {
            if (!err) {
                reply.forEach(element => {
                    let time = Number.parseInt(element.substring(4, 13));
                    if (time < Date.now() - env_1.env.maximum_log_age * 60000) {
                        redis.del(element);
                    }
                });
            }
            else {
                console.log('Error while cleaning up.');
                console.log(err);
            }
        });
    }
}
exports.default = CleanUpService;
