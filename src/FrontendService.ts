import RequestData from './RequestData';
import { HttpResponse } from "uWebSockets.js";
import { Dictionary } from "./RequestData";
import HasApp from './HasApp';
import CleanUpService from './CleanUpService';
import getRedisInstance from './Redis';
import * as fs from "fs";
import { env } from './env';
import path from 'path';

export default class FrontEndcontroller extends HasApp {

    redis = getRedisInstance();

    onAbortNoAction = () => { };

    //The search function is limited since it can be pretty intense for the server
    searchLockLimit = env.search_limit;
    searchLock = 0;

    constructor() {
        super(env.frontend_port);
        new CleanUpService();

        this.bind('post', '/search', this.search);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);

        ['app.html',
            'favicon.ico',
            'style.css',
            'bootstrap.css',
            'bootstrap.css.map',
            'translation.js',
            'alpine.js',
            'frontend.js'].forEach((element) => {
                this.serveFile(element);
            });

        this.startListening();
    }

    bind(method: 'post' | 'get', routePattern: string, handler: (request: RequestData, response: HttpResponse) => void) {

        //this keyword is lost / becomes undefined because the function is passed as an argument
        //https://stackoverflow.com/questions/4011793/this-is-undefined-in-javascript-class-methods
        handler = handler.bind(this);

        this.app[method](routePattern, (response, request) => {
            response.onAborted(this.onAbortNoAction);

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
                if (err) console.log(err);
                response.end(data);
            });
        });
    }

    authTest(request: RequestData, response: HttpResponse) {
        if (request.headers['auth-token'] != env.logger_password) {
            return response.end('Unauthenticated');
        }

        return response.end('Authenticated');
    }

    getServers(request: RequestData, response: HttpResponse) {
        if (request.headers['auth-token'] != env.logger_password) {
            return response.end('Unauthenticated');
        }

        this.redis.smembers('servers', (err: any, data: string[]) => {
            if (err) console.log(err);
            response.end(JSON.stringify(data));
        });
    }

    parametersInvalid(parameters: any) {
        return !Array.isArray(parameters.searchTerms) ||
            (parameters.intervalStart == 0 && parameters.intervalEnd == 0) ||
            parameters.intervalStart < parameters.intervalEnd ||
            parameters.page < 0 ||
            parameters.pageSize < 0 ||
            parameters.minimumLevel > parameters.maximumLevel ||
            !Array.isArray(parameters.servers);
    }


    async search(request: RequestData, response: HttpResponse) {

        if (request.headers['auth-token'] != env.logger_password) {
            return response.end('Unauthenticated');
        }

        if (this.searchLock >= this.searchLockLimit) {
            return response.end('Locked');
        }

        try {
            this.searchLock++;
            let parameters = JSON.parse(request.data);

            if (this.parametersInvalid(parameters)) {
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
                let reply: string[] = await new Promise((resolve) => {
                    this.redis.keys('log:*', (err, data) => resolve(err ? [] : data));
                });
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
                    let time = Number.parseInt(setKey.substring(4));

                    if (time < intervalEnd && time > intervalStart)
                        entryCount = await this.searchSet(setKey,
                            parameters.searchTerms,
                            parameters.servers,
                            parameters.minimumLevel,
                            parameters.maximumLevel,
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
        } catch (err: any) {
            response.writeStatus('500 Internal Server Error');
            response.end(JSON.stringify({
                message: err.message,
                stack: err.stack,
            }));
        } finally {
            this.searchLock--;
        }
    }

    async SSCAN(key: string, pattern: string): Promise<[string, string[]]> {
        return new Promise((resolve) => {
            this.redis.sscan(key, '0', 'MATCH', pattern, (err, data) => resolve(err ? ['0', []] : data));
        });
    }

    async searchSet(
        setKey: string,
        searchTerms: string[],
        servers: string[],
        minimumLevel: number,
        maximumLevel: number,
        entryCount: number,
        pageStart: number,
        pageEnd: number,
        data: string[]): Promise<number> {

        let resultSet: Dictionary<boolean> = {};

        for (let server of servers) {
            let basePattern = `server:*${server}*level: [${minimumLevel}-${maximumLevel}]*`;

            for (let searchTerm of searchTerms) {
                let result = await this.SSCAN(setKey, basePattern + searchTerm + '*');
                for (let element of result[1]) resultSet[element] = true;
            }
        }

        for (let message of Object.keys(resultSet)) {
            if (entryCount >= pageStart && entryCount < pageEnd) {
                data.push(message);
            }
            if (++entryCount >= pageEnd) break;
        }

        return entryCount;
    }
}