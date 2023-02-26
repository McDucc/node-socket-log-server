import HasApp from '../http/HasApp';
import { Environment } from './Environment';
import { DEDICATED_COMPRESSOR_16KB } from 'uWebSockets.js';
import { URLSearchParams } from 'url';
import SetupPostgresPool from '../database/PostgresSetup';
import TableSetup from '../database/TableSetup';
export default class LoggerWebservice extends HasApp {
    constructor() {
        super(Environment.logger_port);
        this.writeLogQueryName = 'write-log';
        this.writeLogQueryText = `INSERT INTO ${Environment.postgres.logs_table} (level,time,channel,message,server,data) VALUES ($1,$2,$3,$4,$5,$6)`;
        this.writeMetricsQueryName = 'write-metric';
        this.writeMetricsQueryText = `INSERT INTO ${Environment.postgres.metrics_table} 
           (time,server,cpu,mem_used,io_read,io_write,disk_used,net_in,net_out)
    VALUES ($1  ,$2    ,$3 ,$4      ,$5     ,$6      ,$7       ,$8    ,$9)`;
        this.postgresPool = SetupPostgresPool();
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
                res.upgrade({ name, address }, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
            },
            message: (ws, message) => {
                try {
                    this.log(JSON.parse(Buffer.from(message).toString()), ws.name);
                }
                catch { }
            },
            drain: (_ws) => { },
            close: (ws, code, _message) => {
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${ws.address}, name: ${ws.name}, code: ${code}, message: ${Buffer.from(_message).toString()}`);
            }
        });
        this.startListening();
    }
    log(message, server) {
        if (!message.channel) {
            this.writeMetrics(server, message.cpu, message.mem_used, message.io_read, message.io_write, message.disk_used, message.net_in, message.net_out);
        }
        else {
            this.writeLog(message.level, message.channel, message.message, server, message.data);
        }
    }
    writeLog(level, channel, message, server, data) {
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }
        this.postgresPool.query(this.writeLogQueryName, this.writeLogQueryText, [level, Date.now(), channel, message, server, data]);
    }
    writeMetrics(server, cpu, mem_used, io_read, io_write, disk_used, net_in, net_out) {
        let array = [Date.now(), server, cpu, mem_used, io_read, io_write, disk_used, net_in, net_out];
        this.postgresPool.query(this.writeMetricsQueryName, this.writeMetricsQueryText, array);
    }
}
class IncomingData {
    constructor() {
        this.level = 0;
        this.channel = '';
        this.message = '';
        this.data = '';
        this.cpu = 0;
        this.mem_used = 0;
        this.io_read = 0;
        this.io_write = 0;
        this.disk_used = 0;
        this.net_in = 0;
        this.net_out = 0;
    }
}
