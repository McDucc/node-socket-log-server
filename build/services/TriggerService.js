"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PostgresSetup_1 = __importDefault(require("../database/PostgresSetup"));
const Environment_1 = require("./Environment");
const SharedService_1 = __importDefault(require("./SharedService"));
const mail_service_1 = __importDefault(require("mail-service"));
const template_engine_1 = __importDefault(require("template-engine"));
class TriggerService {
    constructor() {
        this.triggers = [];
        this.mailer = undefined;
        this.metrics = ['errors', 'logs', 'cpu', 'mem_used', 'disk_used', 'io_read', 'io_write', 'net_in', 'net_out', 'error_rate'];
        this.lastTriggerCheck = 0;
        this.triggerMessageExistsName = 'trigger-message-exists';
        this.triggerMessageExistsQuery = 'SELECT COUNT(*) as count FROM trigger_messages WHERE trigger_id = $1 AND time BETWEEN $2 AND $3 AND server = $4';
        this.postgresPool = (0, PostgresSetup_1.default)(Environment_1.Environment.postgres.threads.triggers);
        setTimeout(() => { this.loadTriggers(); }, Environment_1.Environment.trigger_reload_time);
        setTimeout(() => { this.checkTriggers(); }, Environment_1.Environment.trigger_execution_time);
        if (Environment_1.Environment.mails.use) {
            this.mailer = new mail_service_1.default(Environment_1.Environment.mails.sender_name, Environment_1.Environment.mails.sender_email, Environment_1.Environment.mails.ssl, Environment_1.Environment.mails.key_file, Environment_1.Environment.mails.cert_file, Environment_1.Environment.mails.debug, Environment_1.Environment.mails.passphrase, Environment_1.Environment.mails.dkim_file, Environment_1.Environment.mails.dkim_format, Environment_1.Environment.mails.dkim_selector, Environment_1.Environment.mails.max_payload);
            this.mailer.listen('127.0.0.1', Environment_1.Environment.mails.port);
        }
        template_engine_1.default.setTemplateFolder('./mail');
    }
    async loadTriggers() {
        try {
            this.triggers = await this.postgresPool.query("get-triggers", "SELECT * from triggers WHERE active = true", []);
        }
        catch (err) {
            SharedService_1.default.log('Error while loading triggers from database', err);
        }
    }
    async checkTriggerActivation() {
        let servers = await this.getServerArray();
        for (let trigger of this.triggers) {
            if (!trigger.send_mails)
                continue;
            for (let server of servers) {
                await this.checkIfTriggerWasActivated(trigger, server);
            }
        }
    }
    async checkTriggers() {
        try {
            this.lastTriggerCheck = Date.now();
            let servers = await this.getServerArray();
            for (let trigger of this.triggers) {
                for (let server of servers) {
                    await this.handleTrigger(trigger, server);
                }
            }
        }
        catch (err) {
            SharedService_1.default.log('Error while processing triggers', err);
        }
        finally {
            setTimeout(() => { this.checkTriggers(); }, Math.max(0, Environment_1.Environment.trigger_execution_time - (Date.now() - this.lastTriggerCheck)));
        }
    }
    async handleTrigger(trigger, server) {
        try {
            if (!this.metrics.includes(trigger.value))
                return;
            if (trigger.value === 'errors') {
                await this.handleErrorTrigger(trigger, server);
            }
            else if (trigger.value === 'logs') {
                await this.handleLogTrigger(trigger, server);
            }
            else {
                await this.handleMetricTrigger(trigger, server);
            }
        }
        catch (err) {
            SharedService_1.default.log('Error while handling trigger', err);
        }
    }
    async handleMetricTrigger(trigger, server) {
        let query = `SELECT AVG(${trigger.value}) as metric FROM metrics WHERE time > $1 AND server = $2`;
        let queryName = trigger.value + '-trigger';
        let result = await this.postgresPool.query(queryName, query, [Date.now() - trigger.time, server]);
        let metric = result[0].metric;
        if (metric > trigger.threshold) {
            await this.writeTriggerMessage(trigger, server, metric);
        }
    }
    async handleLogTrigger(trigger, server) {
        let result = await this.postgresPool.query('handle-log-trigger', 'SELECT COUNT(*) as count FROM logs WHERE time > $1 AND server = $2', [Date.now() - trigger.time, server]);
        let count = result[0].count;
        if (count > trigger.threshold) {
            await this.writeTriggerMessage(trigger, server, count);
        }
    }
    async handleErrorTrigger(trigger, server) {
        let result = await this.postgresPool.query('handle-error-trigger', 'SELECT COUNT(*) as count FROM logs WHERE time > $1 AND server = $2 AND level >=$3', [Date.now() - trigger.time, server, Environment_1.Environment.error_rate_level]);
        let count = result[0].count;
        if (count > trigger.threshold) {
            await this.writeTriggerMessage(trigger, server, count);
        }
    }
    async writeTriggerMessage(trigger, server, value) {
        await this.postgresPool.query('write-trigger-message', 'INSERT INTO trigger_mesages (trigger_id, server, value, time) VALUES ($1,$2,$3,$4)', [trigger.id, server, value, Date.now()]);
    }
    async getServerArray() {
        return await SharedService_1.default.getServerArray(this.postgresPool);
    }
    async checkIfTriggerWasActivated(trigger, server) {
        let now = Date.now();
        let [time1, time2] = await Promise.all([this.postgresPool.query(this.triggerMessageExistsName, this.triggerMessageExistsQuery, [trigger.id, now - Environment_1.Environment.trigger_activation_time, now, server]),
            this.postgresPool.query(this.triggerMessageExistsName, this.triggerMessageExistsQuery, [trigger.id, now - Environment_1.Environment.trigger_activation_time * 2, now - Environment_1.Environment.trigger_activation_time - 1, server])]);
        let time1Count = time1[0].count;
        let time2Count = time2[0].count;
        if (time1Count > 0 && time2Count == 0) {
            this.sendMail(trigger, 0, 'activated', server);
        }
        else if (time1Count == 0 && time2Count > 0) {
            this.sendMail(trigger, 0, 'deactivated', server);
        }
    }
    async sendMail(trigger, value, activation, server, receipient = null) {
        if (!this.mailer)
            return;
        let content = await template_engine_1.default.render('triggers.mail.html', { trigger, value, time: new Date().toISOString(), activation, server });
        await this.mailer.mail(Environment_1.Environment.mails.sender_email, Environment_1.Environment.mails.sender_name, receipient !== null && receipient !== void 0 ? receipient : Environment_1.Environment.mails.receipient, Environment_1.Environment.mails.reply_email, `Trigger ${trigger.id} ${activation} on server ${server}: ${trigger.name}`, content, content.replace(/<[^>]*>?/gm, ''));
    }
}
exports.default = TriggerService;
