import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { ASSERT } from './util/error_util';
import { LOG, LOGF, TIME_END, TIME_START } from './util/log_util';
import { doWork } from './worker';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';

export type TWorkerJob = {
    id: string,
    payload: TToWorkerMessage,
    callback?: (payload: TFromWorkerMessage) => void, // Called with the payload of the next message received by the worker
}

export class WorkerController {
    private _worker: Worker;
    private _jobQueue: TWorkerJob[];
    private _jobPending: TWorkerJob | undefined;
    private _jobStartTime: number;

    public constructor(scriptURL: string, options?: WorkerOptions) {
        this._worker = new Worker(scriptURL, options);
        this._worker.onmessage = this._onWorkerMessage.bind(this);

        this._jobQueue = [];
        this._jobStartTime = 0;
    }

    public addJob(newJob: TWorkerJob): boolean {
        const isJobAlreadyQueued = this._jobQueue.some((queuedJob) => { return queuedJob.id === newJob.id; });
        if (isJobAlreadyQueued) {
            LOG('[WorkerController]: Job already queued with ID', newJob.id);
            return false;
        }

        this._jobQueue.push(newJob);
        this._tryStartNextJob();

        return true;
    }

    public isBusy() {
        return this._jobPending !== undefined;
    }

    private _onWorkerMessage(payload: MessageEvent<TFromWorkerMessage>) {
        ASSERT(this._jobPending !== undefined, `Received worker message when no job is pending`);

        if (payload.data.action === 'Progress') {
            switch (payload.data.payload.type) {
                case 'Started':
                    EventManager.Get.broadcast(EAppEvent.onTaskStart, payload.data.payload.taskId);
                    break;
                case 'Progress':
                    EventManager.Get.broadcast(EAppEvent.onTaskProgress, payload.data.payload.taskId, payload.data.payload.percentage);
                    break;
                case 'Finished':
                    EventManager.Get.broadcast(EAppEvent.onTaskEnd, payload.data.payload.taskId);
                    break;
            }
            return;
        }

        const deltaTime = Date.now() - this._jobStartTime;
        LOG(`[WorkerController]: '${this._jobPending.id}' completed in ${deltaTime}ms`);

        if (this._jobPending.callback) {
            this._jobPending.callback(payload.data);
        }
        this._jobPending = undefined;

        this._tryStartNextJob();
    }

    private _tryStartNextJob() {
        if (this.isBusy() && AppConfig.Get.USE_WORKER_THREAD) {
            return;
        }

        this._jobPending = this._jobQueue.shift();
        if (this._jobPending === undefined) {
            return;
        }

        LOG(`[WorkerController]: Starting Job '${this._jobPending.id}' (${this._jobQueue.length} remaining)`);
        this._jobStartTime = Date.now();

        if (AppConfig.Get.USE_WORKER_THREAD) {
            this._worker.postMessage(this._jobPending.payload);
        } else {
            const result = doWork(this._jobPending.payload);
            if (this._jobPending.callback) {
                this._jobPending.callback(result);
            }
        }
    }
}
