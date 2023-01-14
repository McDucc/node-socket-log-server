import RequestData from './RequestData';
import { HttpResponse } from "uWebSockets.js";
import { Dictionary } from "./RequestData";
import HasApp from './HasApp';
import PersistenceService from './PersistenceService';
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
        new PersistenceService();

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

            let body = Buffer.from('');
            response.onData(async (data: ArrayBuffer, isLast: boolean) => {
                body = Buffer.concat([body, Buffer.from(data)]);
                if (isLast) {
                    handler(new RequestData(headers, body.toString()), response);
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
            let parametersRaw = JSON.parse(request.data);

            if (this.parametersInvalid(parametersRaw)) {
                response.writeStatus('400 Bad Request');
                response.end('Parameters are not within acceptable ranges');
                return;
            } else {
                let parameters: SearchParameters = parametersRaw;
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
                }
                response.writeStatus('200 OK');
                response.end(JSON.stringify({ data, entryCount, page: parameters.page, pageSize: parameters.pageSize }));
            }
        } catch (err: any) {
            let res = JSON.stringify({
                message: err.message,
                stack: err.stack,
            });
            response.writeStatus('500 Internal Server Error');
            response.end(res);
            console.log(res);
        } finally {
            this.searchLock--;
        }
    }

    async SSCAN(key: string, cursor: string, pattern: string): Promise<[string, string[]]> {
        return new Promise((resolve) => {
            this.redis.sscan(key, 'MATCH', pattern, (err, data) => resolve(err ? ['0', []] : data));
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

        for (let server of servers) {
            let basePattern = `server:*${server}*level: [${minimumLevel}-${maximumLevel}]*`;

            //SSCAN can return the same values multiple times to we filter them using an object literal
            let termChecker: Dictionary<boolean> = {};

            for (let searchTerm of searchTerms) {
                let result: [string, string[]];
                let cursor = '0';
                do {
                    result = await this.SSCAN(setKey, cursor, basePattern + searchTerm + '*');
                    for (let element of result[1]) {

                        if (entryCount >= pageStart && entryCount < pageEnd && termChecker[element] === undefined) {
                            termChecker[element] = true;
                            data.push(element);
                        }

                        if (termChecker[element] === undefined || termChecker[element]) {
                            termChecker[element] = false;
                            entryCount++;
                        }
                    }
                } while (result[0] !== '0')
            }
        }
        return entryCount;
    }
}

class SearchParameters {
    searchTerms: string[] = [];
    intervalStart: number = 0;
    intervalEnd: number = 0;
    page: number = 0;
    pageSize: number = 0;
    minimumLevel: number = 0;
    maximumLevel: number = 0;
    servers: string[] = [];
}
