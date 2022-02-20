import { LOG, RGB, UV } from '../src/util';
import { log, logBreak, LogStyle } from './logging';
import { isDirSetup, ASSERT, getAverageColour, getPermission } from './misc';

import fs from 'fs';
import path from 'path';
import images from 'images';
import { PNG } from 'pngjs';
import chalk from 'chalk';
import prompt from 'prompt';
const AdmZip = require('adm-zip');
const copydir = require('copy-dir');

void async function main() {
    await getPermission();
    logBreak();
    await fetchModelsAndTextures();
    await buildAtlas();
}();

async function getResourcePack() {
    const resourcePacksDir = path.join(process.env.APPDATA!, './.minecraft/resourcepacks');
    if (!fs.existsSync(resourcePacksDir)) {
        log(LogStyle.Failure, 'Could not find .minecraft/resourcepacks\n');
        process.exit(1);
    }

    log(LogStyle.Info, 'Looking for resource packs...');
    const resourcePacks = fs.readdirSync(resourcePacksDir);
    log(LogStyle.None, `1) Vanilla`);
    for (let i = 0; i < resourcePacks.length; ++i) {
        log(LogStyle.None, `${i+2}) ${resourcePacks[i]}`);
    }

    const { packChoice } = await prompt.get({
        properties: {
            packChoice: {
                description: `Which resource pack do you want to build an atlas for? (1-${resourcePacks.length+1})`,
                message: `Response must be between 1 and ${resourcePacks.length+1}`,
                required: true,
                conform: (value) => {
                    return value >= 1 && value <= resourcePacks.length + 1;
                },
            },
        },
    });
    if (<number>packChoice == 1) {
        return 'Vanilla';
    }
    return resourcePacks[(<number>packChoice) - 2];
}

function fetchVanillModelsAndTextures(fetchTextures: boolean) {
    const versionsDir = path.join(process.env.APPDATA!, './.minecraft/versions');
    ASSERT(fs.existsSync(versionsDir), 'Could not find .minecraft/versions');
    log(LogStyle.Info, '.minecraft/versions found successfully');

    const versions = fs.readdirSync(versionsDir)
        .filter((file) => fs.lstatSync(path.join(versionsDir, file)).isDirectory())
        .map((file) => ({ file, birthtime: fs.lstatSync(path.join(versionsDir, file)).birthtime }))
        .sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());

    for (let i = 0; i < versions.length; ++i) {
        const versionName = versions[i].file;
        log(LogStyle.Info, `Searching in ${versionName} for ${versionName}.jar`);

        const versionDir = path.join(versionsDir, versionName);
        const versionFiles = fs.readdirSync(versionDir);
        if (!versionFiles.includes(versionName + '.jar')) {
            continue;
        }
        log(LogStyle.Success, `Found ${versionName}.jar successfully\n`);

        const versionJarPath = path.join(versionDir, `${versionName}.jar`);

        log(LogStyle.Info, `Upzipping ${versionName}.jar...`);
        const zip = new AdmZip(versionJarPath);
        const zipEntries = zip.getEntries();
        zipEntries.forEach((zipEntry: any) => {
            if (fetchTextures && zipEntry.entryName.startsWith('assets/minecraft/textures/block')) {
                zip.extractEntryTo(zipEntry.entryName, path.join(__dirname, './blocks'), false, true);
            } else if (zipEntry.entryName.startsWith('assets/minecraft/models/block')) {
                zip.extractEntryTo(zipEntry.entryName, path.join(__dirname, './models'), false, true);
            }
        });
        log(LogStyle.Success, `Extracted textures and models successfully\n`);
        return;
    }
}

