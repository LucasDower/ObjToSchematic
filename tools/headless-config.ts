export const headlessConfig = {
    import: {
        absoluteFilePathLoad: 'C:/Users/<Username>/Desktop/MyModel.obj', // Must be an absolute path to the file (can be anywhere)
    },
    voxelise: {
        voxeliser: 'raybased', // 'raybased' / 'ncrb'
        voxeliseParams: {
            desiredHeight: 80, // 5-320 inclusive
            useMultisampleColouring: false,
            textureFiltering: 'linear', // 'linear' / 'nearest'
        },
    },
    palette: {
        blockMeshParams: {
            textureAtlas: 'vanilla', // Must be an atlas name that exists in /resources/atlases
            blockPalette: 'all-snapshot', // Must be a palette name that exists in /resources/palettes
            ditheringEnabled: true,
            colourSpace: 'rgb', // 'rgb' / 'lab';
            fallable: 'replace-falling', // 'replace-fallable' / 'place-string';
        },
    },
    export: {
        absoluteFilePathSave: 'C:/Users/<Username>/AppData//Roaming/.minecraft/schematics/MySchematic.schematic', // Must be an absolute path to the file (can be anywhere)
        exporter: 'schematic', // 'schematic' / 'litematic',
    },
};
