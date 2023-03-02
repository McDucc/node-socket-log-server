import FrontEndcontroller from './services/FrontendService';
import LogService from './services/LogService';
import cluster, { Worker } from 'cluster';
import TriggerService from './services/TriggerService';
import SharedService from './services/SharedService';

/**
 * We use the cluster module to create one worker for the webservice and one for the frontend
 * Both workers have a type environment variable set so they know what code to execute
 * If a worker dies for whatever reason we can check the pid to restart it
 * It would be convenient to theck the type in the environment but it is sadly not available to the master
 */
if (cluster.isPrimary) {
    let log = cluster.fork({ type: 'log' }).process.pid;
    let triggers = cluster.fork({ type: 'triggers' }).process.pid;
    let frontend = cluster.fork({ type: 'frontend' }).process.pid;

    cluster.on('exit', (worker: Worker, code: number, signal: string) => {
        SharedService.log(`Worker ${worker.process.pid} died. Code: ${code}. Signal: ${signal}`);

        if (worker.process.pid === log) {
            log = cluster.fork({ type: 'log' }).process.pid;
        } else if (worker.process.pid === triggers) {
            triggers = cluster.fork({ type: 'triggers' }).process.pid;
        } else if (worker.process.pid === frontend) {
            frontend = cluster.fork({ type: 'frontend' }).process.pid;
        }
    });

} else {

    if (process.env.type === 'log') {
        new LogService();
    } else if (process.env.type === 'frontend') {
        new FrontEndcontroller();
    } else if (process.env.type === 'triggers') {
        new TriggerService();
    }
}