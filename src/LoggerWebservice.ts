import HasApp from './HasApp';
import { env } from './env';
import { DEDICATED_COMPRESSOR_16KB } from 'uWebSockets.js';
import { URLSearchParams } from 'url';
import Postgres from 'postgres';
import SetupPostgresPool from './PostgresSetup';
import SetupTables from './TablesSetup';


export default class LoggerWebservice extends HasApp {

    postgresPool: Postgres;

    writeQueryName = 'write-log';
    writeQueryText = 'INSERT INTO logs (level,time,channel,message,server,data) VALUES ($1,$2,$3,$4,$5,$6)'
    constructor() {

        super(env.logger_port);

        this.postgresPool = SetupPostgresPool();

        SetupTables(this.postgresPool);

        this.app.ws('/log', {
            idleTimeout: 32,
            maxBackpressure: 2 * 1024,
            maxPayloadLength: 4 * 1024,
            compression: DEDICATED_COMPRESSOR_16KB,

            upgrade: (res, req, context) => {

                let parameters = new URLSearchParams(req.getQuery());

                console.log(parameters);

                if (!parameters.get('name') || !parameters.get('auth') || parameters.get('auth') != env.logger_password)
                    return res.end('Unauthorized or name / auth missing.');

                let name = parameters.get('name');
                let address = Buffer.from(res.getProxiedRemoteAddressAsText()).toString();

                console.log(`[${new Date().toISOString()}] Accepted connection with ${name}: ${address}`);
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
        if (message.level === undefined && message.channel === undefined && message.message === undefined) {
            this.databaseWrite(0, 'metrics', '', server, message.data);
        } else {
            this.databaseWrite(message.level, message.channel, message.message, server, message.data);
        }
    }

    databaseWrite(level: number, channel: string, message: string, server: string, data: string) {
        this.postgresPool.query(this.writeQueryName, this.writeQueryText, [level, Date.now(), channel, message, server, data])
    }
}

class IncomingData {
    level: number = 0;
    channel: string = '';
    message: string = '';
    data: string = '';
}
