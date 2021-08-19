import { RedisClient } from "redis";

export default function getRedisInstance() : RedisClient{
    return new RedisClient({
        path: env.redis_path,
        host: env.redis_host,
        port: env.redis_port,
        tls: env.redis_tls,
        auth_pass: env.redis_auth
    });
}