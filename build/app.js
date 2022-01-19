"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FrontendService_1 = __importDefault(require("./FrontendService"));
const LoggerWebservice_1 = __importDefault(require("./LoggerWebservice"));
const cluster_1 = __importDefault(require("cluster"));
if (!cluster_1.default.isWorker) {
    let workerWebservice = cluster_1.default.fork({ type: 'ws' }).process.pid;
    cluster_1.default.fork({ type: 'frontend' });
    cluster_1.default.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Code: ${code}. Signal: ${signal}`);
        if (worker.process.pid === workerWebservice) {
            workerWebservice = cluster_1.default.fork({ type: 'ws' }).process.pid;
        }
        else {
            cluster_1.default.fork({ type: 'frontend' }).process.pid;
        }
    });
}
else {
    if (process.env.type === 'ws') {
        new LoggerWebservice_1.default();
    }
    else {
        new FrontendService_1.default();
    }
}
