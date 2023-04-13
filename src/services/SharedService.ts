import Postgres from "pg-pool-minimal";

export default class SharedService {

    static async getServerArray(pool: Postgres): Promise<string[]> {
        let query1 = await pool.query("get-servers", "SELECT DISTINCT server FROM logs ORDER BY server DESC", []);
        let query2 = await pool.query("get-servers-metrics", "SELECT DISTINCT server FROM metrics ORDER BY server DESC", []);
        let query3 = await pool.query("get-servers-trigger-messages", "SELECT DISTINCT server FROM trigger_messages ORDER BY server DESC", []);

        let data: string[] = query1.map(entry => {
            return entry.server;
        });

        query2.concat(query3).forEach(element => {
            if (!data.includes(element.server)) data.push(element.server);
        })

        return data;
    }

    static log(...params: any[]) {
        console.log(`[${new Date().toISOString()}] `, ...params);
    }
}