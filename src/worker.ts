import { clamp } from './math';
import { WorkerClient } from './worker_client';
import { TToWorkerMessage, TFromWorkerMessage } from './worker_types';
import { StatusHandler } from './status';
import { AppError } from './util/error_util';

export function doWork(message: TToWorkerMessage): TFromWorkerMessage {
    StatusHandler.Get.clear();
    try {
        switch (message.action) {
            case 'Import':
                return {
                    action: 'Import',
                    result: WorkerClient.Get.import(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'RenderMesh':
                return {
                    action: 'RenderMesh',
                    result: WorkerClient.Get.renderMesh(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'Voxelise': 
                return {
                    action: 'Voxelise',
                    result: WorkerClient.Get.voxelise(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'RenderVoxelMesh':
                return {
                    action: 'RenderVoxelMesh',
                    result: WorkerClient.Get.renderVoxelMesh(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
        }
    } catch (e: any) {
        return { action: e instanceof AppError ? 'KnownError' : 'UnknownError', error: e as Error };
    }

    return { action: 'KnownError', error: new AppError('Worker could not handle message') };         

}
