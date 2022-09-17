import { WorkerClient } from '../src/worker_client';
import { headlessConfig } from '../tools/headless-config';
import { TEST_PREAMBLE } from './preamble';

test('Schematic-friendly Palette', () => {
    TEST_PREAMBLE();

    const worker = WorkerClient.Get;
    const config = headlessConfig;
    config.assign.blockPalette = 'schematic-friendly';

    worker.import(headlessConfig.import);
    worker.voxelise(headlessConfig.voxelise);
    worker.assign(headlessConfig.assign);
});
