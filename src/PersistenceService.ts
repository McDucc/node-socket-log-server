import getRedisInstance from './Redis';
import { env } from './env';
import * as fs from "fs";


export default class PersistenceService {

    protected static redis = getRedisInstance();

    constructor() {
        //Clean up logs in the configured interval
        setInterval(this.cleanup, 60000 * env.cleanup_interval);
        this.cleanup();
    }

    cleanup() {
        let maximumLogAgeMillis = env.maximum_log_age * 60000;
        console.log(`[${new Date().toISOString()}] Running persistence service.`);
        PersistenceService.redis.keys('log:*', (err, reply) => {
            if (!err) {
                reply.forEach(element => {
                    let time = Number.parseInt(element.substring(4)) ?? 0;
                    if (time < Date.now() - maximumLogAgeMillis) {
                        PersistenceService.redis.SMEMBERS(element, (data, err) => {
                            if (err) return;
                            fs.writeFile(element, JSON.stringify(data), (err) => {
                                if (err) {
                                    console.log(`[${new Date().toISOString()}] Error persisting ${element} on disk.`, err);
                                } else {
                                    console.log(`[${new Date().toISOString()}] Wrote key ${element} to disk.`);
                                    PersistenceService.redis.del(element);
                                }
                            });
                        });
                    }
                });
            } else {
                console.log(`[${new Date().toISOString()}] Error while cleaning up.`, err);
            }
        });
    }
}