import HasApp from '../http/HasApp';
import { Environment } from './Environment';
import { DEDICATED_COMPRESSOR_16KB } from 'uWebSockets.js';
import { URLSearchParams } from 'url';
import Postgres from 'postgres';
import SetupPostgresPool from '../database/PostgresSetup';
import TableSetup from '../database/TableSetup';


export default class LogService extends HasApp {

    postgresPool: Postgres;

    writeLogQueryName = 'write-log';
    writeLogQueryText = `INSERT INTO ${Environment.postgres.logs_table} (level,time,channel,message,server,data) VALUES ($1,$2,$3,$4,$5,$6)`

    writeMetricsQueryName = 'write-metric';
    writeMetricsQueryText = `INSERT INTO ${Environment.postgres.metrics_table} 
           (time,server,cpu,mem_used,io_read,io_write,disk_used,net_in,net_out)
    VALUES ($1  ,$2    ,$3 ,$4      ,$5     ,$6      ,$7       ,$8    ,$9)`
    constructor() {

        super(Environment.logger_port);

        this.postgresPool = SetupPostgresPool(Environment.postgres.threads.log);

        TableSetup(this.postgresPool);

        this.app.ws('/log', {
            idleTimeout: 32,
            maxBackpressure: 2 * 1024,
            maxPayloadLength: 4 * 1024,
            compression: DEDICATED_COMPRESSOR_16KB,

            upgrade: (res, req, context) => {

                let parameters = new URLSearchParams(req.getQuery());

                if (!parameters.get('name') || !parameters.get('auth') || parameters.get('auth') != Environment.logger_password)
                    return res.end('Unauthorized or name / auth missing.');

                let name = parameters.get('name');
                let address = Buffer.from(res.getRemoteAddressAsText()).toString();

                console.log(`[${new Date().toISOString()}] Accepted connection with ${name} - Address: ${address}`);
                res.upgrade({ name, address },
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context);
            },

            message: (ws, message) => {
                try {
                    this.log(JSON.parse(Buffer.from(message).toString()), ws.name);
                } catch { }
            },

            drain: (_ws) => { },

            close: (ws, code, _message) => {
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${ws.address}, name: ${ws.name}, code: ${code}, message: ${Buffer.from(_message).toString()}`);
            }
        });

        this.startListening();
    }

    log(message: IncomingData, server: string) {
        if (!message.channel) {
            this.writeMetrics(server, message.cpu, message.mem_used, message.io_read,
                message.io_write, message.disk_used, message.net_in, message.net_out);
        } else {
            this.writeLog(message.level, message.channel, message.message, server, message.data);
        }
    }

    writeLog(level: number, channel: string, message: string, server: string, data: string) {
        if (typeof data !== 'string') { data = JSON.stringify(data); }
        this.postgresPool.query(this.writeLogQueryName, this.writeLogQueryText, [level, Date.now(), channel, message, server, data])
    }

    writeMetrics(server: string, cpu: number, mem_used: number, io_read: number, io_write: number,
        disk_used: number, net_in: number, net_out: number) {
        let array = [Date.now(), server, cpu, mem_used, io_read, io_write, disk_used, net_in, net_out];
        this.postgresPool.query(this.writeMetricsQueryName, this.writeMetricsQueryText, array)
    }
}

class IncomingData {
    level: number = 0;
    channel: string = '';
    message: string = '';
    data: string = '';
    cpu: number = 0;
    mem_used: number = 0;
    io_read: number = 0;
    io_write: number = 0;
    disk_used: number = 0;
    net_in: number = 0;
    net_out: number = 0;
}
