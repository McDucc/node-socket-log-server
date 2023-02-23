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

        ['favicon.ico',
            'style.css',
            'translation.js',
            'frontend.js',
            'app.html'].forEach((element) => {
                this.serveFile(element);
            });

        this.startListening();
    }

    bind(method: 'post' | 'get', routePattern: string, handler: (request: RequestData, response: HttpResponse) => void, auth: boolean = true) {

        //this keyword is lost / becomes undefined because the function is passed as an argument
        //https://stackoverflow.com/questions/4011793/this-is-undefined-in-javascript-class-methods
        handler = handler.bind(this);

        this.app[method](routePattern, (response, request) => {
            response.onAborted(() => { response.ended = true });

            let headers: Dictionary<string> = {};

            request.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });

            if (auth && headers['auth-token'] !== env.logger_password) {
                return EndReponse(response, 'Unauthenticated');
            }

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

        this.bind('get', '/' + file, (_request: RequestData, response: HttpResponse) => {
            fs.readFile(filePath, (err, data) => {
                if (err) console.log(err);
                EndReponse(response, data);
            });
        }, false);
    }

    authTest(_request: RequestData, response: HttpResponse) {
        return EndReponse(response, 'Authenticated');
    }

    async getServers(request: RequestData, response: HttpResponse) {
        let query = await this.postgresPool.query("get-servers", "SELECT DISTINCT server from logs ORDER BY server DESC", []);
        let data = query.map(entry => {
            return entry.server;
        });

        let query2 = await this.postgresPool.query("get-servers-metrics", "SELECT DISTINCT server from metrics ORDER BY server DESC", []);
        let data2 = query2.map(entry => {
            return entry.server;
        });

        data2.forEach(element => {
            if (!data.includes(element)) data.push(element);
        })

        EndReponse(response, JSON.stringify(data));
    }


    async getChannels(request: RequestData, response: HttpResponse) {
        EndReponse(response, JSON.stringify(await this.getChannelArray()));
    }

    async getChannelArray(): Promise<string[]> {
        let query = await this.postgresPool.query("get-channels", "SELECT DISTINCT channel from logs ORDER BY channel DESC", []);
        let data = query.map(entry => {
            return entry.channel;
        });
        return data;
    }

    parametersInvalid(parameters: any) {
        return parameters.intervalStart == 0 && parameters.intervalEnd == 0 ||
            parameters.page < 0 ||
            parameters.pageSize < 1 ||
            parameters.minimumLevel > parameters.maximumLevel;
    }

    async searchMetrics(request: RequestData, response: HttpResponse) {
        await this.search(request, response, 'metrics');
    }

    async search(request: RequestData, response: HttpResponse, mode: 'metrics' | 'database' = 'database') {

        if (this.searchLock >= this.searchLockLimit) {
            return EndReponse(response, 'Locked');
        }

        try {
            this.searchLock++;
            let data = JSON.parse(request.data);

            data.intervalStart = Math.max(0, data.intervalStart);
            data.intervalEnd = Math.min(Date.now(), data.intervalEnd);

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

            if (typeof parameters.searchTerm !== 'string' || !parameters.searchTerm.trim()) {
                parameters.searchTerm = undefined;
            }

            let data = await this.databaseLookup(
                parameters.searchTerm,
                parameters.servers,
                parameters.channels,
                parameters.minimumLevel,
                parameters.maximumLevel,
                parameters.intervalStart,
                parameters.intervalEnd,
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
            parameters.intervalStart,
            parameters.intervalEnd,
            parameters.resolution);

        response.writeStatus('200 OK');
        response.writeHeader('Content-Encoding', 'gzip');
        EndReponse(response, gzipSync(JSON.stringify(data), { level: 9, memLevel: 9 }));
    }

    searchQuery1Name = 'search-query-1';
    searchQuery1 = `SELECT level,server,time,message,data FROM ${env.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7
    OFFSET $8 LIMIT $9`;

    searchQuery2Name = 'search-query-2';
    searchQuery2 = `SELECT level,server,time,message,data FROM ${env.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6
    OFFSET $7 LIMIT $8`;

    searchQuery3Name = 'search-query-3';
    searchQuery3 = `SELECT level,server,time,message,data FROM ${env.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND server = ANY($4)
    AND time BETWEEN $5 AND $6
    OFFSET $7 LIMIT $8`;

    searchQuery4Name = 'search-query-4';
    searchQuery4 = `SELECT level,server,time,message,data FROM ${env.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND time BETWEEN $4 AND $5
    OFFSET $6 LIMIT $7`;

    searchQuery1CountName = 'search-query-1-count';
    searchQuery1Count = `SELECT COUNT(*) as count FROM ${env.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7`;

    searchQuery2CountName = 'search-query-2-count';
    searchQuery2Count = `SELECT COUNT(*) as count FROM ${env.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND time BETWEEN $5 AND $6`;

    searchQuery3CountName = 'search-query-3-count';
    searchQuery3Count = `SELECT COUNT(*) as count FROM ${env.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND server = ANY($4)
    AND time BETWEEN $5 AND $6`;

    searchQuery4CountName = 'search-query-4-count';
    searchQuery4Count = `SELECT COUNT(*) as count FROM ${env.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND time BETWEEN $4 AND $5`;

    metricsQueryName = 'search-metrics';
    metricsQuery = `SELECT
    server,
    ROUND(AVG(cpu)::numeric,3) AS cpu,
    ROUND(AVG(mem_used)::numeric,3) AS mem_used,
    ROUND(AVG(io_read)::numeric,3) AS io_read,
    ROUND(AVG(io_write)::numeric,3) AS io_write,
    ROUND(AVG(disk_used)::numeric,3) AS disk_used,
    ROUND(AVG(net_in)::numeric,3) AS net_in,
    ROUND(AVG(net_out)::numeric,3) AS net_out,
    0 AS error_rate,
    FLOOR((time - $1 + 0.00001) / ($2::numeric - $1) * $3) as slice FROM ${env.postgres.metrics_table} WHERE
    time BETWEEN $1 AND $2
    GROUP BY slice, server
    ORDER BY slice`;

    errorRateQueryName = 'error-rate';
    errorRateQuery = `SELECT
    server,
    COUNT(*) as error_rate,
    FLOOR((time - $1 + 0.00001) / ($2::numeric - $1) * $3) as slice
    FROM logs WHERE
    time BETWEEN $1 AND $2
    AND level > $4
    GROUP BY slice, server
    ORDER BY slice`;

    async metricsLookup(
        minimumTime: number,
        maximumTime: number,
        resolution: number = 30): Promise<MetricsResult> {

        let data = await this.postgresPool.query(this.metricsQueryName, this.metricsQuery, [minimumTime, maximumTime, resolution]);
        let errorRate = await this.postgresPool.query(this.errorRateQueryName, this.errorRateQuery, [minimumTime, maximumTime, resolution, env.error_rate_level])

        data.forEach(dataElement => {
            errorRate.forEach(errorRateElement => {
                if (dataElement.slice == errorRateElement.slice && dataElement.server == errorRateElement.server) {
                    return dataElement.error_rate = errorRateElement.error_rate;
                }
            });
        });

        return {
            data,
            entryCount: data.length,
            resolution,
            intervalStart: minimumTime,
            intervalEnd: maximumTime
        }
    }


    async databaseLookup(
        searchTerm: string | undefined,
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

            if (searchTerm === undefined) {
                let parameters1 = [channelsCasted, minimumLevel, maximumLevel, minimumTime, maximumTime, offset, pageSize];
                data = await this.postgresPool.query(this.searchQuery4Name, this.searchQuery4, parameters1);

                let parameters2 = [channelsCasted, minimumLevel, maximumLevel, minimumTime, maximumTime,];
                entryCount = (await this.postgresPool.query(this.searchQuery4CountName, this.searchQuery4Count, parameters2))[0].count;
            } else {
                let parameters1 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, minimumTime, maximumTime, offset, pageSize];
                data = await this.postgresPool.query(this.searchQuery2Name, this.searchQuery4, parameters1);

                let parameters2 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, minimumTime, maximumTime];
                entryCount = (await this.postgresPool.query(this.searchQuery2CountName, this.searchQuery2Count, parameters2))[0].count;
            }

        } else {

            let serverCasted = '{' + servers.join(',') + '}';

            if (searchTerm === undefined) {
                let parameters1 = [channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime, offset, pageSize];
                data = await this.postgresPool.query(this.searchQuery3Name, this.searchQuery3, parameters1);

                let parameters2 = [channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime];
                entryCount = (await this.postgresPool.query(this.searchQuery3CountName, this.searchQuery3Count, parameters2))[0].count;
            } else {
                let parameters1 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime, offset, pageSize];
                data = await this.postgresPool.query(this.searchQuery1Name, this.searchQuery1, parameters1);

                let parameters2 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime];
                entryCount = (await this.postgresPool.query(this.searchQuery1CountName, this.searchQuery1Count, parameters2))[0].count;
            }
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
    searchTerm: string | undefined = '';
    servers: string[] = [];
    channels: string[] | undefined;
}

class MetricsParameters {
    intervalStart: number = 0;
    intervalEnd: number = 0;
    resolution: number = 30;
}

class SearchResult {
    entryCount: number = 0;
    data: any[] = [];
    pageSize: number = 0;
    page: number = 0;
}

class MetricsResult {
    entryCount: number = 0;
    data: any[] = [];
    resolution: number = 0;
    intervalStart: number = 0;
    intervalEnd: number = 0;
}