async function fetchModelsAndTextures() {
    const resourcePack = await getResourcePack();
    logBreak();
    const fetchVanillaTextures = resourcePack === 'Vanilla';
    await fetchVanillModelsAndTextures(fetchVanillaTextures);
    if (resourcePack === 'Vanilla') {
        return;
    }

    log(LogStyle.Warning, 'Non-16x16 texture packs are not supported');

    const resourcePackDir = path.join(process.env.APPDATA!, './.minecraft/resourcepacks', resourcePack);
    if (fs.lstatSync(resourcePackDir).isDirectory()) {
        log(LogStyle.Info, `Resource pack '${resourcePack}' is a directory`);
        const blockTexturesSrc = path.join(resourcePackDir, 'assets/minecraft/textures/block');
        const blockTexturesDst = path.join(__dirname, '../tools/blocks');
        log(LogStyle.Info, `Copying ${blockTexturesSrc} to ${blockTexturesDst}`);
        copydir(blockTexturesSrc, blockTexturesDst, {
            utimes: true,
            mode: true,
            cover: true,
        });
        log(LogStyle.Success, `Copied block textures successfully`);
    } else {
        log(LogStyle.Info, `Resource pack '${resourcePack}' is not a directory, expecting to be a .zip`);
        
        const zip = new AdmZip(resourcePackDir);
        const zipEntries = zip.getEntries();
        zipEntries.forEach((zipEntry: any) => {
            if (zipEntry.entryName.startsWith('assets/minecraft/textures/block')) {
                zip.extractEntryTo(zipEntry.entryName, path.join(__dirname, './blocks'), false, true);
            }
        });
        log(LogStyle.Success, `Copied block textures successfully`);
        return;
    }
}

