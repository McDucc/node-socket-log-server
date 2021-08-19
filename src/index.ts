import FrontEndcontroller from './FrontendService';
import LoggerWebservice from './LoggerWebservice';
import CleanUpService from './CleanUpService';
import cluster from 'cluster';


if(cluster.isPrimary){
    let workerFrontend = cluster.fork({type : 'frontend'}).process.pid;
    let workerWebservice = cluster.fork({type : 'ws'}).process.pid;

    cluster.on('exit', (worker: { process: { pid: number; }; }, code: number, signal: string) => {
        console.log(`Worker ${worker.process.pid} died. Code: ${code}. Signal: ${signal}`);

        if(worker.process.pid === workerWebservice){
            workerWebservice = cluster.fork({type : 'ws'}).process.pid;
        }else{
            workerFrontend = cluster.fork({type : 'frontend'}).process.pid;
        }
    });
}else
{
    if(process.env['type'] === 'ws'){
        new LoggerWebservice();
    }else{
        new FrontEndcontroller();
    }
}