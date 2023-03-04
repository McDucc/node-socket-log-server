"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Trigger {
    constructor() {
        this.id = 0;
        this.name = '';
        this.description = '';
        this.type = '';
        this.value = '';
        this.active = true;
        this.send_mails = true;
        this.threshold = 0;
        this.time = 0;
    }
}
exports.default = Trigger;
