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
const Redis_1 = __importDefault(require("./Redis"));
const env_1 = require("./env");
const fs = __importStar(require("fs"));
class PersistenceService {
    constructor() {
        setInterval(this.cleanup, 60000 * env_1.env.cleanup_interval);
        this.cleanup();
    }
    cleanup() {
        let maximumLogAgeMillis = env_1.env.maximum_log_age * 60000;
        console.log(`[${new Date().toISOString()}] Running persistence service.`);
        PersistenceService.redis.keys('log:*', (err, reply) => {
            if (!err) {
                reply.forEach(element => {
                    var _a;
                    let time = (_a = Number.parseInt(element.substring(4))) !== null && _a !== void 0 ? _a : 0;
                    if (time < Date.now() - maximumLogAgeMillis) {
                        PersistenceService.redis.SMEMBERS(element, (data, err) => {
                            if (err)
                                return;
                            fs.writeFile(element, JSON.stringify(data), (err) => {
                                if (err) {
                                    console.log(`[${new Date().toISOString()}] Error persisting ${element} on disk.`, err);
                                }
                                else {
                                    console.log(`[${new Date().toISOString()}] Wrote key ${element} to disk.`);
                                    PersistenceService.redis.del(element);
                                }
                            });
                        });
                    }
                });
            }
            else {
                console.log(`[${new Date().toISOString()}] Error while cleaning up.`, err);
            }
        });
    }
}
exports.default = PersistenceService;
PersistenceService.redis = (0, Redis_1.default)();
