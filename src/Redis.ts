import { RedisClient } from "redis";
import { env } from "./env";

export default function getRedisInstance(): RedisClient {
    let client = new RedisClient({
        db: env.redis_db,
        path: env.redis_path,
        host: env.redis_host,
        port: env.redis_port,
        tls: env.redis_tls,
        auth_pass: env.redis_auth
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    return client;
}