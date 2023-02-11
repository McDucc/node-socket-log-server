import { TemplatedApp, SSLApp, App } from 'uWebSockets.js';
import { env } from './env';

export default class HasApp {

    protected app: TemplatedApp;

    constructor(public port: number) {

        /*
        * Please report uncaught exceptions on github.
        */
        process.on('uncaughtException', function (err) {
            console.log(err);
            process.exit(1);
        });

        /*
        this.app = SSLApp({
            cert_file_name: env.ssl_cert,
            key_file_name: env.ssl_key
         });*/

        this.app = App({});
    }

    startListening() {
        this.app.listen(env.host, this.port, (listenSocket) => {
            if (listenSocket) {
                console.log(`${this.constructor.name} is listening on ${env.host}:${this.port}`)
            } else {
                console.log(`${this.constructor.name} could not start listening on ${env.host}:${this.port}`)
            }
        })
    }
}