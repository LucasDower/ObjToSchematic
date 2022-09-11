/* eslint-disable */

/**
 * Performs console.log if logging LOG is enabled
 */
export const LOG = (...data: any[]) => {
    if (Logger.Get.isLOGEnabled()) {
        console.log(...data);
    }
}

/**
 * Performs console.log if logging LOG_MAJOR is enabled
 */
export const LOG_MAJOR = (...data: any[]) => {
    if (Logger.Get.isLOGMAJOREnabled()) {
        console.log(...data);
    }
}

export const LOG_WARN = console.warn;
export const LOG_ERROR = console.error;
export const TIME_START = console.time;
export const TIME_END = console.timeEnd;
/* eslint-enable */

export class Logger {
    /* Singleton */
    private static _instance: Logger;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _enabledLOG = false;
    private _enabledLOGMAJOR = false;

    private constructor() {
    }

    public enableLOG() {
        this._enabledLOG = true;
    }

    public disableLOG() {
        this._enabledLOG = false;
    }

    public enableLOGMAJOR() {
        this._enabledLOGMAJOR = true;
    }

    public disableLOGMAJOR() {
        this._enabledLOGMAJOR = false;
    }

    public isLOGEnabled() {
        return this._enabledLOG;
    }

    public isLOGMAJOREnabled() {
        return this._enabledLOGMAJOR;
    }
}
