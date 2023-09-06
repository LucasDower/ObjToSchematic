import { StatusHandler } from '../src/editor/status';
import { LOG_MAJOR, Logger, TIME_END, TIME_START } from '../src/runtime/util/log_util';
import { WorkerClient } from '../src/editor/worker/worker_client';
import { AssignParams, ExportParams, ImportParams, VoxeliseParams } from '../src/editor/worker/worker_types';

export type THeadlessConfig = {
    import: ImportParams.Input,
    voxelise: VoxeliseParams.Input,
    assign: AssignParams.Input,
    export: ExportParams.Input,
    debug: {
        showLogs: boolean,
        showWarnings: boolean,
        showTimings: boolean,
    }
}

export function runHeadless(headlessConfig: THeadlessConfig) {
    if (headlessConfig.debug.showLogs) {
        Logger.Get.enableLOGMAJOR();
    }
    if (headlessConfig.debug.showWarnings) {
        Logger.Get.enableLOGWARN();
    }
    if (headlessConfig.debug.showTimings) {
        Logger.Get.enableLOGTIME();
    }

    const worker = WorkerClient.Get;
    {
        TIME_START('[TIMER] Importer');
        LOG_MAJOR('\nImporting...');
        worker.import(headlessConfig.import);
        StatusHandler.Get.dump().clear();
        TIME_END('[TIMER] Importer');
    }
    {
        TIME_START('[TIMER] Voxeliser');
        LOG_MAJOR('\nVoxelising...');
        worker.voxelise(headlessConfig.voxelise);
        StatusHandler.Get.dump().clear();
        TIME_END('[TIMER] Voxeliser');
    }
    {
        TIME_START('[TIMER] Assigner');
        LOG_MAJOR('\nAssigning...');
        worker.assign(headlessConfig.assign);
        StatusHandler.Get.dump().clear();
        TIME_END('[TIMER] Assigner');
    }
    {
        TIME_START('[TIMER] Exporter');
        LOG_MAJOR('\nExporting...');

        /**
         * The OBJExporter is unique in that it uses the actual render buffer used by WebGL
         * to create its data, in headless mode this render buffer is not created so we must
         * generate it manually
         */
        {
            let result;
            do {
                result = worker.renderChunkedVoxelMesh({
                    enableAmbientOcclusion: headlessConfig.voxelise.enableAmbientOcclusion,
                    desiredHeight: headlessConfig.voxelise.size,
                });
            } while (result.moreVoxelsToBuffer);
        }

        worker.export(headlessConfig.export);
        StatusHandler.Get.dump().clear();
        TIME_END('[TIMER] Exporter');
    }
}
