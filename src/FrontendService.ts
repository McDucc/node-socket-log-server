import RequestData from './RequestData';
import { HttpResponse } from "uWebSockets.js";
import { Dictionary } from "./RequestData";
import HasApp from './HasApp';
import * as fs from "fs";
import { env } from './env';
import path from 'path';
import Postgres from 'postgres';
import SetupPostgresPool from './PostgresSetup';

export default class FrontEndcontroller extends HasApp {

    postgresPool: Postgres;

    onAbortNoAction = () => { };

    //The search function is limited since it can be pretty intense for the server
    searchLockLimit = env.search_limit;
    searchLock = 0;

    constructor() {
        super(env.frontend_port);
        this.postgresPool = SetupPostgresPool();

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

    async getServers(request: RequestData, response: HttpResponse) {
        if (request.headers['auth-token'] != env.logger_password) {
            return response.end('Unauthenticated');
        }

        let query = await this.postgresPool.query("get-servers", "SELECT DISTINCT server from logs", []);
        let data = query.map(entry => {
            return entry.server;
        });

        response.end(JSON.stringify(data));
    }

    parametersInvalid(parameters: any) {
        return parameters.intervalStart == 0 && parameters.intervalEnd == 0 ||
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
                let offset = parameters.page * parameters.pageSize;
                let limit = parameters.pageSize;
                let now = Date.now();
                //Translate minutes to milliseconds and set the intervals relative to the current time
                let intervalEnd = now - parameters.intervalEnd * 60000;
                let intervalStart = now - parameters.intervalStart * 60000;

                if (typeof parameters.searchTerm !== 'string') {
                    parameters.searchTerm = JSON.stringify(parameters.searchTerm);
                }

                let data = await this.searchDatabase(
                    parameters.searchTerm,
                    parameters.servers,
                    parameters.channel,
                    parameters.minimumLevel,
                    parameters.maximumLevel,
                    intervalEnd,
                    intervalStart,
                    offset,
                    limit);

                data.pageSize = parameters.pageSize;
                data.page = parameters.page;

                response.writeStatus('200 OK');
                response.end(JSON.stringify(data));
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

    searchQuery1Name = 'search-query-1';
    searchQuery1 = `SELECT channel,level,server,time,message,data FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = $2
    AND level BETWEEN $3 AND $4
    AND server IN ($5)
    AND time BETWEEN $6 AND $7
    OFFSET $8 LIMIT $9`;

    searchQuery2Name = 'search-query-2';
    searchQuery2 = `SELECT channel,level,server,time,message,data FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = $2
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6
    OFFSET $7 LIMIT $8`;

    searchQuery1CountName = 'search-query-1-count';
    searchQuery1Count = `SELECT COUNT(*) as count FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = $2
    AND level BETWEEN $3 AND $4
    AND server IN ($5)
    AND time BETWEEN $6 AND $7`;

    searchQuery2CountName = 'search-query-2-count';
    searchQuery2Count = `SELECT COUNT(*) as count FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = $2
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6`;


    async searchDatabase(
        searchTerm: string,
        servers: string[] | undefined,
        channel: string | undefined,
        minimumLevel: number,
        maximumLevel: number,
        minimumTime: number,
        maximumTime: number,
        offset: number,
        pageSize: number): Promise<SearchResult> {

        let data: any[];
        let entryCount: number;

        if (servers === undefined) {
            let parameters1 = [searchTerm, channel, minimumLevel, maximumLevel, minimumTime, maximumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery2Name, this.searchQuery2, parameters1);

            let parameters2 = [searchTerm, channel, minimumLevel, maximumLevel, minimumTime, maximumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery2CountName, this.searchQuery2Count, parameters2))[0].count;

        } else {
            let parameters1 = [searchTerm, channel, minimumLevel, maximumLevel, servers, minimumTime, maximumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery1Name, this.searchQuery1, parameters1);

            let parameters2 = [searchTerm, channel, minimumLevel, maximumLevel, servers, minimumTime, maximumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery1CountName, this.searchQuery1Count, parameters2))[0].count;
        }

        return {
            entryCount,
            data,
            pageSize: 0,
            page: 0
        };
    }
}

class SearchParameters {
    minimumLevel: number = 0;
    maximumLevel: number = 0;
    intervalStart: number = 0;
    intervalEnd: number = 0;
    page: number = 0;
    pageSize: number = 0;
    searchTerm: string = '';
    servers: string[] = [];
    channel: string | undefined;
}

class SearchResult {
    entryCount: number = 0;
    data: any[] = [];
    pageSize: number = 0;
    page: number = 0;
}