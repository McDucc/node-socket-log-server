"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const env_1 = require("./env");
class HasApp {
    constructor() {
        process.on('uncaughtException', function (err) {
            console.log(err);
            process.exit(1);
        });
        this.app = uWebSockets_js_1.App(env_1.env.ssl ?
            {
                cert_file_name: env_1.env.ssl_cert,
                key_file_name: env_1.env.ssl_key
            } : {});
    }
    startListening() {
        let port = env_1.env.ssl ? env_1.env.ssl_port : env_1.env.port;
        this.app.listen(env_1.env.host, port, (listenSocket) => {
            if (listenSocket) {
                console.log(`${this.constructor.name} is listening on ${env_1.env.host}:${port}`);
            }
            else {
                console.log(`${this.constructor.name} could not start listening on ${env_1.env.host}:${port}`);
            }
        });
    }
}
exports.default = HasApp;
