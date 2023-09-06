import { AppConfig } from '../../editor/config';
import { EAppEvent, EventManager } from '../../editor/event';
import { AppError, ASSERT } from '../../runtime/util/error_util';
import { LOG } from '../../runtime/util/log_util';
import { doWork } from './worker';
// @ts-ignore
import AppWorker from './worker_interface.worker.ts';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';

export type TWorkerJob = {
    id: string,
    payload: TToWorkerMessage,
    callback?: (payload: TFromWorkerMessage) => void, // Called with the payload of the next message received by the worker
}

export class WorkerController {
    private _worker?: Worker;
    private _jobQueue: TWorkerJob[];
    private _jobPending: TWorkerJob | undefined;
    private _jobStartTime: number;
    private _timerOn: boolean;

    public constructor() {
        if (AppConfig.Get.USE_WORKER_THREAD) {
            this._worker = new AppWorker();
            if (this._worker) {
                this._worker.onmessage = this._onWorkerMessage.bind(this);
            }
        }

        this._jobQueue = [];
        this._jobStartTime = 0;
        this._timerOn = false;
    }

    public async execute(payload: TToWorkerMessage): Promise<TFromWorkerMessage> {
        return new Promise((res, rej) => {
            const success = this.addJob({
                id: 'ExecuteJob',
                payload: payload,
                callback: res,
            });
            ASSERT(success, 'Already performing a job');
        });
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
        return this._jobPending !== undefined && AppConfig.Get.USE_WORKER_THREAD;
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

        let endTimer = true;
        if (payload.data.action === 'RenderNextVoxelMeshChunk') {
            if (payload.data.result.moreVoxelsToBuffer) {
                endTimer = false;
            }
        } else if (payload.data.action === 'RenderNextBlockMeshChunk') {
            if (payload.data.result.moreBlocksToBuffer) {
                endTimer = false;
            }
        }

        if (endTimer) {
            const deltaTime = Date.now() - this._jobStartTime;
            LOG(`[WorkerController]: '${this._jobPending.id}' completed in ${deltaTime}ms`);
            this._timerOn = false;
        }

        if (this._jobPending.callback) {
            this._jobPending.callback(payload.data);
        }
        this._jobPending = undefined;

        this._tryStartNextJob();
    }

    private _tryStartNextJob() {
        if (this.isBusy()) {
            return;
        }

        this._jobPending = this._jobQueue.shift();
        if (this._jobPending === undefined) {
            return;
        }

        if (!this._timerOn) {
            LOG(`[WorkerController]: Starting Job '${this._jobPending.id}' (${this._jobQueue.length} remaining)`);
            LOG(`[WorkerController]: ${JSON.stringify(this._jobPending.payload, null, 4)}`);
            this._jobStartTime = Date.now();
            this._timerOn = true;
        }

        if (AppConfig.Get.USE_WORKER_THREAD) {
            ASSERT(this._worker !== undefined, 'No worker instance');
            this._worker.postMessage(this._jobPending.payload);
        } else {
            const pendingJob = this._jobPending;

            doWork(this._jobPending.payload).then((result) => {
                if (pendingJob.callback) {
                    pendingJob.callback(result);
                }
            });
        }
    }
}
