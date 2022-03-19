import { ASSERT, LOG } from './util';

/* eslint-disable */
export enum EAppEvent {
    onModelActiveChanged,
    onModelAvailableChanged,
    onGridEnabledChanged,
    onWireframeEnabledChanged,
    onNormalsEnabledChanged,
}
/* eslint-enable */

export class EventManager {
    private _eventsToListeners: Map<EAppEvent, ((...args: any[]) => void)[]>;

    private static _instance: EventManager;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._eventsToListeners = new Map();
    }

    public add(event: EAppEvent, delegate: () => void) {
        if (!this._eventsToListeners.has(event)) {
            this._eventsToListeners.set(event, []);
        }
        ASSERT(this._eventsToListeners.get(event) !== undefined, 'No event listener list');
        this._eventsToListeners.get(event)!.push(delegate);
    }

    public broadcast(event: EAppEvent, ...payload: any) {
        LOG('[BROADCAST]', EAppEvent[event], payload);
        const listeners = this._eventsToListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener(payload);
            }
        }
    }
}
