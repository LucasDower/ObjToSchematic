import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import sharp, { block } from 'sharp';

import { ASSERT } from 'ots-core/src/util/error_util';
import { OtS_ColourAverager, RGBAUtil } from 'ots-core/src/colour';
import { RGBA } from 'ots-core/src/colour';
import { OtS_BlockDataBuilder } from '../../Core/src/ots_block_data_builder';

program
    .argument('<textures_directory>', 'The directory to load the blocks texture files from (assets/minecraft/textures/block)')
    .argument('<models_directory>', 'The directory to load the blocks model files from (assets/minecraft/models/block)')
    .argument('<output_directory>', 'The directory to write the texture atlas files to')
    .argument('<ignore_file_path>', 'Ignore file path')

program.parse();

const paths = {
    textures: program.args[0],
    models: program.args[1],
    output: program.args[2],
    ignore: program.args[3],
}

const ignoreList = new Set(fs.readFileSync(paths.ignore, 'utf8').split(/\r?\n/));

// Load all models to use
const allModels = fs.readdirSync(paths.models);
const loadedModels = allModels
    // Remove ignored models
    .filter((modelFileName) => {
        return !ignoreList.has(modelFileName);
    })
    // Get each models content
    .map((modelFileName) => {
        const modelFilePath = path.join(paths.models, modelFileName);
        const fileContents = fs.readFileSync(modelFilePath, 'utf8');
        const model = JSON.parse(fileContents);

        switch (model.parent) {
            case 'minecraft:block/cube_column_horizontal':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.side,
                    down: model.textures.side,
                    north: model.textures.end,
                    south: model.textures.end,
                    east: model.textures.side,
                    west: model.textures.side,
                };
            case 'minecraft:block/cube_all':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.all,
                    down: model.textures.all,
                    north: model.textures.all,
                    south: model.textures.all,
                    east: model.textures.all,
                    west: model.textures.all,
                };
            case 'minecraft:block/cube_column':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.end,
                    down: model.textures.end,
                    north: model.textures.side,
                    south: model.textures.side,
                    east: model.textures.side,
                    west: model.textures.side,
                };
            case 'minecraft:block/cube_bottom_top':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.top,
                    down: model.textures.bottom,
                    north: model.textures.side,
                    south: model.textures.side,
                    east: model.textures.side,
                    west: model.textures.side,
                };
            case 'minecraft:block/cube':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.up,
                    down: model.textures.down,
                    north: model.textures.north,
                    south: model.textures.south,
                    east: model.textures.east,
                    west: model.textures.west,
                };
            case 'minecraft:block/template_single_face':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.texture,
                    down: model.textures.texture,
                    north: model.textures.texture,
                    south: model.textures.texture,
                    east: model.textures.texture,
                    west: model.textures.texture,
                };
            case 'minecraft:block/template_glazed_terracotta':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.pattern,
                    down: model.textures.pattern,
                    north: model.textures.pattern,
                    south: model.textures.pattern,
                    east: model.textures.pattern,
                    west: model.textures.pattern,
                };
            case 'minecraft:block/leaves':
                return {
                    modelFileName: modelFileName,
                    up: model.textures.all,
                    down: model.textures.all,
                    north: model.textures.all,
                    south: model.textures.all,
                    east: model.textures.all,
                    west: model.textures.all,
                };
            default:
                return null;
        }
    }, [])
    .filter((entry) => {
        return entry !== null;
    });

const allTextures = new Set<string>();
loadedModels.forEach((model) => {
    allTextures.add(model?.up);
    allTextures.add(model?.down);
    allTextures.add(model?.east);
    allTextures.add(model?.west);
    allTextures.add(model?.north);
    allTextures.add(model?.south);
});

const blockDataBuilder = OtS_BlockDataBuilder.Create();

(async () => {
    for (const texture of Array.from(allTextures)) {
        const shortName = texture.split('/')[1]; // Eww
        const texturePath = path.join(paths.textures, shortName + '.png');
    
        const image = sharp(texturePath);
        const imageData = Uint8ClampedArray.from(await image.raw().ensureAlpha(1.0).toBuffer()); // 16 x 16 x 4
    
        blockDataBuilder.registerTexture(texture, imageData);
    }
    
    loadedModels.forEach((model) => {
        ASSERT(model);
        const shortName = 'minecraft:' + model.modelFileName.split('.')[0]; // Eww
        blockDataBuilder.registerBlock(shortName, {
            up: model.up,
            down: model.down,
            east: model.east,
            west: model.west,
            north: model.west,
            south: model.south,
        });
    })
    
    const perBlockData = blockDataBuilder.process('per-block');
    const perFaceData = blockDataBuilder.process('per-face');
    
    fs.writeFileSync(path.join(paths.output, 'default_per_block.json'), JSON.stringify(perBlockData), 'utf8');
    fs.writeFileSync(path.join(paths.output, 'default_per_face.json'), JSON.stringify(perFaceData), 'utf8');
})();

