export default class Trigger {
    id!: number;
    name!: string;
    description!: string;
    type!: string;
    value!: string;
    active!: boolean;
    send_mails!: boolean;
    threshold!: number;
    time!: number;
}