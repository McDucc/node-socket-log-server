import getRedisInstance from './Redis';
import { env } from './env';


export default class CleanUpService {

    constructor() {
        //Clean up logs in the configured interval
        setInterval(this.cleanup, 1000 * 60 * env.cleanup_interval);
    }

    cleanup() {
        let redis = getRedisInstance();
        redis.keys('log:*', (err, reply) => {
            if (!err) {
                reply.forEach(element => {
                    let time = Number.parseInt(element.substring(4, 13));
                    if (time < Date.now() - env.maximum_log_age * 60000) {
                        redis.del(element);
                    }
                });
            } else {
                console.log('Error while cleaning up.')
                console.log(err);
            }
        });
    }
}