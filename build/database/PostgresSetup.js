"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("postgres"));
const Environment_1 = require("../services/Environment");
function SetupPostgresPool() {
    return new postgres_1.default({
        user: Environment_1.Environment.postgres.user,
        host: Environment_1.Environment.postgres.host,
        port: Environment_1.Environment.postgres.port,
        database: Environment_1.Environment.postgres.database,
        schema: Environment_1.Environment.postgres.schema,
        socket: Environment_1.Environment.postgres.socket,
        password: Environment_1.Environment.postgres.password,
        threads: Environment_1.Environment.postgres.threads,
        queueSize: 65536,
        escapeChar: '\\'
    });
}
exports.default = SetupPostgresPool;
