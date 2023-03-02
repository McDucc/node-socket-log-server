import Postgres from "postgres";
import Trigger from '../database/models/Trigger';
import SetupPostgresPool from "../database/PostgresSetup";
import { Environment } from "./Environment";
import SharedService from './SharedService';
import MailService from "mail-service";
import Templater from "template-engine";

export default class TriggerService {

    postgresPool: Postgres;

    triggers: Trigger[] = [];

    mailer: MailService | undefined = undefined;

    metrics: string[] = ['errors', 'logs', 'cpu', 'mem_used', 'disk_used', 'io_read', 'io_write', 'net_in', 'net_out', 'error_rate'];

    constructor() {
        this.postgresPool = SetupPostgresPool(Environment.postgres.threads.triggers);

        setTimeout(() => { this.loadTriggers() }, Environment.trigger_reload_cooldown);
        setTimeout(() => { this.checkTriggers() }, Environment.trigger_execute_cooldown);

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
            this.mailer.listen('127.0.0.1', Environment.mails.port);
        }

        Templater.setTemplateFolder('./mail');
    }

    public async loadTriggers() {
        try {
            this.triggers = await this.postgresPool.query("get-triggers", "SELECT * from triggers WHERE active = true", []);
        } catch (err) {
            SharedService.log('Error while loading triggers from database', err);
        }
    }


    lastTriggerCheck = 0;
    public async checkTriggers() {
        try {
            this.lastTriggerCheck = Date.now();
            let servers = await this.getServerArray();
            for (let trigger of this.triggers) {
                for (let server of servers) {
                    await this.handleTrigger(trigger, server);
                }
            }
        } catch (err) {
            SharedService.log('Error while processing triggers', err);
        } finally {
            setTimeout(() => { this.checkTriggers() }, Math.max(0, Environment.trigger_execute_cooldown - (Date.now() - this.lastTriggerCheck)));
        }
    }

    public async handleTrigger(trigger: Trigger, server: string) {
        try {
            if (!this.metrics.includes(trigger.value)) return;

            if (trigger.value === 'errors') {
                await this.handleErrorTrigger(trigger, server);
            } else if (trigger.value === 'logs') {
                await this.handleLogTrigger(trigger, server);
            } else {
                await this.handleMetricTrigger(trigger, server);
            }
        } catch (err) {
            SharedService.log('Error while handling trigger', err);
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

    public async sendMail(trigger: Trigger, value: number) {
        if (!this.mailer) return;

        let content = await Templater.render('triggers.mail.html', { trigger, value, time: new Date().toISOString() });

        this.mailer.sendMail({
            to: Environment.mails.target,
            reply: Environment.mails.reply_email,
            subject: `Trigger ${trigger.id} activated: ${trigger.name}`,
            html: content,
            text: content.replace(/<[^>]*>?/gm, '')
        });
    }
}