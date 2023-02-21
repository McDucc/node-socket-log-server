import Postgres from "postgres";
import { env } from "./env";

export default function SetupPostgresPool() {
    return new Postgres({
        user: env.postgres.user,
        host: env.postgres.host,
        port: env.postgres.port,
        database: env.postgres.database,
        schema: env.postgres.schema,
        socket: env.postgres.socket,
        password: env.postgres.password,
        threads: env.postgres.threads,
        queueSize: 65536,
        escapeChar: '\\'
    });
}