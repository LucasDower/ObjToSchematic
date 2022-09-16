import { EAppEvent, EventManager } from './event';
import { ASSERT } from './util/error_util';


export class ProgressManager {
    /* Singleton */
    private static _instance: ProgressManager;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _tasks: string[];

    private constructor() {
        this._tasks = [];
    }

    /**
     * Start tracking the progress of a task.
     * @param taskId The id of the task (created here).
     * @param max The maximum number the task progress index can reach.
     * For example, if you are iterating over an array of 1000 elements, this will be 1000.
     * @param divisions The number of updates the manager should track.
     * For example, 4 means an event will be emitted for 20%, 40%, 60%, 80% progress.
     */
    public start(taskId: string) {
        ASSERT(!this._tasks.includes(taskId), 'Task with that Id already being tracked');
        this._tasks.push(taskId);
        EventManager.Get.broadcast(EAppEvent.onTaskStart, taskId);
    }

    /**
     * Announce progress has been made on a task.
     * @param taskId The id of the task (created in `start`).
     * @param progressIndex The index of the progress made so far.
     * For example, if you are iteratinve over an array of 1000 elements, and are on index 230, this should be 230.
     */
    public progress(taskId: string, percentage: number) {
        EventManager.Get.broadcast(EAppEvent.onTaskProgress, taskId, percentage);
    }

    /**
     * Announce a task has completed.
     * @param taskId The id of the task (created in `start`).
     */
    public end(taskId: string) {
        const taskIndex = this._tasks.findIndex((task) => { return task === taskId });
        ASSERT(taskIndex !== -1, 'Task with that Id is not being tracked');
        this._tasks.splice(taskIndex, 1);
        EventManager.Get.broadcast(EAppEvent.onTaskEnd, taskId);
    }
}
