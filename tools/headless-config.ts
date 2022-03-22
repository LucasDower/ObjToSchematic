export const headlessConfig = {
    import: {
        absoluteFilePathLoad: 'C:/Users/<Username>/Desktop/MyModel.obj', // Must be an absolute path to the file (can be anywhere)
    },
    voxelise: {
        voxeliser: 'rb', // 'raybased' / 'ncrb'
        voxelMeshParams: {
            desiredHeight: 105, // 5-320 inclusive
            useMultisampleColouring: false,
            textureFiltering: 'linear', // 'linear' / 'nearest'
        },
    },
    palette: {
        blockMeshParams: {
            textureAtlas: 'vanilla', // Must be an atlas name that exists in /resources/atlases
            blockPalette: 'all-supported', // Must be a palette name that exists in /resources/palettes
            ditheringEnabled: true,
            colourSpace: 'rgb', // 'rgb' / 'lab';
        },
    },
    export: {
        absoluteFilePathSave: 'C://Users//<Username>//AppData//Roaming//.minecraft//schematics', // Must be an absolute path to the file (can be anywhere)
        exporter: 'schematic', // 'schematic' / 'litematic',
    },
};
