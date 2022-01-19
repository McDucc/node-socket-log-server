import HasApp from './HasApp';
import { RedisClient } from 'redis';
import getRedisInstance from './Redis';
import { env } from './env';
import { DISABLED } from 'uWebSockets.js';
import { v4 as uuidv4 } from 'uuid';
import { URLSearchParams } from 'url';
import { ArrayBufferDecoder } from './globalFunctions';


export default class LoggerWebservice extends HasApp {

    redis: RedisClient;

    constructor() {
        super(env.logger_port);
        this.redis = getRedisInstance();
        this.webservice();
        this.startListening();
    }

    webservice() {
        let self = this;
        this.app.ws('/log', {
            idleTimeout: 240,
            maxBackpressure: 256 * 1024,
            maxPayloadLength: 8 * 1024,
            compression: DISABLED,

            open: (ws) => {
                this.redis.sadd('servers', `${ws.name} (${ArrayBufferDecoder.decode(ws.getRemoteAddressAsText())})`);
                console.log(`[${new Date().toISOString()}] WebSocket opened: ${ws.uid}, name: ${ws.name}, address: ${ArrayBufferDecoder.decode(ws.getRemoteAddressAsText())}`);
            },

            upgrade: (res, req, context) => {
                let query = new URLSearchParams(req.getQuery());
                if (query.get('auth') !== env.logger_password || query.get('name') === null) {
                    res.writeStatus("401 Unauthorized");
                    res.end('Unauthorized');
                    console.log(`[${new Date().toISOString()}] Auth failed: ${ArrayBufferDecoder.decode(res.getRemoteAddressAsText())}`);
                }
                else {
                    res.upgrade({ uid: uuidv4(), name: query.get('name') },
                        req.getHeader('sec-websocket-key'),
                        req.getHeader('sec-websocket-protocol'),
                        req.getHeader('sec-websocket-extensions'),
                        context);
                }
            },

            message(_ws, message) {
                self.log(ArrayBufferDecoder.decode(message));
            },

            drain: (_ws) => { },

            close: (ws, code, _message) => {
                console.log(`[${new Date().toISOString()}] WebSocket closed: ${ws.uid}, name: ${ws.name}, code: ${code}`);
            }
        });
    }

    log(data: string) {
        let time = Date.now();
        //Rounding to the specified interval.
        //Changing the interval does not have a direct effect on user experience, this is only for storage organization
        let logKey = 'log:' + (time - (time % (env.log_interval * 60000)));
        this.redis.sadd(logKey, data);
    }
}