async function buildAtlas() {
    // Check /blocks and /models is setup correctly
    logBreak();
    log(LogStyle.Info, 'Checking assets are provided...');   
    
    const texturesDirSetup = isDirSetup('./models', 'assets/minecraft/textures/block');
    ASSERT(texturesDirSetup, '/blocks is not setup correctly');
    log(LogStyle.Success, '/tools/blocks/ setup correctly');   
    
    const modelsDirSetup = isDirSetup('./models', 'assets/minecraft/models/block');
    ASSERT(modelsDirSetup, '/models is not setup correctly');
    log(LogStyle.Success, '/tools/models/ setup correctly');   

    // Load the ignore list
    logBreak();
    log(LogStyle.Info, 'Loading ignore list...');
    let ignoreList: Array<string> = [];
    const ignoreListPath = path.join(__dirname, './ignore-list.txt');
    if (fs.existsSync(ignoreListPath)) {
        log(LogStyle.Success, 'Found ignore list');
        ignoreList = fs.readFileSync(ignoreListPath, 'utf-8').replace(/\r/g, '').split('\n');
    } else {
        log(LogStyle.Warning, 'No ignore list found, looked for ignore-list.txt');
    }
    log(LogStyle.Success, `${ignoreList.length} blocks found in ignore list\n`);

    /* eslint-disable */
    enum parentModel {
        Cube = 'minecraft:block/cube',
        CubeAll = 'minecraft:block/cube_all',
        CubeColumn = 'minecraft:block/cube_column',
        CubeColumnHorizontal = 'minecraft:block/cube_column_horizontal',
        TemplateSingleFace = 'minecraft:block/template_single_face',
        TemplateGlazedTerracotta = 'minecraft:block/template_glazed_terracotta',
    }
    /* eslint-enable */
    
    interface Model {
        name: string,
        colour?: RGB,
        faces: {
            [face: string]: Texture
        }
    }
    
    interface Texture {
        name: string,
        texcoord?: UV,
        colour?: RGB
    }
    
    log(LogStyle.Info, 'Loading block models...');
    const faces = ['north', 'south', 'up', 'down', 'east', 'west'];
    const allModels: Array<Model> = [];
    const usedTextures: Set<string> = new Set();
    fs.readdirSync(path.join(__dirname, './models')).forEach((filename) => {
        if (path.extname(filename) !== '.json') {
            return;
        };

        const filePath = path.join(__dirname, './models', filename);
        const fileData = fs.readFileSync(filePath, 'utf8');
        const modelData = JSON.parse(fileData);
        const parsedPath = path.parse(filePath);
        const modelName = parsedPath.name;

        if (ignoreList.includes(filename)) {
            return;
        }

        let faceData: { [face: string]: Texture } = {};
        switch (modelData.parent) {
        case parentModel.CubeAll:
            faceData = {
                up: { name: modelData.textures.all },
                down: { name: modelData.textures.all },
                north: { name: modelData.textures.all },
                south: { name: modelData.textures.all },
                east: { name: modelData.textures.all },
                west: { name: modelData.textures.all },
            };
            break;
        case parentModel.CubeColumn:
            faceData = {
                up: { name: modelData.textures.end },
                down: { name: modelData.textures.end },
                north: { name: modelData.textures.side },
                south: { name: modelData.textures.side },
                east: { name: modelData.textures.side },
                west: { name: modelData.textures.side },
            };
            break;
        case parentModel.Cube:
            faceData = {
                up: { name: modelData.textures.up },
                down: { name: modelData.textures.down },
                north: { name: modelData.textures.north },
                south: { name: modelData.textures.south },
                east: { name: modelData.textures.east },
                west: { name: modelData.textures.west },
            };
            break;
        case parentModel.TemplateSingleFace:
            faceData = {
                up: { name: modelData.textures.texture },
                down: { name: modelData.textures.texture },
                north: { name: modelData.textures.texture },
                south: { name: modelData.textures.texture },
                east: { name: modelData.textures.texture },
                west: { name: modelData.textures.texture },
            };
            break;
        case parentModel.TemplateGlazedTerracotta:
            faceData = {
                up: { name: modelData.textures.pattern },
                down: { name: modelData.textures.pattern },
                north: { name: modelData.textures.pattern },
                south: { name: modelData.textures.pattern },
                east: { name: modelData.textures.pattern },
                west: { name: modelData.textures.pattern },
            };
            break;
        default:
            return;
        }

        for (const face of faces) {
            usedTextures.add(faceData[face].name);
        }

        allModels.push({
            name: modelName,
            faces: faceData,
        });
    });
    if (allModels.length === 0) {
        log(LogStyle.Failure, 'No blocks loaded');
        process.exit(0);
    }
    log(LogStyle.Success, `${allModels.length} blocks loaded\n`);

    const atlasSize = Math.ceil(Math.sqrt(usedTextures.size));
    const atlasWidth = atlasSize * 16;

    let offsetX = 0;
    let offsetY = 0;
    const outputImage = images(atlasWidth * 3, atlasWidth * 3);

    const textureDetails: { [textureName: string]: { texcoord: UV, colour: RGB } } = {};

    const { atlasName } = await prompt.get({
        properties: {
            atlasName: {
                pattern: /^[a-zA-Z\-]+$/,
                description: 'What do you want to call this texture atlas?',
                message: 'Name must only be letters or dash',
                required: true,
            },
        },
    });

    log(LogStyle.Info, `Building ${atlasName}.png...`);
    usedTextures.forEach((textureName) => {
        const shortName = textureName.split('/')[1]; // Eww
        const absolutePath = path.join(__dirname, './blocks', shortName + '.png');
        const fileData = fs.readFileSync(absolutePath);
        const pngData = PNG.sync.read(fileData);
        const image = images(absolutePath);

        for (let x = 0; x < 3; ++x) {
            for (let y = 0; y < 3; ++y) {
                outputImage.draw(image, 16 * (3 * offsetX + x), 16 * (3 * offsetY + y));
            }
        }

        textureDetails[textureName] = {
            texcoord: {
                u: 16 * (3 * offsetX + 1) / (atlasWidth * 3),
                v: 16 * (3 * offsetY + 1) / (atlasWidth * 3),
            },
            colour: getAverageColour(pngData),
        },

        ++offsetX;
        if (offsetX >= atlasSize) {
            ++offsetY;
            offsetX = 0;
        }
    });


    // Build up the output JSON
    log(LogStyle.Info, `Building ${atlasName}.atlas...\n`);
    for (const model of allModels) {
        const blockColour = new RGB(0, 0, 0);
        for (const face of faces) {
            const faceTexture = textureDetails[model.faces[face].name];
            const faceColour = faceTexture.colour;
            blockColour.r += faceColour.r;
            blockColour.g += faceColour.g;
            blockColour.b += faceColour.b;
            model.faces[face].texcoord = faceTexture.texcoord;
        }
        blockColour.r /= 6;
        blockColour.g /= 6;
        blockColour.b /= 6;
        model.colour = blockColour;
    }


    log(LogStyle.Info, 'Exporting...');
    const atlasDir = path.join(__dirname, `../resources/atlases/${atlasName}.png`);
    outputImage.save(atlasDir);
    log(LogStyle.Success, `${atlasName}.png exported to /resources/atlases/`);
    const outputJSON = {
        atlasSize: atlasSize,
        atlasTexture: atlasDir,
        blocks: allModels,
    };
    fs.writeFileSync(path.join(__dirname, `../resources/atlases/${atlasName}.atlas`), JSON.stringify(outputJSON, null, 4));
    log(LogStyle.Success, `${atlasName}.atlas exported to /resources/atlases/\n`);

    /* eslint-disable */
    console.log(chalk.cyanBright(chalk.inverse('DONE') + ' Now run ' + chalk.inverse(' npm start ') + ' and the new texture atlas can be used'));
    /* eslint-enable */
}
