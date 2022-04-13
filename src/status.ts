import { EAction } from './app_context';
import { LOG, LOG_WARN } from './util';

export type StatusType = 'warning' | 'info';

export type StatusMessage = {
    status: StatusType,
    message: string,
}

export class StatusHandler {
    /** Singleton accessor */
    private static _instance: StatusHandler;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }
    
    private _statusMessages: StatusMessage[];

    private constructor() {
        this._statusMessages = [];
    }

    public clear() {
        this._statusMessages = [];
    }

    public add(status: StatusType, message: string) {
        (status === 'warning' ? LOG_WARN : LOG)(message);
        this._statusMessages.push({ status: status, message: message });
    }

    public hasStatusMessages(statusType: StatusType): boolean {
        return this.getStatusMessages(statusType).length > 0;
    }

    public getStatusMessages(statusType: StatusType): string[] {
        const messagesToReturn = (statusType !== undefined) ? this._statusMessages.filter((m) => m.status === statusType ): this._statusMessages;
        return messagesToReturn.map((m) => m.message);
    }

    public getDefaultSuccessMessage(action: EAction): string {
        switch (action) {
            case EAction.Import:
                return 'Successfully loaded mesh';
            case EAction.Simplify:
                return 'Successfully simplified mesh';
            case EAction.Voxelise:
                return 'Successfully voxelised mesh';
            case EAction.Palette:
                return 'Successfully assigned blocks';
            case EAction.Export:
                return 'Successfully exported mesh';
            default:
                return 'Successfully performed action';
        }
    }

    public getDefaultFailureMessage(action: EAction): string {
        switch (action) {
            case EAction.Import:
                return 'Failed to load mesh';
            case EAction.Simplify:
                return 'Failed to simplify mesh';
            case EAction.Voxelise:
                return 'Failed to voxelise mesh';
            case EAction.Palette:
                return 'Failed to assign blocks';
            case EAction.Export:
                return 'Failed to export mesh';
            default:
                return 'Failed to perform action';
        }
    }
}
