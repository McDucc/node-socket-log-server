import Postgres from "postgres";
import { Environment } from "../services/Environment";
export default function SetupPostgresPool() {
    return new Postgres({
        user: Environment.postgres.user,
        host: Environment.postgres.host,
        port: Environment.postgres.port,
        database: Environment.postgres.database,
        schema: Environment.postgres.schema,
        socket: Environment.postgres.socket,
        password: Environment.postgres.password,
        threads: Environment.postgres.threads,
        queueSize: 65536,
        escapeChar: '\\'
    });
}
