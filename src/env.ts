export const env = {
    host: "0.0.0.0",
    ssl_cert: "./server.crt",
    ssl_key: "./server.key",
    frontend_port: 443,
    logger_port: 2053,
    log_interval: 5,
    maximum_log_age: 10080,
    cleanup_interval: 15,
    redis_path: "/var/run/redis/redis-server.sock",
    redis_host: "127.0.0.1",
    redis_port: 6379,
    redis_auth: undefined,
    redis_tls: null,
    frontend_auth: "frontend:password",
    logger_auth: "logger:password"
}