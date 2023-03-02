"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const uWebSockets_js_1 = require("uWebSockets.js");
const Environment_1 = require("../services/Environment");
const RequestData_1 = __importDefault(require("./RequestData"));
const fs = __importStar(require("fs"));
const zlib_1 = require("zlib");
const SharedService_1 = __importDefault(require("../services/SharedService"));
class HasApp {
    constructor(port) {
        this.port = port;
        process.on('uncaughtException', function (err) {
            SharedService_1.default.log(err);
            process.exit(1);
        });
        if (Environment_1.Environment.ssl) {
            this.app = (0, uWebSockets_js_1.SSLApp)({
                cert_file_name: Environment_1.Environment.ssl_cert,
                key_file_name: Environment_1.Environment.ssl_key
            });
        }
        else {
            this.app = (0, uWebSockets_js_1.App)({});
        }
    }
    startListening() {
        this.app.listen(Environment_1.Environment.host, this.port, (listenSocket) => {
            if (listenSocket) {
                SharedService_1.default.log(`${this.constructor.name} is listening on ${Environment_1.Environment.host}:${this.port}`);
            }
            else {
                SharedService_1.default.log(`${this.constructor.name} could not start listening on ${Environment_1.Environment.host}:${this.port}`);
            }
        });
    }
    bind(method, routePattern, handler, auth = true) {
        handler = handler.bind(this);
        this.app[method](routePattern, (response, request) => {
            response.onAborted(() => { response.ended = true; });
            let headers = {};
            request.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });
            if (auth && headers['auth-token'] !== Environment_1.Environment.logger_password) {
                return this.EndReponse(response, 'Unauthenticated');
            }
            let body = Buffer.from('');
            response.onData(async (data, isLast) => {
                body = Buffer.concat([body, Buffer.from(data)]);
                if (isLast) {
                    handler(new RequestData_1.default(headers, body.toString()), response);
                }
            });
        });
    }
    async serveFile(file) {
        let filePath = path_1.default.resolve(__dirname, './../frontend/' + file);
        if (!fs.existsSync(filePath))
            SharedService_1.default.log(new Error(filePath + ' does not exist and can not be bound to router!'));
        this.bind('get', '/' + file, (_request, response) => {
            fs.readFile(filePath, (err, data) => {
                if (err)
                    SharedService_1.default.log(err);
                this.EndReponse(response, data);
            });
        }, false);
    }
    async EndReponse(response, data, closeConnection = false, zip = true) {
        if (zip) {
            if (response.ended)
                return;
            response.writeHeader('Content-Encoding', 'gzip');
            data = await new Promise((resolve, reject) => {
                (0, zlib_1.gzip)(data, { level: 9, memLevel: 8 }, (err, data) => {
                    if (err)
                        return reject(err);
                    resolve(data);
                });
            });
        }
        ;
        if (response.ended)
            return;
        response.writeStatus('200 OK');
        response.end(data, closeConnection);
    }
}
exports.default = HasApp;
