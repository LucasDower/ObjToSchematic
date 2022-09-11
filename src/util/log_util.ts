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

/**
 * Performs console.warn if logging LOG_WARN is enabled
 */
export const LOG_WARN = (...data: any[]) => {
    if (Logger.Get.isLOGWARNEnabled()) {
        console.log(...data);
    }
}

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
    private _enabledLOGWARN = false;

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

    public enableLOGWARN() {
        this._enabledLOGWARN = true;
    }

    public disableLOGWARN() {
        this._enabledLOGWARN = false;
    }

    public isLOGEnabled() {
        return this._enabledLOG;
    }

    public isLOGMAJOREnabled() {
        return this._enabledLOGMAJOR;
    }

    public isLOGWARNEnabled() {
        return this._enabledLOGWARN;
    }
}
