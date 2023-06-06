import HasApp from '../http/HasApp';
import { Environment } from './Environment';
import { DEDICATED_COMPRESSOR_16KB } from 'uWebSockets.js';
import { URLSearchParams } from 'url';
import Postgres from "pg-pool-minimal";
import SetupPostgresPool from '../database/PostgresSetup';
import TableSetup from '../database/TableSetup';
import SharedService from './SharedService';


export default class LogService extends HasApp {

    writeLogQueryName = 'write-log';
    writeLogQueryText = `INSERT INTO ${Environment.postgres.logs_table} (level,time,channel,message,server,data) VALUES ($1,$2,$3,$4,$5,$6)`

    writeMetricsQueryName = 'write-metric';
    writeMetricsQueryText = `INSERT INTO ${Environment.postgres.metrics_table} 
           (time,server,cpu,mem_used,io_read,io_write,disk_used,net_in,net_out)
    VALUES ($1  ,$2    ,$3 ,$4      ,$5     ,$6      ,$7       ,$8    ,$9)`
    constructor(private postgresPool: Postgres) {

        super(Environment.logger_port);

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

                SharedService.log(`Accepted connection with ${name} - Address: ${address}`);
                res.upgrade({ name, address },
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context);
            },

            message: (ws, message) => {
                let messageBuffer = Buffer.from(message);

                if (messageBuffer[0] === 0) {
                    this.writeMetrics(ws.name,
                        messageBuffer.readFloatBE(1),
                        messageBuffer.readFloatBE(5),
                        messageBuffer.readFloatBE(9),
                        messageBuffer.readFloatBE(13),
                        messageBuffer.readFloatBE(17),
                        messageBuffer.readFloatBE(21),
                        messageBuffer.readFloatBE(25));
                } else {
                    let messageString = messageBuffer.toString();
                    let channelIndex = messageString.indexOf("'");
                    let channel = messageString.substring(1, channelIndex++);
                    let messageIndex = messageString.indexOf("'", channelIndex);
                    let message: string;
                    let data: string;
                    if (messageIndex === -1) {
                        message = messageString.substring(channelIndex);
                        data = '';
                    } else {
                        message = messageString.substring(channelIndex, messageIndex);
                        data = messageString.substring(messageIndex + 1);
                    }

                    this.writeLog(messageString.charCodeAt(0), channel, message, ws.name, data);
                }
            },

            drain: (_ws) => { },

            close: (ws, code, _message) => {
                SharedService.log(`WebSocket closed: ${ws.address}, name: ${ws.name}, code: ${code}, message: ${Buffer.from(_message).toString()}`);
            }
        });

    }

    public async initialize() {
        this.postgresPool = await SetupPostgresPool(Environment.postgres.threads.log);
        await TableSetup(this.postgresPool);
        this.startListening();
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