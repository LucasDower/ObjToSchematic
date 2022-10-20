import { LOC } from './localise';
import { EAction } from './util';
import { ASSERT } from './util/error_util';
import { LOG, LOG_MAJOR, LOG_WARN } from './util/log_util';
import { TLocString } from './util/type_util';

export type StatusType = 'warning' | 'info';

/* eslint-disable */
export enum StatusID {
    SchematicUnsupportedBlocks
}
/* eslint-enable */


export type StatusMessage = {
    status: StatusType,
    message: TLocString,
    id?: StatusID,
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

    public add(status: StatusType, message: TLocString, id?: StatusID) {
        (status === 'warning' ? LOG_WARN : LOG)(message);
        this._statusMessages.push({ status: status, message: message, id: id });
    }

    public hasId(id: StatusID) {
        return this._statusMessages.some((x) => { return x.id === id; });
    }

    public hasStatusMessages(statusType: StatusType): boolean {
        return this.getStatusMessages(statusType).length > 0;
    }

    public getStatusMessages(statusType: StatusType): string[] {
        const messagesToReturn = (statusType !== undefined) ? this._statusMessages.filter((m) => m.status === statusType) : this._statusMessages;
        return messagesToReturn.map((m) => m.message);
    }

    public getAllStatusMessages(): StatusMessage[] {
        return this._statusMessages;
    }

    public getDefaultSuccessMessage(action: EAction | 'Renderer'): TLocString {
        switch (action) {
            case EAction.Import:
                return LOC.t('info.import_success');
            case EAction.Voxelise:
                return LOC.t('info.voxelise_success');
            case EAction.Assign:
                return LOC.t('info.assign_success');
            case EAction.Export:
                return LOC.t('info.export_success');
            case 'Renderer':
                return LOC.t('info.renderer_success');
            default:
                ASSERT(false);
        }
    }

    public getDefaultInProgressMessage(action: EAction | 'Renderer'): TLocString {
        switch (action) {
            case EAction.Import:
                return LOC.t('info.import_in_progress');
            case EAction.Voxelise:
                return LOC.t('info.voxelise_in_progress');
            case EAction.Assign:
                return LOC.t('info.assign_in_progress');
            case EAction.Export:
                return LOC.t('info.export_in_progress');
            case 'Renderer':
                return LOC.t('info.renderer_in_progress');
            default:
                ASSERT(false);
        }
    }

    public getDefaultFailureMessage(action: EAction | 'Renderer'): TLocString {
        switch (action) {
            case EAction.Import:
                return LOC.t('error.import_failure');
            case EAction.Voxelise:
                return LOC.t('error.voxelise_failure');
            case EAction.Assign:
                return LOC.t('error.assign_failure');
            case EAction.Export:
                return LOC.t('error.export_failure');
            case 'Renderer':
                return LOC.t('error.renderer_failure');
            default:
                ASSERT(false);
        }
    }

    public getGenericFailureMessage(): TLocString {
        return LOC.t('error.generic_failure');
    }

    public dump() {
        for (const { message, status } of this._statusMessages) {
            if (status === 'warning') {
                LOG_WARN(message);
            } else {
                LOG_MAJOR('  - ' + message);
            }
        }
        return this;
    }
}
