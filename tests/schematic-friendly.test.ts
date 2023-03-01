import fs from 'fs';

import { StatusHandler, StatusID } from '../src/status';
import { AppPaths, PathUtil } from '../src/util/path_util';
import { WorkerClient } from '../src/worker_client';
import { headlessConfig } from '../tools/headless-config';
import { TEST_PREAMBLE } from './preamble';

test('Schematic-friendly Palette', () => {
    TEST_PREAMBLE();

    const config = headlessConfig;

    config.import.fileSource = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, './samples/skull.obj'), 'utf-8');

    config.assign.blockPalette = 'schematic-friendly';
    config.export.exporter = 'schematic';
    config.export.filepath = PathUtil.join(AppPaths.Get.testData, '../out/friendly.schematic');

    const worker = WorkerClient.Get;
    worker.import(headlessConfig.import);
    worker.voxelise(headlessConfig.voxelise);
    worker.assign(headlessConfig.assign);
    worker.export(headlessConfig.export);

    expect(StatusHandler.Get.hasId(StatusID.SchematicUnsupportedBlocks)).toBe(false);
});
