import { ASSERT } from 'ots-core/src/util/util';
import { AppContext } from './app_context';
import { UI } from './ui/layout';

/* eslint-disable */
export enum EAppEvent {
    onTaskStart,
    onTaskProgress,
    onTaskEnd,
    onComboBoxChanged,
    onLanguageChanged,
}
/* eslint-enable */

export class EventManager {
    private _eventsToListeners: Map<EAppEvent, ((...args: any[]) => void)[]>;
    private _appContext?: AppContext;

    private static _instance: EventManager;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._eventsToListeners = new Map();
    }

    public bindToContext(context: AppContext) {
        this._appContext = context;
    }

    public init() {
        EventManager.Get.add(EAppEvent.onTaskStart, (...data) => {
            const lastAction = this._appContext?.getLastAction();
            if (lastAction !== undefined) {
                UI.Get.getActionButton(lastAction)
                    ?.startLoading()
                    .setProgress(0.0);
            }
        });

        EventManager.Get.add(EAppEvent.onTaskProgress, (...data) => {
            ASSERT(this._appContext !== undefined, 'Not bound to context');
            const lastAction = this._appContext?.getLastAction();
            if (lastAction !== undefined) {
                UI.Get.getActionButton(lastAction)
                    ?.setProgress(data[0][1]);
            }
        });

        EventManager.Get.add(EAppEvent.onTaskEnd, (...data) => {
            const lastAction = this._appContext?.getLastAction();
            if (lastAction !== undefined) {
                UI.Get.getActionButton(lastAction)
                    ?.resetLoading();
            }
        });
    }

    public add(event: EAppEvent, delegate: (...args: any[]) => void) {
        if (!this._eventsToListeners.has(event)) {
            this._eventsToListeners.set(event, []);
        }
        ASSERT(this._eventsToListeners.get(event) !== undefined, 'No event listener list');
        this._eventsToListeners.get(event)!.push(delegate);
    }

    public broadcast(event: EAppEvent, ...payload: any) {
        if (event !== EAppEvent.onTaskProgress) {
            console.log('[BROADCAST]', EAppEvent[event], payload);
        }

        const listeners = this._eventsToListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener(payload);
            }
        }
    }
}
