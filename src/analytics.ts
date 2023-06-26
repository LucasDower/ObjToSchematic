import { AppConfig } from './config';
import { AppConsole } from './ui/console';
const gtag = require('ga-gtag');

export class AppAnalytics {
    private _ready: boolean;

    private static _instance: AppAnalytics;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._ready = false;
    }

    public static Init() {
        gtag.install('G-W0SCWQ7HGJ', { 'send_page_view': true });
        if (AppConfig.Get.VERSION_TYPE === 'd') {
            gtag.gtag('config', 'G-W0SCWQ7HGJ', { 'debug_mode': true });
        }
        this.Get._ready = true;
    }

    public static Event(id: string, attributes?: any) {
        if (this.Get._ready) {
            console.log('[Analytics]: Tracked event', id, attributes);
            gtag.gtag('event', id, Object.assign(attributes ?? {}, AppConfig.Get.VERSION_TYPE === 'd' ? { 'debug_mode': true } : {}));
        }
    }
}