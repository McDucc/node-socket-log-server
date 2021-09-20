import HasApp from './HasApp';
import { RedisClient } from 'redis';
import getRedisInstance from './Redis';
import { env } from './env';
import { DISABLED } from 'uWebSockets.js';
import * as util from 'util'


export default class LoggerWebservice extends HasApp {

    redis: RedisClient;

    constructor() {
        super();
        this.redis = getRedisInstance();
        this.webservice();
        this.startListening();
    }

    webservice() {
        let self = this;
        let decoder = new util.TextDecoder("utf-8");
        this.app.ws('/x', {
            idleTimeout: 32,
            maxBackpressure: 4096,
            maxPayloadLength: 8 * 1024,
            compression: DISABLED,

            open(ws) {
            },

            upgrade: (res, req, context) => {
                try {
                    if (!(req.getQuery() === 'auth=' + env.logger_auth)) {
                        return res.writeStatus('401').end();
                    }
                }
                catch {
                    return res.writeStatus('401').end();
                }

                res.upgrade({ uid: req.getHeader('id') },
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context);
            },

            message(ws, message) {
                self.log(decoder.decode(message));
            },

            drain: (ws) => {
                console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
            },

            close: (ws, code, message) => {
                console.log('WebSocket closed');
            }
        });
    }

    log(data: string) {
        let time = Date.now();
        //Rounding to the specified interval.
        //Changing the interval does not have an effect on user experience, this is only for storage organization
        let logKey = 'log:' + (time - (time % (env.log_interval * 60000)));
        this.redis.sadd(logKey, data);
    }
}