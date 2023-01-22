import { ColourSpace } from '../src/util';
import { AppPaths, PathUtil } from '../src/util/path_util';
import { Vector3 } from '../src/vector';
import { runHeadless, THeadlessConfig } from '../tools/headless';
import { TEST_PREAMBLE } from './preamble';

const baseConfig: THeadlessConfig = {
    import: {
        filepath: '', // Must be an absolute path
        rotation: new Vector3(0, 0, 0),
    },
    voxelise: {
        voxeliser: 'bvh-ray',
        constraintAxis: 'y',
        size: 80,
        useMultisampleColouring: false,
        voxelOverlapRule: 'average',
        enableAmbientOcclusion: false, // Only want true if exporting to .obj
    },
    assign: {
        textureAtlas: 'vanilla', // Must be an atlas name that exists in /resources/atlases
        blockPalette: 'all-snapshot', // Must be a palette name that exists in /resources/palettes
        dithering: 'ordered',
        colourSpace: ColourSpace.RGB,
        fallable: 'replace-falling',
        resolution: 32,
        calculateLighting: false,
        lightThreshold: 0,
        contextualAveraging: true,
        errorWeight: 0.0,
    },
    export: {
        filepath: '', // Must be an absolute path to the file (can be anywhere)
        exporter: 'obj', // 'schematic' / 'litematic',
    },
    debug: {
        showLogs: false,
        showWarnings: false,
        showTimings: false,
    },
};

test('FULL Obj->Obj', () => {
    TEST_PREAMBLE();

    const config: THeadlessConfig = baseConfig;

    config.import.filepath = PathUtil.join(AppPaths.Get.resources, './samples/skull.obj');
    config.export.exporter = 'litematic';
    config.export.filepath = PathUtil.join(AppPaths.Get.testData, '../out/out.litematic');

    runHeadless(config);
});
