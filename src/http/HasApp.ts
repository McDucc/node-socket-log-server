import path from 'path';
import { TemplatedApp, SSLApp, App, HttpResponse, RecognizedString } from 'uWebSockets.js';
import { Environment } from '../services/Environment';
import RequestData from './RequestData';
import * as fs from "fs";
import { gzip } from 'zlib';
import SharedService from '../services/SharedService';

export default class HasApp {

    protected app: TemplatedApp;

    public address: string = '';

    constructor(public port: number) {

        process.on('uncaughtException', function (err) {
            SharedService.log(err);
            process.exit(1);
        });

        if (Environment.ssl) {
            this.app = SSLApp({
                cert_file_name: Environment.ssl_cert,
                key_file_name: Environment.ssl_key
            });
        } else {
            this.app = App({});
        }
    }

    startListening() {
        this.app.listen(Environment.host, this.port, (listenSocket) => {
            this.address = `${Environment.host}:${this.port}`;

            if (listenSocket) {
                SharedService.log(`${this.constructor.name} is listening on ${Environment.host}:${this.port}`)
            } else {
                SharedService.log(`${this.constructor.name} could not start listening on ${Environment.host}:${this.port}`)
            }
        })
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

            if (auth && headers['auth-token'] !== Environment.logger_password) {
                return this.EndReponse(response, 'Unauthenticated');
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
        let filePath = path.resolve(__dirname, './../frontend/' + file);

        if (!fs.existsSync(filePath))
            SharedService.log(new Error(filePath + ' does not exist and can not be bound to router!'));

        this.bind('get', '/' + file, (_request: RequestData, response: HttpResponse) => {
            fs.readFile(filePath, (err, data) => {
                if (err) SharedService.log(err);
                this.EndReponse(response, data);
            });
        }, false);
    }


    async EndReponse(response: HttpResponse, data: RecognizedString, closeConnection: boolean = false, zip: boolean = true) {
        if (zip) {
            if (response.ended) return;
            response.writeHeader('Content-Encoding', 'gzip');
            data = await new Promise((resolve, reject) => {
                gzip(data, { level: 9, memLevel: 8 }, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
        };

        if (response.ended) return;
        response.writeStatus('200 OK');
        response.end(data, closeConnection);
    }

}