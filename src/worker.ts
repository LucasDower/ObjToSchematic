import { ProgressManager } from './progress';
import { StatusHandler } from './status';
import { AppError } from './util/error_util';
import { WorkerClient } from './worker_client';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';

export function doWork(message: TToWorkerMessage): TFromWorkerMessage {
    StatusHandler.Get.clear();

    if (message.action !== 'RenderNextVoxelMeshChunk' && message.action !== 'RenderNextBlockMeshChunk') {
        ProgressManager.Get.clear();
    }

    try {
        switch (message.action) {
            case 'Init':
                return {
                    action: 'Init',
                    result: WorkerClient.Get.init(message.params),
                    messages: StatusHandler.getAll(),
                };
            case 'Import':
                return {
                    action: 'Import',
                    result: WorkerClient.Get.import(message.params),
                    messages: StatusHandler.getAll(),
                };
            case 'SetMaterials':
                return {
                    action: 'SetMaterials',
                    result: WorkerClient.Get.setMaterials(message.params),
                    messages: StatusHandler.getAll(),
                };
            case 'RenderMesh':
                return {
                    action: 'RenderMesh',
                    result: WorkerClient.Get.renderMesh(message.params),
                    messages: StatusHandler.getAll(),
                };
            case 'Voxelise':
                return {
                    action: 'Voxelise',
                    result: WorkerClient.Get.voxelise(message.params),
                    messages: StatusHandler.getAll(),
                };
            /*
            case 'RenderVoxelMesh':
                return {
                    action: 'RenderVoxelMesh',
                    result: WorkerClient.Get.renderVoxelMesh(message.params),
                    messages: StatusHandler.getAll(),
                };
            */
            case 'RenderNextVoxelMeshChunk':
                return {
                    action: 'RenderNextVoxelMeshChunk',
                    result: WorkerClient.Get.renderChunkedVoxelMesh(message.params),
                    messages: StatusHandler.getAll(),
                };
            case 'Assign':
                return {
                    action: 'Assign',
                    result: WorkerClient.Get.assign(message.params),
                    messages: StatusHandler.getAll(),
                };
            /*
            case 'RenderBlockMesh':
                return {
                    action: 'RenderBlockMesh',
                    result: WorkerClient.Get.renderBlockMesh(message.params),
                    messages: StatusHandler.getAll(),
                };
                */
            case 'RenderNextBlockMeshChunk':
                return {
                    action: 'RenderNextBlockMeshChunk',
                    result: WorkerClient.Get.renderChunkedBlockMesh(message.params),
                    messages: StatusHandler.getAll(),
                };
            case 'Export':
                return {
                    action: 'Export',
                    result: WorkerClient.Get.export(message.params),
                    messages: StatusHandler.getAll(),
                };
        }
    } catch (e: any) {
        return { action: e instanceof AppError ? 'KnownError' : 'UnknownError', error: e as Error };
    }
}

