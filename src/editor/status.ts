import { TLocalisedString } from './localiser';
import { TMessage } from './ui/console';
import { LOG, LOG_ERROR, LOG_WARN } from '../runtime/util/log_util';

/**
 * `StatusHandler` is used to track success, info, warning, and error messages.
 * There are separate singletons for the Client and Worker so when the Worker
 * has completed a Job it needs to send its status messages to the Client
 * along with its payload so that the messages can be displayed in the console.
 */
// TODO: Remove
export class StatusHandler {
    /** Singleton accessor */
    private static _instance: StatusHandler;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _messages: TMessage[];

    private constructor() {
        this._messages = [];
    }

    public clear() {
        this._messages = [];
    }

    public static success(message: TLocalisedString) {
        this.Get._messages.push({ text: message, type: 'success' });
    }

    public static info(message: TLocalisedString) {
        this.Get._messages.push({ text: message, type: 'info' });
    }

    public static warning(message: TLocalisedString) {
        this.Get._messages.push({ text: message, type: 'warning' });
    }

    public static error(message: TLocalisedString) {
        this.Get._messages.push({ text: message, type: 'error' });
    }

    public static getAll() {
        return this.Get._messages;
    }

    public dump() {
        this._messages.forEach((message) => {
            switch (message.type) {
                case 'info':
                case 'success':
                    LOG(message.text);
                    break;
                case 'warning':
                    LOG_WARN(message.text);
                    break;
                case 'error':
                    LOG_ERROR(message.text);
                    break;
            }
        });

        return this;
    }
}
