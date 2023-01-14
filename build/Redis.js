"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const env_1 = require("./env");
function getRedisInstance() {
    let client = new redis_1.RedisClient({
        db: env_1.env.redis_db,
        path: env_1.env.redis_path,
        host: env_1.env.redis_host,
        port: env_1.env.redis_port,
        tls: env_1.env.redis_tls,
        auth_pass: env_1.env.redis_auth
    });
    client.on('error', (err) => console.log('Redis Client Error', err));
    return client;
}
exports.default = getRedisInstance;
