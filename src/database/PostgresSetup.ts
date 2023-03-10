import Postgres from "postgres";
import { Environment } from "../services/Environment";

export default async function SetupPostgresPool(threads: number) {
    let pool = new Postgres({
        user: Environment.postgres.user,
        host: Environment.postgres.host,
        port: Environment.postgres.port,
        database: Environment.postgres.database,
        schema: Environment.postgres.schema,
        socket: Environment.postgres.socket,
        password: Environment.postgres.password,
        threads,
        queueSize: 65536,
        escapeChar: '\\'
    });

    await pool.initialize();

    return pool;
}