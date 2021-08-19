import HasApp from './HasApp';
import { RedisClient } from 'redis';
import getRedisInstance from './Redis';

export default class LoggerWebservice extends HasApp{

    redis : RedisClient;

    constructor(){
        super();
        this.redis = getRedisInstance();
        this.startListening();
    }

    log(data : string) {
        let time = Date.now();
        //Rounding to the specified interval.
        //Changing the interval does not have an effect on user experience, this is only for storage organization
        let logKey = 'log:'+(time - (time % (env.log_interval * 60000)));
        this.redis.sadd(logKey,data);
    }
}