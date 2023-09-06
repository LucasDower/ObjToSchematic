/**
 * Logs to console and file if logging `LOG` is enabled.
 * This should be used for verbose logs.
 * @see LOG_MAJOR
 */
export const LOG = (...data: any[]) => {
    if (Logger.Get.isLOGEnabled()) {
        // eslint-disable-next-line no-console
        console.log(...data);
    }
};

export const LOGF = LOG;

/**
 * Logs to console and file if logging `LOG_MAJOR` is enabled.
 * This is identical to `LOG` but can be enabled/disabled separately.
 * This should be used for important logs.
 * @see LOG
 */
export const LOG_MAJOR = (...data: any[]) => {
    if (Logger.Get.isLOGMAJOREnabled()) {
        // eslint-disable-next-line no-console
        console.log(...data);
    }
};

/**
 * Logs a warning to the console and file if logging `LOG_WARN` is enabled.
 */
export const LOG_WARN = (...data: any[]) => {
    if (Logger.Get.isLOGWARNEnabled()) {
        // eslint-disable-next-line no-console
        console.warn(...data);
    }
};

/**
 * Starts a timer.
 * @see `TIME_END` To stop the timer.
 * @param label The ID of this timer.
 */
export const TIME_START = (label: string) => {
    if (Logger.Get.isLOGTIMEEnabled()) {
        // eslint-disable-next-line no-console
        console.time(label);
    }
};

/**
 * Stops a timer and prints the time elapsed. Not logged to file.
 * @see `TIME_START` To start the timer.
 * @param label The ID of this timer.
 */
export const TIME_END = (label: string) => {
    if (Logger.Get.isLOGTIMEEnabled()) {
        // eslint-disable-next-line no-console
        console.timeEnd(label);
    }
};

/**
 * Logs an error to the console and file, always.
 */
export const LOG_ERROR = (...data: any[]) => {
    // eslint-disable-next-line no-console
    console.error(...data);
};

/**
 * Logger controls enable/disabling the logging functions above.
 */
export class Logger {
    /* Singleton */
    private static _instance: Logger;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _enabledLOG: boolean;
    private _enabledLOGMAJOR: boolean;
    private _enabledLOGWARN: boolean;
    private _enabledLOGTIME: boolean;

    private _enabledLogToFile?: boolean;

    private constructor() {
        this._enabledLOG = false;
        this._enabledLOGMAJOR = false;
        this._enabledLOGWARN = false;
        this._enabledLOGTIME = false;
    }

    /**
     * Allow `LOG` calls to be printed to the console and to the log file if setup.
     */
    public enableLOG() {
        this._enabledLOG = true;
    }

    /**
     * Prevent `LOG` calls to be printed to the console and to the log file if setup.
     */
    public disableLOG() {
        this._enabledLOG = false;
    }

    /**
     * Allow `LOG_MAJOR` calls to be printed to the console and to the log file if setup.
     */
    public enableLOGMAJOR() {
        this._enabledLOGMAJOR = true;
    }

    /**
     * Prevent `LOG_MAJOR` calls to be printed to the console and to the log file if setup.
     */
    public disableLOGMAJOR() {
        this._enabledLOGMAJOR = false;
    }

    /**
     * Allow `LOG_WARN` calls to be printed to the console and to the log file if setup.
     */
    public enableLOGWARN() {
        this._enabledLOGWARN = true;
    }

    /**
     * Prevent `LOG_WARN` calls to be printed to the console and to the log file if setup.
     */
    public disableLOGWARN() {
        this._enabledLOGWARN = false;
    }

    /**
     * Allow `TIME_START`/`TIME_END` calls to be printed to the console and to the log file if setup.
     */
    public enableLOGTIME() {
        this._enabledLOGTIME = true;
    }

    /**
     * Prevent `TIME_START`/`TIME_END` calls to be printed to the console and to the log file if setup.
     */
    public disableLOGTIME() {
        this._enabledLOGTIME = false;
    }

    /**
     * Prevent console log calls to logged to the log file if setup.
     */
    public disableLogToFile() {
        this._enabledLogToFile = false;
    }

    /**
     * Whether or not `LOG` calls should be printed to the console and log file.
     */
    public isLOGEnabled() {
        return this._enabledLOG;
    }

    /**
     * Whether or not `LOG_MAJOR` calls should be printed to the console and log file.
     */
    public isLOGMAJOREnabled() {
        return this._enabledLOGMAJOR;
    }

    /**
     * Whether or not `LOG_WARN` calls should be printed to the console and log file.
     */
    public isLOGWARNEnabled() {
        return this._enabledLOGWARN;
    }

    /**
     * Whether or not `TIME_START`/`TIME_END` calls should be printed to the console and log file.
     */
    public isLOGTIMEEnabled() {
        return this._enabledLOGTIME;
    }
}
