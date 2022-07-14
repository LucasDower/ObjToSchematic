import { THeadlessConfig } from './headless';
import { TextureFiltering } from '../src/texture';
import { ColourSpace } from '../src/util';

export const headlessConfig: THeadlessConfig = {
    import: {
        absoluteFilePathLoad: 'C:/Users/<username>/Desktop/my_model.obj', // Must be an absolute path to the file (can be anywhere)
    },
    voxelise: {
        voxeliser: 'bvh-ray',
        voxelMeshParams: {
            desiredHeight: 80, // 5-320 inclusive
            useMultisampleColouring: false,
            textureFiltering: TextureFiltering.Linear,
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
        absoluteFilePathSave: 'C:/Users/Lucas/Desktop/my_structure.schematic', // Must be an absolute path to the file (can be anywhere)
        exporter: 'schematic', // 'schematic' / 'litematic',
    },
};
