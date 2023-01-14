"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const env_1 = require("./env");
class HasApp {
    constructor(port) {
        this.port = port;
        process.on('uncaughtException', function (err) {
            console.log(err);
            process.exit(1);
        });
        this.app = (0, uWebSockets_js_1.App)();
    }
    startListening() {
        this.app.listen(env_1.env.host, this.port, (listenSocket) => {
            if (listenSocket) {
                console.log(`${this.constructor.name} is listening on ${env_1.env.host}:${this.port}`);
            }
            else {
                console.log(`${this.constructor.name} could not start listening on ${env_1.env.host}:${this.port}`);
            }
        });
    }
}
exports.default = HasApp;
