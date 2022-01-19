import RequestData from './RequestData';
import { HttpResponse } from "uWebSockets.js";
import { Dictionary } from "./RequestData";
import HasApp from './HasApp';
import CleanUpService from './CleanUpService';
import getRedisInstance from './Redis';
import * as fs from "fs";
import { env } from './env';
import path from 'path';
import * as util from 'util';

export default class FrontEndcontroller extends HasApp {

    redis = getRedisInstance();

    smemberPromise: (arg1: string) => Promise<string[]>;
    keysPromise: (arg1: string) => Promise<string[]>;

    //The search function is limited since it can be pretty intense for the server
    searchLockLimit = 3;
    searchLock = 0;

    constructor() {
        super(env.frontend_port);
        new CleanUpService();

        this.bind('post', '/search', this.search);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);

        this.serveFile('app.html');
        this.serveFile('favicon.ico');
        this.serveFile('style.css');
        this.serveFile('bootstrap.css');
        this.serveFile('bootstrap.css.map');
        this.serveFile('translation.js');
        this.serveFile('alpine.js');


        this.startListening();
        this.smemberPromise = util.promisify(this.redis.smembers);
        this.keysPromise = util.promisify(this.redis.keys);
    }

    bind(method: 'post' | 'get', routePattern: string, handler: (request: RequestData, response: HttpResponse) => void) {

        //this keyword is lost / becomes undefined because the function is passed as an argument
        //https://stackoverflow.com/questions/4011793/this-is-undefined-in-javascript-class-methods
        handler = handler.bind(this);

        this.app[method](routePattern, function (response, request) {
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

    async serveFile(file: string) {
        let filePath = path.resolve(__dirname, './frontend/' + file);

        if (!fs.existsSync(filePath))
            console.log(new Error(filePath + ' does not exist and can not be bound to router!'));

        this.bind('get', '/' + file, (request: RequestData, response: HttpResponse) => {
            fs.readFile(filePath, (err, data) => {
                if (err)
                    console.log(err);
                response.end(data);
            });
        });
    }

    authTest(request: RequestData, response: HttpResponse) {
        if (request.headers['auth-token'] != env.logger_password) {
            response.end('Unauthenticated');
            return;
        }

        response.end('Authenticated');
        return;
    }

    getServers(request: RequestData, response: HttpResponse) {
        if (request.headers['auth-token'] != env.logger_password) {
            response.end('Unauthenticated');
            return;
        }

        this.redis.smembers('servers', (err: any, reply: string[]) => {
            if (err) {
                console.log(err);
            }
            response.end(JSON.stringify({
                data: reply
            }));
        });
    }


    async search(request: RequestData, response: HttpResponse) {

        if (request.headers['auth-token'] != env.logger_password) {
            response.end('Unauthenticated');
            return;
        }

        if (this.searchLock >= this.searchLockLimit) {
            response.end('Locked');
            return;
        }

        try {
            this.searchLock++;
            let parameters = JSON.parse(request.data);
            parameters.searchTerms ??= [];
            parameters.intervalStart ??= 0;
            parameters.intervalEnd ??= 0;
            parameters.pageSize ??= 0;
            parameters.page ??= 0;
            parameters.minimumSeverity ??= 0;
            parameters.maximumSeverity ??= 10;
            parameters.servers ??= [];

            if (!Array.isArray(parameters.searchTerms) ||
                (parameters.intervalStart == 0 && parameters.intervalEnd == 0) ||
                parameters.intervalStart < parameters.intervalEnd ||
                parameters.page < 0 ||
                parameters.pageSize < 0 ||
                parameters.minimumSeverity > parameters.maximumSeverity ||
                !Array.isArray(parameters.servers)) {
                response.writeStatus('400 Bad Request');
                response.end('Parameters are not within acceptable ranges');
                return;
            } else {
                let entryCount = 0;
                let data: string[] = [];
                let pageStart = parameters.page * parameters.pageSize;
                let pageEnd = (parameters.page + 1) * parameters.pageSize;
                let now = Date.now();
                //Translate minutes to milliseconds and set the intervals relative to the current time
                let intervalEnd = now - parameters.intervalEnd * 60000;
                let intervalStart = now - parameters.intervalStart * 60000;

                //Logs are saved in redis keys with log:* where * equals the time
                let reply = await this.keysPromise('log:*');
                reply = reply.sort().reverse();

                if (!Array.isArray(parameters.searchTerms)) {
                    parameters.searchTerms = [parameters.searchTerms];
                }

                for (let i = 0; i < parameters.searchTerms.length; i++) {
                    if (typeof parameters.searchTerms[i] !== 'string')
                        parameters.searchTerms[i] = JSON.stringify(parameters.searchTerms[i]);
                }

                for (let i = 0; i < reply.length; i++) {
                    let setKey = reply[i];
                    let time = Number.parseInt(setKey.substring(4, 13));

                    if (time < intervalEnd && time > intervalStart)
                        entryCount = await this.searchSet(setKey,
                            parameters.searchTerms,
                            parameters.servers,
                            parameters.minimumSeverity,
                            parameters.maximumSeverity,
                            entryCount,
                            pageStart,
                            pageEnd,
                            data);

                    if (entryCount >= pageEnd)
                        break;

                }
                response.writeStatus('200 OK');
                response.end(JSON.stringify({ data }));
            }
        } catch (err) {
            response.writeStatus('500 Internal Server Error');
            response.end(JSON.stringify(err));
        } finally {
            this.searchLock--;
        }
    }

    async searchSet(
        setKey: string,
        searchTerms: string[],
        servers: string[],
        minimumSeverity: number,
        maximumSeverity: number,
        entryCount: number,
        pageStart: number,
        pageEnd: number,
        data: string[]): Promise<number> {
        try {
            let reply = await this.smemberPromise(setKey);

            reply.some((message) => {
                for (let i = 0; i < searchTerms.length; i++) {
                    let searchTerm = searchTerms[i];
                    if (searchTerm === '' || message.indexOf(searchTerm) >= 0) {
                        try {
                            let info: MessageInfo = JSON.parse(message);
                            if (servers.length === 0 ||
                                servers.includes(info.server ?? 'UNDEFINED') &&
                                typeof (info.severity) === 'number' &&
                                info.severity >= minimumSeverity &&
                                info.severity <= maximumSeverity) {
                                if (entryCount >= pageStart && entryCount < pageEnd) {
                                    data.push(message);
                                }
                                entryCount++;
                            }
                        }
                        catch (err: any) {
                            console.log(err);
                        }
                        break;
                    }
                }
                return entryCount >= pageEnd;
            });
        } catch (err: any) {
            console.log(err);
        }

        return entryCount;
    }
}

class MessageInfo {
    constructor(
        public severity: number,
        public server: string,
        public data: string
    ) { }
}