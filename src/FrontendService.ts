import RequestData from './RequestData';
import { HttpResponse, RecognizedString } from "uWebSockets.js";
import { Dictionary } from "./RequestData";
import HasApp from './HasApp';
import * as fs from "fs";
import { env } from './env';
import path from 'path';
import Postgres from 'postgres';
import SetupPostgresPool from './PostgresSetup';
import { gzipSync } from 'zlib';

function EndReponse(response: HttpResponse, data: RecognizedString, closeConnection: boolean = false) {
    if (!response.ended) {
        response.end(data, closeConnection)
    }
}

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
        this.bind('post', '/metrics', this.searchMetrics);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);
        this.bind('post', '/channels', this.getChannels);

        ['app.html',
            'favicon.ico',
            'style.css',
            'translation.js',
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
            response.onAborted(() => { response.ended = true });

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
                EndReponse(response, data);
            });
        });
    }

    authTest(request: RequestData, response: HttpResponse) {
        if (request.headers['auth-token'] != env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }

        return EndReponse(response, 'Authenticated');
    }

    async getServers(request: RequestData, response: HttpResponse) {

        if (request.headers['auth-token'] != env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }

        let query = await this.postgresPool.query("get-servers", "SELECT DISTINCT server from logs ORDER BY server DESC", []);
        let data = query.map(entry => {
            return entry.server;
        });

        EndReponse(response, JSON.stringify(data));
    }


    async getChannels(request: RequestData, response: HttpResponse) {

        if (request.headers['auth-token'] != env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }

        let data = await this.getChannelArray();

        EndReponse(response, JSON.stringify(data));
    }

    async getChannelArray(): Promise<string[]> {
        let query = await this.postgresPool.query("get-channels", "SELECT DISTINCT channel from logs WHERE channel != 'metrics' ORDER BY channel DESC", []);
        let data = query.map(entry => {
            return entry.channel;
        });
        return data;
    }

    parametersInvalid(parameters: any) {
        return parameters.intervalStart == 0 && parameters.intervalEnd == 0 ||
            parameters.page < 0 ||
            parameters.pageSize < 1 ||
            parameters.minimumLevel > parameters.maximumLevel ||
            !Array.isArray(parameters.servers); //TODO
    }

    async searchMetrics(request: RequestData, response: HttpResponse) {
        await this.search(request, response, 'metrics');
    }


    async search(request: RequestData, response: HttpResponse, mode: 'metrics' | 'database' = 'database') {
        if (request.headers['auth-token'] != env.logger_password) {
            return EndReponse(response, 'Unauthenticated');
        }

        if (this.searchLock >= this.searchLockLimit) {
            return EndReponse(response, 'Locked');
        }

        try {
            this.searchLock++;
            let data = JSON.parse(request.data);

            if (mode === 'metrics') {
                await this.metricsSearch(data, response);
            } else {
                await this.databaseSearch(data, response);
            }
        } catch (err: any) {
            response.writeStatus('500 Internal Server Error');
            EndReponse(response, JSON.stringify({
                message: err.message,
                stack: err.stack,
            }));
        } finally {
            this.searchLock--;
        }
    }

    async databaseSearch(parametersRaw: any, response: HttpResponse) {
        if (this.parametersInvalid(parametersRaw)) {
            response.writeStatus('400 Bad Request');
            EndReponse(response, 'Parameters are not within acceptable ranges');
            return;
        } else {
            let parameters: SearchParameters = parametersRaw;

            if (typeof parameters.searchTerm !== 'string') {
                parameters.searchTerm = JSON.stringify(parameters.searchTerm);
            }

            let data = await this.databaseLookup(
                parameters.searchTerm,
                parameters.servers,
                parameters.channels,
                parameters.minimumLevel,
                parameters.maximumLevel,
                parameters.intervalEnd,
                parameters.intervalStart,
                parameters.page * parameters.pageSize,
                parameters.pageSize);

            data.pageSize = parameters.pageSize;
            data.page = parameters.page;

            response.writeStatus('200 OK');
            response.writeHeader('Content-Encoding', 'gzip');
            EndReponse(response, gzipSync(JSON.stringify(data), { level: 9, memLevel: 9 }));
        }
    }

    async metricsSearch(parametersRaw: any, response: HttpResponse) {
        let parameters: MetricsParameters = parametersRaw;

        let data = await this.metricsLookup(
            parameters.intervalEnd,
            parameters.intervalStart);

        response.writeStatus('200 OK');
        response.writeHeader('Content-Encoding', 'gzip');
        EndReponse(response, gzipSync(JSON.stringify(data), { level: 9, memLevel: 9 }));
    }

    searchQuery1Name = 'search-query-1';
    searchQuery1 = `SELECT level,server,time,message,data FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7
    OFFSET $8 LIMIT $9`;

    searchQuery2Name = 'search-query-2';
    searchQuery2 = `SELECT level,server,time,message,data FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6
    OFFSET $7 LIMIT $8`;

    searchQuery1CountName = 'search-query-1-count';
    searchQuery1Count = `SELECT COUNT(*) as count FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7`;

    searchQuery2CountName = 'search-query-2-count';
    searchQuery2Count = `SELECT COUNT(*) as count FROM ${env.postgres_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6`;

    metricsQueryName = 'search-query-2-count';
    metricsQuery = `SELECT server,time,data FROM ${env.postgres_table} WHERE 
    channel = 'metrics'
    AND level = 0
    AND time BETWEEN $1 AND $2`;

    async metricsLookup(
        minimumTime: number,
        maximumTime: number): Promise<SearchResult> {

        let data = await this.postgresPool.query(this.metricsQueryName, this.metricsQuery, [minimumTime, maximumTime]);

        return {
            data,
            entryCount: 0,
            page: 0,
            pageSize: 0
        }
    }


    async databaseLookup(
        searchTerm: string,
        servers: string[] | undefined,
        channels: string[] | undefined,
        minimumLevel: number,
        maximumLevel: number,
        minimumTime: number,
        maximumTime: number,
        offset: number,
        pageSize: number): Promise<SearchResult> {

        let data: any[];
        let entryCount: number;

        if (channels === undefined) {
            channels = await this.getChannelArray();
        }

        let channelsCasted = '{' + channels.join(',') + '}';

        if (servers === undefined) {
            let parameters1 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, maximumTime, minimumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery2Name, this.searchQuery2, parameters1);

            let parameters2 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, maximumTime, minimumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery2CountName, this.searchQuery2Count, parameters2))[0].count;

        } else {

            let serverCasted = '{' + servers.join(',') + '}';

            let parameters1 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, maximumTime, minimumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery1Name, this.searchQuery1, parameters1);

            let parameters2 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, maximumTime, minimumTime];
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
    channels: string[] | undefined;
}

class MetricsParameters {
    intervalStart: number = 0;
    intervalEnd: number = 0;
}

class SearchResult {
    entryCount: number = 0;
    data: any[] = [];
    pageSize: number = 0;
    page: number = 0;
}