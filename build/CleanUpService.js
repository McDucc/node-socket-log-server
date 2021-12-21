"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Redis_1 = __importDefault(require("./Redis"));
const env_1 = require("./env");
class CleanUpService {
    constructor() {
        setInterval(this.cleanup, 60000 * env_1.env.cleanup_interval);
        this.cleanup();
    }
    cleanup() {
        let maximumLogAgeMillis = env_1.env.maximum_log_age * 60000;
        let deletedKeys = 0;
        console.log(`[${new Date().toISOString()}] Running cleanup service.`);
        CleanUpService.redis.keys('log:*', (err, reply) => {
            if (!err) {
                reply.forEach(element => {
                    let time = Number.parseInt(element.substring(4));
                    if (time < Date.now() - maximumLogAgeMillis) {
                        CleanUpService.redis.del(element);
                        deletedKeys++;
                    }
                });
                console.log(`[${new Date().toISOString()}] Deleted ${deletedKeys} out of ${reply.length} log keys.`);
            }
            else {
                console.log('Error while cleaning up.');
                console.log(err);
            }
        });
    }
}
exports.default = CleanUpService;
CleanUpService.redis = (0, Redis_1.default)();
