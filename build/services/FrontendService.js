import RequestData from '../http/RequestData';
import HasApp from '../http/HasApp';
import * as fs from "fs";
import { Environment } from './Environment';
import path from 'path';
import SetupPostgresPool from '../database/PostgresSetup';
import { gzipSync } from 'zlib';
function EndReponse(response, data, closeConnection = false) {
    if (!response.ended) {
        response.end(data, closeConnection);
    }
}
export default class FrontEndcontroller extends HasApp {
    constructor() {
        super(Environment.frontend_port);
        this.searchLockLimit = Environment.search_limit;
        this.searchLock = 0;
        this.searchQuery1Name = 'search-query-1';
        this.searchQuery1 = `SELECT level,server,time,message,data FROM ${Environment.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7
    OFFSET $8 LIMIT $9`;
        this.searchQuery1CountName = 'search-query-1-count';
        this.searchQuery1Count = `SELECT COUNT(*) as count FROM ${Environment.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7`;
        this.searchQuery2Name = 'search-query-2';
        this.searchQuery2 = `SELECT channel,level,server,time,message,data FROM ${Environment.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND server = ANY($4)
    AND time BETWEEN $5 AND $6
    OFFSET $7 LIMIT $8`;
        this.searchQuery2CountName = 'search-query-2-count';
        this.searchQuery2Count = `SELECT COUNT(*) as count FROM ${Environment.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND server = ANY($4)
    AND time BETWEEN $5 AND $6`;
        this.metricsQueryName = 'search-metrics';
        this.metricsQuery = `SELECT
    server,
    ROUND(AVG(cpu)::numeric,3) AS cpu,
    ROUND(AVG(mem_used)::numeric,3) AS mem_used,
    ROUND(AVG(io_read)::numeric,3) AS io_read,
    ROUND(AVG(io_write)::numeric,3) AS io_write,
    ROUND(AVG(disk_used)::numeric,3) AS disk_used,
    ROUND(AVG(net_in)::numeric,3) AS net_in,
    ROUND(AVG(net_out)::numeric,3) AS net_out,
    0 AS error_rate,
    FLOOR((time - $1 + 0.00001) / ($2::numeric - $1) * $3) as slice FROM ${Environment.postgres.metrics_table} WHERE
    time BETWEEN $1 AND $2
    GROUP BY slice, server
    ORDER BY slice`;
        this.errorRateQueryName = 'error-rate';
        this.errorRateQuery = `SELECT
    server,
    COUNT(*) as error_rate,
    FLOOR((time - $1 + 0.00001) / ($2::numeric - $1) * $3) as slice
    FROM logs WHERE
    time BETWEEN $1 AND $2
    AND level > $4
    GROUP BY slice, server
    ORDER BY slice`;
        this.postgresPool = SetupPostgresPool();
        this.bind('post', '/search', this.search);
        this.bind('post', '/metrics', this.searchMetrics);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);
        this.bind('post', '/triggers', this.getTriggers);
        this.bind('post', '/trigger_messages', this.getTriggerMessages);
        this.bind('post', '/channels', this.getChannels);
        this.bind('post', '/triggers/create', this.createTrigger);
        this.bind('post', '/triggers/update', this.updateTrigger);
        this.bind('post', '/triggers/delete', this.deleteTrigger);
        ['favicon.ico',
            'style.css',
            'translation.js',
            'frontend.js',
            'app.html'].forEach((element) => {
            this.serveFile(element);
        });
        this.startListening();
    }
    bind(method, routePattern, handler, auth = true) {
        handler = handler.bind(this);
        this.app[method](routePattern, (response, request) => {
            response.onAborted(() => { response.ended = true; });
            let headers = {};
            request.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });
            if (auth && headers['auth-token'] !== Environment.logger_password) {
                return EndReponse(response, 'Unauthenticated');
            }
            let body = Buffer.from('');
            response.onData(async (data, isLast) => {
                body = Buffer.concat([body, Buffer.from(data)]);
                if (isLast) {
                    handler(new RequestData(headers, body.toString()), response);
                }
            });
        });
    }
    async serveFile(file) {
        let filePath = path.resolve(__dirname, './../frontend/' + file);
        if (!fs.existsSync(filePath))
            console.log(new Error(filePath + ' does not exist and can not be bound to router!'));
        this.bind('get', '/' + file, (_request, response) => {
            fs.readFile(filePath, (err, data) => {
                if (err)
                    console.log(err);
                EndReponse(response, data);
            });
        }, false);
    }
    authTest(_request, response) {
        return EndReponse(response, 'Authenticated');
    }
    async getServers(request, response) {
        EndReponse(response, JSON.stringify(await this.getServerArray()));
    }
    async getServerArray() {
        let query1 = await this.postgresPool.query("get-servers", "SELECT DISTINCT server FROM logs ORDER BY server DESC", []);
        let query2 = await this.postgresPool.query("get-servers-metrics", "SELECT DISTINCT server FROM metrics ORDER BY server DESC", []);
        let query3 = await this.postgresPool.query("get-servers-trigger-mesages", "SELECT DISTINCT server FROM trigger_messages ORDER BY server DESC", []);
        let data = query1.map(entry => {
            return entry.server;
        });
        query2.concat(query3).forEach(element => {
            if (!data.includes(element.server))
                data.push(element.server);
        });
        return data;
    }
    async getTriggers(request, response) {
        let data = await this.postgresPool.query("get-triggers", "SELECT * from triggers ORDER BY active DESC", []);
        EndReponse(response, JSON.stringify(data));
    }
    async getTriggerMessages(request, response) {
        let parameters = JSON.parse(request.data);
        if (parameters.servers === undefined || parameters.servers.length === 0) {
            parameters.servers = await this.getServerArray();
        }
        let data = await this.postgresPool.query("trigger-messages", `
        SELECT * from trigger_messages
        WHERE time BETWEEN $1 AND $2
        OFFSET $3 LIMIT $4
        ORDER BY active DESC`, [parameters.intervalStart, parameters.intervalEnd, parameters.page * parameters.pageSize, parameters.pageSize]);
        let entryCount = (await this.postgresPool.query("trigger-messages-count", `
        SELECT COUNT(*) as count from trigger_messages
        WHERE time BETWEEN $1 AND $2`, [parameters.intervalStart, parameters.intervalEnd]))[0].count;
        EndReponse(response, JSON.stringify({
            data,
            pageSize: parameters.pageSize,
            page: parameters.page,
            entryCount
        }));
    }
    async getChannels(request, response) {
        EndReponse(response, JSON.stringify(await this.getChannelArray()));
    }
    async getChannelArray() {
        let query = await this.postgresPool.query("get-channels", "SELECT DISTINCT channel from logs ORDER BY channel DESC", []);
        let data = query.map(entry => {
            return entry.channel;
        });
        return data;
    }
    parametersInvalid(parameters) {
        return parameters.intervalStart == 0 && parameters.intervalEnd == 0 ||
            parameters.page < 0 ||
            parameters.pageSize < 1 ||
            parameters.minimumLevel > parameters.maximumLevel;
    }
    async searchMetrics(request, response) {
        await this.search(request, response, 'metrics');
    }
    async search(request, response, mode = 'database') {
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
            }
            else {
                await this.databaseSearch(data, response);
            }
        }
        catch (err) {
            response.writeStatus('500 Internal Server Error');
            EndReponse(response, JSON.stringify({
                message: err.message,
                stack: err.stack,
            }));
        }
        finally {
            this.searchLock--;
        }
    }
    async databaseSearch(parametersRaw, response) {
        if (this.parametersInvalid(parametersRaw)) {
            response.writeStatus('400 Bad Request');
            EndReponse(response, 'Parameters are not within acceptable ranges');
            return;
        }
        else {
            let parameters = parametersRaw;
            if (typeof parameters.searchTerm !== 'string' || !parameters.searchTerm.trim()) {
                parameters.searchTerm = undefined;
            }
            let data = await this.databaseLookup(parameters.searchTerm, parameters.servers, parameters.channels, parameters.minimumLevel, parameters.maximumLevel, parameters.intervalStart, parameters.intervalEnd, parameters.page * parameters.pageSize, parameters.pageSize);
            data.pageSize = parameters.pageSize;
            data.page = parameters.page;
            response.writeStatus('200 OK');
            response.writeHeader('Content-Encoding', 'gzip');
            EndReponse(response, gzipSync(JSON.stringify(data), { level: 9, memLevel: 9 }));
        }
    }
    async createTrigger(request, response) {
        let data = JSON.parse(request.data);
        let id = await this.postgresPool.query('create-trigger', 'INSERT INTO triggers (name,description,type,value,active,threshold,time) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [data.name, data.description, data.type, data.value, true, data.threshold, data.time]);
        EndReponse(response, id[0]);
    }
    async updateTrigger(request, response) {
        let data = JSON.parse(request.data);
        let id = await this.postgresPool.query('update-trigger', 'UPDATE triggers SET name=$1,description=$2,type=$3,value=$4,active=$5,threshold=$6,time=$7 WHERE id=$8', [data.name, data.description, data.type, data.value, data.active, data.threshold, data.time, data.id]);
        EndReponse(response, id[0]);
    }
    async deleteTrigger(request, response) {
        let data = JSON.parse(request.data);
        await this.postgresPool.query('delete-trigger', 'DELETE FROM triggers WHERE id = $1', [data.id]);
        EndReponse(response, 'OK');
    }
    async metricsSearch(parametersRaw, response) {
        let parameters = parametersRaw;
        let data = await this.metricsLookup(parameters.intervalStart, parameters.intervalEnd, parameters.resolution);
        response.writeStatus('200 OK');
        response.writeHeader('Content-Encoding', 'gzip');
        EndReponse(response, gzipSync(JSON.stringify(data), { level: 9, memLevel: 9 }));
    }
    async metricsLookup(minimumTime, maximumTime, resolution = 30) {
        let data = await this.postgresPool.query(this.metricsQueryName, this.metricsQuery, [minimumTime, maximumTime, resolution]);
        let errorRate = await this.postgresPool.query(this.errorRateQueryName, this.errorRateQuery, [minimumTime, maximumTime, resolution, Environment.error_rate_level]);
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
        };
    }
    async databaseLookup(searchTerm, servers, channels, minimumLevel, maximumLevel, minimumTime, maximumTime, offset, pageSize) {
        let data;
        let entryCount;
        if (channels === undefined || channels.length === 0) {
            channels = await this.getChannelArray();
        }
        let channelsCasted = '{' + channels.join(',') + '}';
        if (servers === undefined || servers.length === 0) {
            servers = await this.getServerArray();
        }
        let serverCasted = '{' + servers.join(',') + '}';
        if (searchTerm !== undefined) {
            let parameters1 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery1Name, this.searchQuery1, parameters1);
            let parameters2 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery1CountName, this.searchQuery1Count, parameters2))[0].count;
        }
        else {
            let parameters1 = [channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery2Name, this.searchQuery2, parameters1);
            let parameters2 = [channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery2CountName, this.searchQuery2Count, parameters2))[0].count;
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
    constructor() {
        this.minimumLevel = 0;
        this.maximumLevel = 0;
        this.intervalStart = 0;
        this.intervalEnd = 0;
        this.page = 0;
        this.pageSize = 0;
        this.searchTerm = '';
        this.servers = [];
    }
}
class TriggerMessagesParameters {
    constructor() {
        this.servers = [];
        this.intervalStart = 0;
        this.intervalEnd = 0;
        this.page = 0;
        this.pageSize = 0;
    }
}
class MetricsParameters {
    constructor() {
        this.intervalStart = 0;
        this.intervalEnd = 0;
        this.resolution = 30;
    }
}
class SearchResult {
    constructor() {
        this.entryCount = 0;
        this.data = [];
        this.pageSize = 0;
        this.page = 0;
    }
}
class MetricsResult {
    constructor() {
        this.entryCount = 0;
        this.data = [];
        this.resolution = 0;
        this.intervalStart = 0;
        this.intervalEnd = 0;
    }
}
