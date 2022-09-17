import { AppPaths, PathUtil } from '../src/util/path_util';
import { WorkerClient } from '../src/worker_client';
import { headlessConfig } from '../tools/headless-config';
import { TEST_PREAMBLE } from './preamble';

test('Schematic-friendly Palette', () => {
    TEST_PREAMBLE();

    const config = headlessConfig;

    config.import.filepath = PathUtil.join(AppPaths.Get.resources, './samples/skull.obj');
    config.assign.blockPalette = 'schematic-friendly';

    const worker = WorkerClient.Get;
    worker.import(headlessConfig.import);
    worker.voxelise(headlessConfig.voxelise);
    worker.assign(headlessConfig.assign);
});
