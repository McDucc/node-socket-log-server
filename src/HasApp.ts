import { TemplatedApp, SSLApp } from 'uWebSockets.js';
import { env } from './env';

export default class HasApp {

    protected app: TemplatedApp;

    constructor(public port: number) {

        /*
        * This is not optimal obviously but allows for a direct use in production.
        * Please report uncaught exceptions on github.
        */
        process.on('uncaughtException', function (err) {
            console.log(err);
            process.exit(1);
        });

        this.app = SSLApp(
            {
                "key_file_name": "server.key",
                "cert_file_name": "server.cert"
            });

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