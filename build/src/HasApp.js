"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var uWebSockets_js_1 = require("uWebSockets.js");
var env_1 = require("../env");
var HasApp = /** @class */ (function () {
    function HasApp() {
        /*
        * This is not optimal obviously but allows for a direct use in production.
        * Please report uncaught exceptions on github.
        */
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
    HasApp.prototype.startListening = function () {
        var _this = this;
        this.app.listen(env_1.env.host, env_1.env.ssl ? env_1.env.ssl_port : env_1.env.port, function (listenSocket) {
            if (listenSocket) {
                console.log(_this.constructor.name + " is listening on " + env_1.env.host + ":" + env_1.env.port);
            }
            else {
                console.log(_this.constructor.name + " could not start listening on " + env_1.env.host + ":" + env_1.env.port);
            }
        });
    };
    return HasApp;
}());
exports.default = HasApp;
