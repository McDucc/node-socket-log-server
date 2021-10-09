import RequestData from './RequestData';
import { HttpResponse } from "uWebSockets.js";
import { Dictionary } from "./RequestData";
import HasApp from './HasApp';
import CleanUpService from './CleanUpService';
import { RedisClient } from 'redis';
import getRedisInstance from './Redis';
import * as fs from "fs";
import { env } from './env';

export default class FrontEndcontroller extends HasApp {

    redis: RedisClient;

    constructor() {
        super(env.frontend_port);
        new CleanUpService();
        this.bind('post', '/search', this.search);
        this.bind('get', '/app', this.loadApp);
        this.startListening();
        this.redis = getRedisInstance();
    }

    bind(method: 'post' | 'get', routePattern: string, handler: (request: RequestData, response: HttpResponse) => void) {
        this.app[method](routePattern, (response, request) => {
            response.onAborted(() => { });

            let headers: Dictionary<string> = {};

            request.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });

            let body = '';
            response.onData(async (data: ArrayBuffer, isLast: boolean) => {
                body += data;
                if (isLast) {
                    handler(new RequestData(headers, body), response);
                }
            });
        });
    }

    async loadApp(request: RequestData, response: HttpResponse) {
        for (let a = 0; a < 200; a++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            console.log(a + a);
        }
        fs.readFile('./src/frontend/app.html', (err, data) => {
            if (err) {
                response.end('Sorry, something went wrong while loading the app.');
                console.log(err);
            } else {
                response.end(data);
            }
        });
    }

    search(request: RequestData, response: HttpResponse) {
        try {
            let parameters = JSON.parse(request.data);
            let searchTerm = parameters.searchTerm ?? '';
            let intervalStart = parameters.intervalStart ?? 0;
            let intervalEnd = parameters.intervalEnd ?? 0;
            let pageSize = parameters.pageSize ?? 0;
            let page = parameters.page ?? 0;
            let minimumSeverity = parameters.page ?? 0;
            let maximumSeverity = parameters.page ?? 10;
            let servers = parameters.servers ?? [];

            if (searchTerm === '' || (intervalStart == 0 && intervalEnd == 0) || intervalStart < intervalEnd
                || page < 0 || pageSize < 0 || pageSize > 250 || minimumSeverity > maximumSeverity || !Array.isArray(servers)) {
                response.writeStatus('400 Bad Request');
                response.end('Parameters are not within acceptable ranges: ' + JSON.stringify({
                    searchTerm,
                    intervalStart,
                    intervalEnd,
                    pageSize,
                    page,
                    minimumSeverity,
                    maximumSeverity,
                    servers
                }));
                return;
            } else {
                let entryCount = 0;
                let data: string[] = [];
                let pageStart = page * pageSize;
                let pageEnd = pageStart + pageSize;

                this.redis.keys('log:*', (err, reply: string[]) => {
                    if (!err) {
                        reply.sort().reverse();
                        reply.some((setKey) => {
                            let time = Number.parseInt(setKey.substring(4, 13));
                            if (time < Date.now() - intervalEnd * 60000 && time > Date.now() - intervalStart * 60000) {
                                this.redis.smembers(setKey, (err, reply) => {
                                    if (!err) {
                                        reply.some((message) => {
                                            if (message.indexOf(searchTerm) >= 0) {
                                                try {
                                                    let info: MessageInfo = JSON.parse(message);
                                                    if (servers.length === 0 || servers.includes(info.server ?? 'UNDEFINED')) {
                                                        if (typeof (info.severity) === 'number' &&
                                                            info.severity >= minimumSeverity &&
                                                            info.severity <= maximumSeverity) {
                                                            if (entryCount >= pageStart && entryCount < pageEnd) {
                                                                data.push(message);
                                                            }
                                                            entryCount++;
                                                        }
                                                    }
                                                }
                                                catch { }
                                            }
                                            return entryCount >= pageEnd;
                                        });
                                    }
                                });
                            }
                            return entryCount >= pageEnd;
                        });
                    } else {
                        console.log(err);
                    }
                    response.writeStatus('200 OK');
                    response.end(JSON.stringify(data));
                });
            }
        } catch (err) {
            response.writeStatus('500 Internal Server Error');
            response.end(JSON.stringify(err));
        }
    }

}

class MessageInfo {
    constructor(
        public severity: number,
        public server: string,

    ) { }
}