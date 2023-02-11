"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
async function TableSetup(pool) {
    await new Promise((res) => {
        setTimeout(() => {
            res(true);
        }, 5000);
    });
    let table_columns = await pool.query('table-info', `SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1
        AND table_name = $2;`, [env_1.env.postgres_schema, env_1.env.postgres_table]);
    if (table_columns.length === 0) {
        let client = await pool.connect();
        try {
            await client.queryString(`
            CREATE TABLE ${env_1.env.postgres_table} (
                id BIGSERIAL PRIMARY KEY,
                level SMALLINT,
                time BIGINT,
                server VARCHAR(16),
                channel VARCHAR(24),
                message VARCHAR(256),
                data VARCHAR(4096),
                search TSVECTOR);`);
            await client.queryString(`
            CREATE FUNCTION search_tsvector_update AS $$
            BEGIN
                new.search := 
                    setweight(to_tsvector('${env_1.env.postgres_language}', new.data), 'A')
                    ||setweight(to_tsvector('${env_1.env.postgres_language}', new.message), 'B');
                return new;
            END
            $$ LANGUAGE plpgsql;`);
            await client.queryString(`
            CREATE TRIGGER search_tsvector_trigger
            BEFORE INSERT OR UPDATE
            ON ${env_1.env.postgres_table} FOR EACH ROW
            EXECUTE PROCEDURE search_tsvector_update();`);
            await client.queryString(`
            CREATE INDEX level_index ON ${env_1.env.postgres_table} USING BTREE (level);`);
            await client.queryString(`
            CREATE INDEX time_index ON ${env_1.env.postgres_table} USING BTREE (time);`);
            await client.queryString(`
            CREATE INDEX channel_index ON ${env_1.env.postgres_table} USING HASH (channel);`);
            await client.queryString(`
            CREATE INDEX server_index ON ${env_1.env.postgres_table} USING HASH (server);`);
            await client.queryString(`
            CREATE INDEX search_index ON ${env_1.env.postgres_table} USING GIN (search);`);
        }
        catch (_a) {
            client.release();
        }
        return true;
    }
    let required_columns = ["id", "level", "time", "channel", "message", "data"];
    for (let column of table_columns) {
        if (required_columns.indexOf(column.column_name) === -1)
            return false;
    }
    return true;
}
exports.default = TableSetup;
