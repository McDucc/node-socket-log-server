"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.env = {
    host: "0.0.0.0",
    ssl: false,
    ssl_cert: "server.crt",
    ssl_key: "server.key",
    log_interval: 3,
    maximum_log_age: 14400,
    cleanup_interval: 45,
    redis_path: undefined,
    redis_host: "127.0.0.1",
    redis_port: 6379,
    redis_auth: undefined,
    redis_tls: undefined,
    redis_db: 0,
    frontend_port: 443,
    frontend_user: "user",
    frontend_password: "password",
    logger_port: 8080,
    logger_user: "user",
    logger_password: "password",
    server_health: {
        servers: [],
        keep_registered: true,
        error_message_threshold: 5,
        error_message_threshold_time: 5,
        ram_usage_threshold: 0.8,
        ram_usage_threshold_time: 10,
        cpu_usage_total_threshold: 0.9,
        cpu_usage_single_threshold: 0.85,
        cpu_usage_threshold_time: 5,
        memory_usage_threshold: 0.8,
        memory_usage_threshold_time: 15,
        timeout: 2500,
    }
};
