import { ProgressManager } from '../progress';
import { StatusHandler } from '../status';
import { LOG_ERROR } from '../../../Core/src/util/log_util';
import { WorkerClient } from './worker_client';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';
import { AppError } from '../util/editor_util';

export async function doWork(message: TToWorkerMessage): Promise<TFromWorkerMessage> {
    StatusHandler.Get.clear();

    if (message.action !== 'RenderNextVoxelMeshChunk' && message.action !== 'RenderNextBlockMeshChunk') {
        ProgressManager.Get.clear();
    }

    try {
        switch (message.action) {
            case 'Init':
                return Promise.resolve({
                    action: 'Init',
                    result: WorkerClient.Get.init(message.params),
                    messages: StatusHandler.getAll(),
                });
            case 'Settings': {
                const result = await WorkerClient.Get.settings(message.params);

                return Promise.resolve({
                    action: 'Settings',
                    result: result,
                    messages: StatusHandler.getAll(),
                });
            }
            case 'Import':
                const result = await WorkerClient.Get.import(message.params);

                return Promise.resolve({
                    action: 'Import',
                    result: result,
                    messages: StatusHandler.getAll(),
                });
            case 'SetMaterials':
                return Promise.resolve({
                    action: 'SetMaterials',
                    result: WorkerClient.Get.setMaterials(message.params),
                    messages: StatusHandler.getAll(),
                });
            case 'RenderMesh':
                return Promise.resolve({
                    action: 'RenderMesh',
                    result: WorkerClient.Get.renderMesh(message.params),
                    messages: StatusHandler.getAll(),
                });
            case 'Voxelise':
                return Promise.resolve({
                    action: 'Voxelise',
                    result: WorkerClient.Get.voxelise(message.params),
                    messages: StatusHandler.getAll(),
                });
            /*
            case 'RenderVoxelMesh':
                return {
                    action: 'RenderVoxelMesh',
                    result: WorkerClient.Get.renderVoxelMesh(message.params),
                    messages: StatusHandler.getAll(),
                };
            */
            case 'RenderNextVoxelMeshChunk':
                return Promise.resolve({
                    action: 'RenderNextVoxelMeshChunk',
                    result: WorkerClient.Get.renderChunkedVoxelMesh(message.params),
                    messages: StatusHandler.getAll(),
                });
            case 'Assign':
                return Promise.resolve({
                    action: 'Assign',
                    result: WorkerClient.Get.assign(message.params),
                    messages: StatusHandler.getAll(),
                });
            /*
            case 'RenderBlockMesh':
                return {
                    action: 'RenderBlockMesh',
                    result: WorkerClient.Get.renderBlockMesh(message.params),
                    messages: StatusHandler.getAll(),
                };
                */
            case 'RenderNextBlockMeshChunk':
                return Promise.resolve({
                    action: 'RenderNextBlockMeshChunk',
                    result: WorkerClient.Get.renderChunkedBlockMesh(message.params),
                    messages: StatusHandler.getAll(),
                });
            case 'Export':
                return Promise.resolve({
                    action: 'Export',
                    result: WorkerClient.Get.export(message.params),
                    messages: StatusHandler.getAll(),
                });
        }
    } catch (e: any) {
        LOG_ERROR(e);
        return { action: e instanceof AppError ? 'KnownError' : 'UnknownError', error: e as Error };
    }
}

