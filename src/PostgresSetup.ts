import Postgres from "postgres";
import { env } from "./env";

export default function SetupPostgresPool() {
    return new Postgres({
        user: env.postgres_user,
        host: env.postgres_host,
        port: env.postgres_port,
        database: env.postgres_database,
        schema: env.postgres_schema,
        socket: env.postgres_socket,
        password: env.postgres_password,
        threads: env.postgres_threads,
        queueSize: 32768,
        escapeChar: '\\'
    });
}