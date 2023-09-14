import { PALETTE_ALL_RELEASE } from '../res/palettes/all';
import { Vector3 } from '../src/runtime/vector';
import { THeadlessConfig } from './headless';

export const headlessConfig: THeadlessConfig = {
    import: {
        file: new File([], '/Users/lucasdower/ObjToSchematic/res/samples/skull.obj'),
        rotation: new Vector3(0, 0, 0),
    },
    voxelise: {
        constraintAxis: 'y',
        voxeliser: 'bvh-ray',
        size: 80,
        useMultisampleColouring: false,
        voxelOverlapRule: 'average',
        enableAmbientOcclusion: false, // Only want true if exporting to .obj
    },
    assign: {
        blockPalette: new Set(PALETTE_ALL_RELEASE), // Must be a palette name that exists in /resources/palettes
        dithering: 'ordered',
        ditheringMagnitude: 32,
        fallable: 'replace-falling',
        resolution: 32,
        calculateLighting: false,
        lightThreshold: 0,
        contextualAveraging: true,
        errorWeight: 0.0,
        atlasJSON: undefined,
    },
    export: {
        exporter: 'litematic', // 'schematic' / 'litematic',
    },
    debug: {
        showLogs: true,
        showWarnings: true,
        showTimings: true,
    },
};
