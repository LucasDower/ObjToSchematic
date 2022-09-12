import fs from 'fs';
import util from 'util';

import { AppConfig } from '../config';
import { FileUtil } from './file_util';
import { AppPaths, PathUtil } from './path_util';

/**
 * Performs console.log if logging LOG is enabled
 */
export const LOG = (...data: any[]) => {
    if (Logger.Get.isLOGEnabled()) {
        // eslint-disable-next-line no-console
        console.log(...data);
        Logger.Get.logToFile(...data);
    }
};

/**
 * Performs console.log if logging LOG_MAJOR is enabled
 */
export const LOG_MAJOR = (...data: any[]) => {
    if (Logger.Get.isLOGMAJOREnabled()) {
        // eslint-disable-next-line no-console
        console.log(...data);
        Logger.Get.logToFile(...data);
    }
};

/**
 * Performs console.warn if logging LOG_WARN is enabled
 */
export const LOG_WARN = (...data: any[]) => {
    if (Logger.Get.isLOGWARNEnabled()) {
        // eslint-disable-next-line no-console
        console.warn(...data);
        Logger.Get.logToFile(...data);
    }
};

/* eslint-disable no-console */
export const LOG_ERROR = console.error;
export const TIME_START = console.time;
export const TIME_END = console.timeEnd;
/* eslint-disable */

export class Logger {
    /* Singleton */
    private static _instance: Logger;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _enabledLOG: boolean;
    private _enabledLOGMAJOR: boolean;
    private _enabledLOGWARN: boolean;

    private _logStream: fs.WriteStream;

    private constructor() {
        this._enabledLOG = false;
        this._enabledLOGMAJOR = false;
        this._enabledLOGWARN = false;

        FileUtil.mkdirSyncIfNotExist(AppPaths.Get.logs);
        this._logStream = fs.createWriteStream(PathUtil.join(AppPaths.Get.logs, `./${Date.now()}.log`));
    }

    public logToFile(...data: any[]) {
        if (AppConfig.LOG_TO_FILE) {
            this._logStream.write(util.format(...data) + '\n');
        }
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
