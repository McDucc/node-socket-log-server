"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("postgres"));
const env_1 = require("./env");
function SetupPostgresPool() {
    return new postgres_1.default({
        user: env_1.env.postgres_user,
        host: env_1.env.postgres_host,
        port: env_1.env.postgres_port,
        database: env_1.env.postgres_database,
        schema: env_1.env.postgres_schema,
        socket: env_1.env.postgres_socket,
        password: env_1.env.postgres_password,
        threads: env_1.env.postgres_threads,
        queueSize: 32768,
        escapeChar: '\\'
    });
}
exports.default = SetupPostgresPool;
