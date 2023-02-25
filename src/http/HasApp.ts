import { TemplatedApp, SSLApp, App } from 'uWebSockets.js';
import { Environment } from '../services/Environment';

export default class HasApp {

    protected app: TemplatedApp;

    constructor(public port: number) {

        process.on('uncaughtException', function (err) {
            console.log(err);
            process.exit(1);
        });

        if (Environment.ssl) {
            this.app = SSLApp({
                cert_file_name: Environment.ssl_cert,
                key_file_name: Environment.ssl_key
            });
        } else {
            this.app = App({});
        }
    }

    startListening() {
        this.app.listen(Environment.host, this.port, (listenSocket) => {
            if (listenSocket) {
                console.log(`${this.constructor.name} is listening on ${Environment.host}:${this.port}`)
            } else {
                console.log(`${this.constructor.name} could not start listening on ${Environment.host}:${this.port}`)
            }
        })
    }
}