import HasApp from './HasApp';
import { RedisClient } from 'redis';
import getRedisInstance from './Redis';
import { env } from './env';
import { DEDICATED_COMPRESSOR_16KB } from 'uWebSockets.js';
import { v4 as uuidv4 } from 'uuid';
import { URLSearchParams } from 'url';

export default class LoggerWebservice extends HasApp {

    redisClients: RedisClient[] = [];

    constructor() {
        super(env.logger_port);
        //Multiple redis clients speed up performance in most cases, especially if your redis instance has I/O threads
        for (let i = 0; i < 10; i++) this.redisClients[i] = getRedisInstance();

        this.app.ws('/log', {
            idleTimeout: 32,
            maxBackpressure: 256 * 1024,
            maxPayloadLength: 2 * 1024,
            compression: DEDICATED_COMPRESSOR_16KB,

            upgrade: (res, req, context) => {

                let parameters = new URLSearchParams(req.getQuery());

                if (!parameters.get('name') || !parameters.get('auth') || parameters.get('auth') != env.logger_password)
                return res.end('Unauthorized or name / auth missing.');

                let uuid = uuidv4();
                let name = parameters.get('name');
                let address = Buffer.from(res.getProxiedRemoteAddressAsText()).toString();
                console.log(`[${new Date().toISOString()}] Accepted connection with ${name}: ${address}`);
                res.upgrade({ uuid, name },
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context);
            },

            message: (_ws, message) => {
                this.log(Buffer.from(message).toString());
            },

            drain: (_ws) => { },

            close: (ws, code, _message) => {
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${ws.uuid}, name: ${ws.name}, code: ${code}, message: ${Buffer.from(_message).toString()}`);
            }
        });

        this.startListening();
    }

    log(data: string) {
        let time = Date.now();
        //Rounding to the specified interval.
        //Changing the interval does not have a direct effect on user experience, this is only for storage organization
        let logKey = 'log:' + (time - (time % (env.log_interval * 60000)));
        this.redisClients[time % 10].sadd(logKey, data);
    }
}
