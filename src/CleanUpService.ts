import getRedisInstance from './Redis';
import { env } from './env';


export default class CleanUpService {

    protected static redis = getRedisInstance();

    constructor() {
        //Clean up logs in the configured interval
        setInterval(this.cleanup, 60000 * env.cleanup_interval);
        this.cleanup();
    }

    cleanup() {
        let maximumLogAgeMillis = env.maximum_log_age * 60000;
        let deletedKeys = 0;
        console.log(`[${new Date().toISOString()}] Running cleanup service.`);
        CleanUpService.redis.keys('log:*', (err, reply) => {
            let keysForDeletion: string[] = [];
            if (!err) {
                reply.forEach(element => {
                    let time = Number.parseInt(element.substring(4)) ?? 0;
                    if (time < Date.now() - maximumLogAgeMillis) {
                        keysForDeletion.push(element);
                        deletedKeys++;
                    }
                });
                if (keysForDeletion.length > 0) CleanUpService.redis.del(keysForDeletion);
                console.log(`[${new Date().toISOString()}] Deleted ${deletedKeys} out of ${reply.length} log keys.`);
            } else {
                console.log('Error while cleaning up.', err);
            }
        });
    }
}