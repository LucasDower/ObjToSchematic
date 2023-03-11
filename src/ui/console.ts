import { LOG, LOG_ERROR, LOG_WARN } from '../util/log_util';
import { UIUtil } from '../util/ui_util';
import { HTMLBuilder } from './misc';

export type TMessage = { text: string, type: 'success' | 'info' | 'warning' | 'error' };

export class AppConsole {
    private static _instance: AppConsole;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _built: boolean;
    private _messages: TMessage[];

    private constructor() {
        this._built = false;
        this._messages = [];
    }

    public build() {
        const messagesHTML = new HTMLBuilder();

        messagesHTML.add('<div id="inner-console" class="row-container" style="padding: 5px; height: 100%; overflow: auto; white-space: nowrap;">');
        {
            this._messages.forEach((message) => {
                messagesHTML.add(this._getMessageHTML(message));
            });
        }
        messagesHTML.add('</div>');

        messagesHTML.placeInto('console');

        this._built = true;

        this._scrollToBottom();
    }

    public addLast() {
        if (!this._built) {
            return;
        }

        const consoleElement = UIUtil.getElementById('inner-console') as HTMLDivElement;
        consoleElement.innerHTML += this._getMessageHTML(this._messages[this._messages.length - 1]);

        this._scrollToBottom();
    }

    private _getMessageHTML(message: TMessage) {
        switch (message.type) {
            case 'success':
                return `<div class="row-item text-success">[OKAY]: ${message.text}</div>`;
            case 'info':
                return `<div class="row-item text-info">[INFO]: ${message.text}</div>`;
            case 'warning':
                return `<div class="row-item text-warning">[WARN]: ${message.text}</div>`;
            case 'error':
                return `<div class="row-item text-error">[UHOH]: ${message.text}</div>`;
        }
    }

    public static add(message: TMessage) {
        switch (message.type) {
            case 'error':
                this.error(message.text);
                break;
            case 'warning':
                this.warning(message.text);
                break;
            case 'info':
                this.info(message.text);
                break;
            case 'success':
                this.success(message.text);
                break;
        }
    }

    public static success(message: string) {
        LOG(message);
        this.Get._messages.push({ text: message, type: 'success' });
        this.Get.addLast();
    }

    public static info(message: string) {
        LOG(message);
        this.Get._messages.push({ text: message, type: 'info' });
        this.Get.addLast();
    }

    public static warning(message: string) {
        LOG_WARN(message);
        this.Get._messages.push({ text: message, type: 'warning' });
        this.Get.addLast();
    }

    public static error(message: string) {
        LOG_ERROR(message);
        this.Get._messages.push({ text: message, type: 'error' });
        this.Get.addLast();
    }

    private _scrollToBottom() {
        const consoleElement = UIUtil.getElementById('inner-console');
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }
}
