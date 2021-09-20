import { TemplatedApp, App } from 'uWebSockets.js';
import { env } from './env';

export default class HasApp {

    protected app: TemplatedApp;

    constructor() {

        /*
        * This is not optimal obviously but allows for a direct use in production.
        * Please report uncaught exceptions on github.
        */
        process.on('uncaughtException', function (err) {
            console.log(err);
            process.exit(1);
        });

        this.app = App(env.ssl ?
            {
                cert_file_name: env.ssl_cert,
                key_file_name: env.ssl_key
            } : {});

    }

    startListening() {
        let port = env.ssl ? env.ssl_port : env.port;
        this.app.listen(env.host, port, (listenSocket) => {
            if (listenSocket) {
                console.log(`${this.constructor.name} is listening on ${env.host}:${port}`)
            } else {
                console.log(`${this.constructor.name} could not start listening on ${env.host}:${port}`)
            }
        })
    }
}