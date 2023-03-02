"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FrontendService_1 = __importDefault(require("./services/FrontendService"));
const LogService_1 = __importDefault(require("./services/LogService"));
const cluster_1 = __importDefault(require("cluster"));
const TriggerService_1 = __importDefault(require("./services/TriggerService"));
const SharedService_1 = __importDefault(require("./services/SharedService"));
if (cluster_1.default.isPrimary) {
    let log = cluster_1.default.fork({ type: 'log' }).process.pid;
    let triggers = cluster_1.default.fork({ type: 'triggers' }).process.pid;
    let frontend = cluster_1.default.fork({ type: 'frontend' }).process.pid;
    cluster_1.default.on('exit', (worker, code, signal) => {
        SharedService_1.default.log(`Worker ${worker.process.pid} died. Code: ${code}. Signal: ${signal}`);
        if (worker.process.pid === log) {
            log = cluster_1.default.fork({ type: 'log' }).process.pid;
        }
        else if (worker.process.pid === triggers) {
            triggers = cluster_1.default.fork({ type: 'triggers' }).process.pid;
        }
        else if (worker.process.pid === frontend) {
            frontend = cluster_1.default.fork({ type: 'frontend' }).process.pid;
        }
    });
}
else {
    if (process.env.type === 'log') {
        new LogService_1.default();
    }
    else if (process.env.type === 'frontend') {
        new FrontendService_1.default();
    }
    else if (process.env.type === 'triggers') {
        new TriggerService_1.default();
    }
}
