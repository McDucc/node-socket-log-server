import Postgres from "postgres";
import Trigger from "../database/models/Trigger";
import SetupPostgresPool from "../database/PostgresSetup";
import { Environment } from "./Environment";
import SharedService from './SharedService';
import MailService from "mail-service";

export default class TriggerService {

    postgresPool: Postgres;

    triggers: Trigger[] = [];

    lastTriggerCheck = 0;

    mailer: MailService | undefined = undefined;

    constructor() {
        this.postgresPool = SetupPostgresPool(Environment.postgres.threads.triggers);
        setTimeout(() => { this.loadTriggers() }, Environment.trigger_reload_cooldown);
        setTimeout(() => { this.checkTriggers() }, 5000);
        if (Environment.mails.use) {
            this.mailer = new MailService(
                Environment.mails.sender_name,
                Environment.mails.sender_email,
                Environment.mails.ssl,
                Environment.mails.key_file,
                Environment.mails.cert_file,
                Environment.mails.debug,
                Environment.mails.passphrase,
                Environment.mails.dkim_file,
                Environment.mails.dkim_format,
                Environment.mails.dkim_selector,
                Environment.mails.max_payload);
            this.mailer.listen('127.0.0.1', 5000);
        }
    }

    public async loadTriggers() {
        try {
            this.triggers = await this.postgresPool.query("get-triggers", "SELECT * from triggers WHERE active = true", []);
        } catch (err) {
            console.log('Error while loading triggers from database', err);
        }
    }

    public async checkTriggers() {
        try {
            this.lastTriggerCheck = Date.now();
            for (let trigger of this.triggers) {
                for (let server of await this.getServerArray()) {
                    if (trigger.value === 'errors') {
                        await this.handleErrorTrigger(trigger, server);
                    } else if (trigger.value === 'logs') {
                        await this.handleLogTrigger(trigger, server);
                    } else {
                        await this.handleMetricTrigger(trigger, server);
                    }
                }
            }
        } catch (err) {
            console.log('Error while processing triggers', err);
        } finally {
            setTimeout(() => { this.checkTriggers() }, Math.max(0, 10000 - (Date.now() - this.lastTriggerCheck)));
        }
    }

    public async handleMetricTrigger(trigger: Trigger, server: string) {
        let query = `SELECT AVG(${trigger.value}) as metric FROM metrics WHERE time > $1 AND server = $2`;
        let queryName = trigger.value + '-trigger';

        let result = await this.postgresPool.query(queryName, query, [Date.now() - trigger.time, server])
        let metric = result[0].metric;
        if (metric > trigger.threshold) {
            await this.writeTriggerMessage(trigger, server, metric);
        }
    }

    public async handleLogTrigger(trigger: Trigger, server: string) {
        let result = await this.postgresPool.query('handle-log-trigger', 'SELECT COUNT(*) as count FROM logs WHERE time > $1 AND server = $2', [Date.now() - trigger.time, server])
        let count = result[0].count;
        if (count > trigger.threshold) {
            await this.writeTriggerMessage(trigger, server, count)
        }
    }

    public async handleErrorTrigger(trigger: Trigger, server: string) {
        let result = await this.postgresPool.query('handle-error-trigger', 'SELECT COUNT(*) as count FROM logs WHERE time > $1 AND server = $2 AND level >=$3', [Date.now() - trigger.time, server, Environment.error_rate_level])
        let count = result[0].count;
        if (count > trigger.threshold) {
            await this.writeTriggerMessage(trigger, server, count)
        }
    }

    public async writeTriggerMessage(trigger: Trigger, server: string, value: number) {
        await this.postgresPool.query('write-trigger-message', 'INSERT INTO trigger_mesages (trigger_id, server, value, time) VALUES ($1,$2,$3,$4)',
            [trigger.id, server, value, Date.now()]);
    }

    async getServerArray(): Promise<string[]> {
        return await SharedService.getServerArray(this.postgresPool);
    }

    public async sendMail() {
        
    }
}