"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.env = {
    host: "127.0.0.1",
    ssl: true,
    ssl_cert: "./server.crt",
    ssl_key: "./server.key",
    ssl_port: 443,
    port: 8080,
    log_interval: 5,
    maximum_log_age: 10080,
    cleanup_interval: 15,
    redis_path: undefined,
    redis_host: "127.0.0.1",
    redis_port: 6379,
    redis_auth: undefined,
    redis_tls: null,
    frontend_auth: "frontend:password",
    logger_auth: "logger:password"
};
