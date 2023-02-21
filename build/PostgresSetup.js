"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("postgres"));
const env_1 = require("./env");
function SetupPostgresPool() {
    return new postgres_1.default({
        user: env_1.env.postgres.user,
        host: env_1.env.postgres.host,
        port: env_1.env.postgres.port,
        database: env_1.env.postgres.database,
        schema: env_1.env.postgres.schema,
        socket: env_1.env.postgres.socket,
        password: env_1.env.postgres.password,
        threads: env_1.env.postgres.threads,
        queueSize: 65536,
        escapeChar: '\\'
    });
}
exports.default = SetupPostgresPool;
