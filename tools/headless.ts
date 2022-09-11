import { headlessConfig } from './headless-config';
import { AssignParams, ExportParams, ImportParams, VoxeliseParams } from '../src/worker_types';
import { WorkerClient } from '../src/worker_client';
import { StatusHandler } from '../src/status';
import { Logger, LOG_MAJOR } from '../src/util/log_util';

export type THeadlessConfig = {
    import: ImportParams.Input,
    voxelise: VoxeliseParams.Input,
    assign: AssignParams.Input,
    export: ExportParams.Input,
    debug: {
        logging: boolean,
    }
}

void async function main() {
    if (headlessConfig.debug.logging) {
        Logger.Get.enableLOGMAJOR();
    }

    const worker = WorkerClient.Get;
    {
        LOG_MAJOR('Importing...');
        worker.import(headlessConfig.import);
        StatusHandler.Get.dump().clear();
    }
    {
        LOG_MAJOR('Voxelising...');
        worker.voxelise(headlessConfig.voxelise);
        StatusHandler.Get.dump().clear();
    }
    {
        LOG_MAJOR('Assigning...');
        worker.assign(headlessConfig.assign);
        StatusHandler.Get.dump().clear();
    }
    {
        LOG_MAJOR('Exporting...');
        /**
         * The OBJExporter is unique in that it uses the actual render buffer used by WebGL
         * to create its data, in headless mode this render buffer is not created so we must
         * generate it manually
         */
        if (headlessConfig.export.exporter === 'obj') {
            worker.renderVoxelMesh({
                enableAmbientOcclusion: headlessConfig.voxelise.enableAmbientOcclusion,
                desiredHeight: headlessConfig.voxelise.desiredHeight,
            });
        }
        worker.export(headlessConfig.export);
        StatusHandler.Get.dump().clear();
    }
    LOG_MAJOR('Finished!');
}();
