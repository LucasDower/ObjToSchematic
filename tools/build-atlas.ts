import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { ASSERT } from '../src/runtime/util/error_util';
import { RGBAUtil } from '../src/runtime/colour';
import { RGBA } from '../src/runtime/colour';

export function getAverageColour(image: Uint8ClampedArray): RGBA {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let weight = 0;
    for (let x = 0; x < 16; ++x) {
        for (let y = 0; y < 16; ++y) {
            const index = 4 * (16 * y + x);
            const rgba = image.slice(index, index + 4);
            const alpha = rgba[3] / 255;
            r += (rgba[0] / 255) * alpha;
            g += (rgba[1] / 255) * alpha;
            b += (rgba[2] / 255) * alpha;
            a += alpha;
            weight += alpha;
        }
    }
    const numPixels = 16 * 16;
    return {
        r: r / weight,
        g: g / weight,
        b: b / weight,
        a: a / numPixels,
    };
}

export function getStandardDeviation(image: Uint8ClampedArray, average: RGBA): number {
    let squaredDist = 0.0;
    let weight = 0.0;
    for (let x = 0; x < 16; ++x) {
        for (let y = 0; y < 16; ++y) {
            const index = 4 * (16 * y + x);
            const rgba = image.slice(index, index + 4);
            const alpha = rgba[3] / 255;
            weight += alpha;
            const r = (rgba[0] / 255) * alpha;
            const g = (rgba[1] / 255) * alpha;
            const b = (rgba[2] / 255) * alpha;
            squaredDist += Math.pow(r - average.r, 2) + Math.pow(g - average.g, 2) + Math.pow(b - average.b, 2);
        }
    }
    return Math.sqrt(squaredDist / weight);
}

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

type FaceData<T> = {
    up: T,
    down: T,
    north: T,
    south: T,
    east: T,
    west: T,
}

// GO!

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


const atlasSize = Math.ceil(Math.sqrt(allTextures.size));
let nextAtlasColumn = 0;
let nextAtlasRow = 0;

const textureData = Array.from(allTextures)
    .map(async (texture) => {
        const shortName = texture.split('/')[1]; // Eww
        const texturePath = path.join(paths.textures, shortName + '.png');

        const image = sharp(texturePath);
        const imageData = Uint8ClampedArray.from(await image.raw().ensureAlpha(1.0).toBuffer()); // 16 x 16 x 4

        return {
            textureName: texture,
            texturePath: texturePath,
            image: image,
            imageData: imageData,
        }
    });

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

Promise.all(textureData)
    .then(async (res) => {
        const tmp = res
            .sort((a, b) => {
                return a.textureName < b.textureName ? -1 : 1;
            })
            .map(async (texture) => {
                const averageColour = getAverageColour(texture.imageData);
                const standardDeviation = getStandardDeviation(texture.imageData, averageColour);

                const atlasColumn = nextAtlasColumn;
                const atlasRow = nextAtlasRow;

                ++nextAtlasColumn;
                if (nextAtlasColumn >= atlasSize) {
                    ++nextAtlasRow;
                    nextAtlasColumn = 0;
                }

                return {
                    textureName: texture.textureName,
                    texturePath: texture.texturePath,
                    atlasColumn: atlasColumn,
                    atlasRow: atlasRow,
                    colour: averageColour,
                    std: standardDeviation,
                };
            });

        Promise.all(tmp)
            .then(async (data) => {
                const textureMap = new Map<string, Omit<ArrayElement<typeof data>, 'textureName' | 'texturePath'>>();
                data.forEach((texture) => {
                    textureMap.set(texture.textureName, {
                        atlasColumn: texture.atlasColumn,
                        atlasRow: texture.atlasRow,
                        colour: texture.colour,
                        std: texture.std,
                    });
                });

                const baseImage = await sharp({
                    create: {
                        width: atlasSize * 16 * 3,
                        height: atlasSize * 16 * 3,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 0.0 },
                    }
                });

                const compositeData: sharp.OverlayOptions[] = [];
                data.forEach((x) => {
                    for (let i = 0; i < 3; ++i) {
                        for (let j = 0; j < 3; ++j) {
                            compositeData.push({
                                input: x.texturePath,
                                blend: 'over',
                                left: (x.atlasColumn * 16) * 3 + 16 * i,
                                top: (x.atlasRow * 16) * 3 + 16 * j,
                            });
                        }
                    }
                })

                baseImage.composite(compositeData)
                    .toFile(path.join(paths.output, 'atlas.png'))
                    .then((res) => {
                        console.log('Done!');
                    })
                    .catch((err) => {
                        console.error(err);
                    });

                const blocks = loadedModels.map((model) => {
                    ASSERT(model !== null);

                    const faces = {
                        up: model.up,
                        down: model.down,
                        north: model.north,
                        south: model.south,
                        east: model.east,
                        west: model.west,
                    };

                    const faceColours = Object.values(faces).map((texture) => {
                        const textureData = textureMap.get(texture);
                        ASSERT(textureData !== undefined);
                        return textureData.colour;
                    });

                    return {
                        name: 'minecraft:' + model.modelFileName.split('.')[0],
                        faces: faces,
                        colour: RGBAUtil.average(...faceColours),
                    }
                });

                console.log(textureMap);

                const textures: Record<any, any> = {};
                textureMap.forEach((value, key) => {
                    textures[key] = value;
                });

                const atlasFile = {
                    formatVersion: 3,
                    atlasSize: atlasSize,
                    blocks: blocks,
                    textures: textures,
                }

                fs.writeFileSync(path.join(paths.output, 'atlas.atlas'), JSON.stringify(atlasFile, null, 4));
            });

    });