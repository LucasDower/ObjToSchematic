import { THeadlessConfig } from './headless';
import { TVoxelisers } from '../src/voxelisers/voxelisers';
import { TextureFiltering } from '../src/texture';
import { ColourSpace } from '../src/util';

export const headlessConfig: THeadlessConfig = {
    import: {
        absoluteFilePathLoad: 'C:/Users/<Username>/Desktop/MyModel.obj', // Must be an absolute path to the file (can be anywhere)
    },
    voxelise: {
        voxeliser: 'bvh-ray',
        voxeliseParams: {
            desiredHeight: 80, // 5-320 inclusive
            useMultisampleColouring: false,
            textureFiltering: 'linear',
            voxelOverlapRule: 'average',
        },
    },
    palette: {
        blockMeshParams: {
            textureAtlas: 'vanilla', // Must be an atlas name that exists in /resources/atlases
            blockPalette: 'all-snapshot', // Must be a palette name that exists in /resources/palettes
            blockAssigner: 'ordered-dithering',
            colourSpace: ColourSpace.RGB,
            fallable: 'replace-falling',
        },
    },
    export: {
        absoluteFilePathSave: 'C:/Users/<Username>/AppData//Roaming/.minecraft/schematics/MySchematic.schematic', // Must be an absolute path to the file (can be anywhere)
        exporter: 'schematic', // 'schematic' / 'litematic',
    },
};
