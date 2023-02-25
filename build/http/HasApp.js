"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const Environment_1 = require("../services/Environment");
class HasApp {
    constructor(port) {
        this.port = port;
        process.on('uncaughtException', function (err) {
            console.log(err);
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
                console.log(`${this.constructor.name} is listening on ${Environment_1.Environment.host}:${this.port}`);
            }
            else {
                console.log(`${this.constructor.name} could not start listening on ${Environment_1.Environment.host}:${this.port}`);
            }
        });
    }
}
exports.default = HasApp;
