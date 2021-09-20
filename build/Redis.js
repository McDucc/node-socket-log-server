"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const env_1 = require("./env");
function getRedisInstance() {
    return new redis_1.RedisClient({
        path: env_1.env.redis_path,
        host: env_1.env.redis_host,
        port: env_1.env.redis_port,
        tls: env_1.env.redis_tls,
        auth_pass: env_1.env.redis_auth
    });
}
exports.default = getRedisInstance;
