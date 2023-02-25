import FrontEndcontroller from './services/FrontendService';
import LoggerWebservice from './services/LogService';
import cluster, { Worker } from 'cluster';

/**
 * We use the cluster module to create one worker for the webservice and one for the frontend
 * Both workers have a type environment variable set so they know what code to execute
 * If a worker dies for whatever reason we can check the pid to restart it
 * It would be convenient to theck the type in the environment but it is sadly not available to the master
 */
if (cluster.isPrimary) {
    let workerWebservice = cluster.fork({ type: 'ws' }).process.pid;
    cluster.fork({ type: 'frontend' });

    cluster.on('exit', (worker: Worker, code: number, signal: string) => {
        console.log(`Worker ${worker.process.pid} died. Code: ${code}. Signal: ${signal}`);

        if (worker.process.pid === workerWebservice) {
            workerWebservice = cluster.fork({ type: 'ws' }).process.pid;
        } else {
            cluster.fork({ type: 'frontend' }).process.pid;
        }
    });
} else {
    if (process.env.type === 'ws') {
        new LoggerWebservice();
    } else {
        new FrontEndcontroller();
    }
}