// import images from 'images';
// import path from 'path';
// import prompt from 'prompt';

// import { RGBA, RGBAUtil } from '../src/colour';
// import { AppUtil } from '../src/util';
// import { LOG, LOG_WARN, Logger } from '../src/util/log_util';

// const AdmZip = require('adm-zip');
// const copydir = require('copy-dir');

// import { AppPaths, PathUtil } from '../src/util/path_util';
// import { log } from './logging';
// import { ASSERT_EXISTS, getAverageColour, getMinecraftDir, getStandardDeviation } from './misc';

// const BLOCKS_DIR = PathUtil.join(AppPaths.Get.tools, '/blocks');
// const MODELS_DIR = PathUtil.join(AppPaths.Get.tools, '/models');

// type TFaceData<T> = {
//     up: T,
//     down: T,
//     north: T,
//     south: T,
//     east: T,
//     west: T,
// }

// export type TAtlasVersion = {
//     formatVersion: 3,
//     atlasSize: number,
//     blocks: Array<{ name: string, faces: TFaceData<string>, colour: RGBA }>,
//     textures: { [texture: string]: { atlasColumn: number, atlasRow: number, colour: RGBA, std: number } },
//     supportedBlockNames: string[],
// };

// void async function main() {
//     AppPaths.Get.setBaseDir(PathUtil.join(__dirname, '../..'));
//     Logger.Get.enableLogToFile();
//     Logger.Get.initLogFile('atlas');

//     const minecraftDir = getMinecraftDir();

//     // Clean up temporary data from previous use
//     {
//         fs.rmSync(BLOCKS_DIR, { recursive: true, force: true });
//         fs.rmSync(MODELS_DIR, { recursive: true, force: true });
//     }

//     // Ask for permission to access Minecraft dir
//     {
//         log('Prompt', `This script requires files inside '${minecraftDir}'`);

//         const { permission } = await prompt.get({
//             properties: {
//                 permission: {
//                     pattern: /^[YyNn]$/,
//                     description: 'Do you give permission to access these files? (y/n)',
//                     message: 'Response must be Y or N',
//                     required: true,
//                 },
//             },
//         });

//         const isResponseYes = ['Y', 'y'].includes(permission as string);
//         if (!isResponseYes) {
//             process.exit(0);
//         }
//     }

//     ASSERT_EXISTS(minecraftDir);

//     // Prompt user to pick a version
//     let chosenVersionName: string;
//     let chosenVersionDir: string;
//     {
//         const versionsDir = PathUtil.join(minecraftDir, '/versions');
//         ASSERT_EXISTS(versionsDir);

//         const versions = fs.readdirSync(versionsDir)
//             .filter((file) => fs.lstatSync(PathUtil.join(versionsDir, file)).isDirectory())
//             .map((file) => ({ file, birthtime: fs.lstatSync(PathUtil.join(versionsDir, file)).birthtime }))
//             .sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());
//         {
//             versions.forEach((version, index) => {
//                 log('Option', `${index + 1}) ${version.file}`);
//             });
//         }

//         // Prompt user to pick a version
//         const { packChoice } = await prompt.get({
//             properties: {
//                 packChoice: {
//                     description: `Which version do you want to build an atlas for? (1-${versions.length})`,
//                     message: `Response must be between 1 and ${versions.length}`,
//                     required: true,
//                     conform: (value) => {
//                         return value >= 1 && value <= versions.length;
//                     },
//                 },
//             },
//         });

//         chosenVersionName = versions[(<number>packChoice) - 1].file;
//         chosenVersionDir = PathUtil.join(versionsDir, chosenVersionName);
//     }

//     // Get vanilla models and textures
//     {
//         const jarName = `${chosenVersionName}.jar`;
//         const jarDir = PathUtil.join(chosenVersionDir, jarName);
//         ASSERT_EXISTS(jarDir);

//         log('Info', `Upzipping '${jarDir}'...`);
//         {
//             const zip = new AdmZip(jarDir);
//             const zipEntries = zip.getEntries();
//             zipEntries.forEach((zipEntry: any) => {
//                 if (zipEntry.entryName.startsWith('assets/minecraft/textures/block')) {
//                     zip.extractEntryTo(zipEntry.entryName, BLOCKS_DIR, false, true);
//                 } else if (zipEntry.entryName.startsWith('assets/minecraft/models/block')) {
//                     zip.extractEntryTo(zipEntry.entryName, MODELS_DIR, false, true);
//                 }
//             });
//         }
//         log('Success', `Extracted Vanilla models to '${MODELS_DIR}'`);
//         log('Success', `Extracted Vanilla textures to '${BLOCKS_DIR}'`);
//     }

//     // Prompt user to pick a resource pack
//     let chosenResourcePackDir: string | undefined;
//     {
//         const resourcePacksDir = PathUtil.join(minecraftDir, '/resourcepacks');
//         ASSERT_EXISTS(resourcePacksDir);

//         const resourcePacks = fs.readdirSync(resourcePacksDir);
//         {
//             log('Option', `1) Vanilla`);
//             resourcePacks.forEach((resourcePack, index) => {
//                 log('Option', `${index + 2}) ${resourcePack}`);
//             });
//         }

//         const { resourcePackChoiceIndex } = await prompt.get({
//             properties: {
//                 packChoice: {
//                     description: `Which resource pack do you want to build an atlas for? (1-${resourcePacks.length + 1})`,
//                     message: `Response must be between 1 and ${resourcePacks.length + 1}`,
//                     required: true,
//                     conform: (value) => {
//                         return value >= 1 && value <= resourcePacks.length + 1;
//                     },
//                 },
//             },
//         });

//         chosenResourcePackDir = (<number>resourcePackChoiceIndex) === 1 ? undefined : resourcePacks[(<number>resourcePackChoiceIndex) - 2];
//     }

//     // Get resource pack textures
//     if (chosenResourcePackDir !== undefined) {
//         log('Warning', 'Using non-16x16 texture packs is not supported and will result in undefined behaviour');
//         {
//             if (fs.lstatSync(chosenResourcePackDir).isDirectory()) {
//                 log('Info', `Resource pack '${chosenResourcePackDir}' is a directory`);

//                 const blockTexturesSrc = PathUtil.join(chosenResourcePackDir, 'assets/minecraft/textures/block');
//                 const blockTexturesDst = BLOCKS_DIR;

//                 log('Info', `Copying ${blockTexturesSrc} to ${blockTexturesDst}...`);
//                 copydir(blockTexturesSrc, blockTexturesDst, {
//                     utimes: true,
//                     mode: true,
//                     cover: true,
//                 });
//             } else {
//                 log('Info', `Resource pack '${chosenResourcePackDir}' is not a directory, expecting to be a .zip`);

//                 const zip = new AdmZip(chosenResourcePackDir);
//                 const zipEntries = zip.getEntries();
//                 zipEntries.forEach((zipEntry: any) => {
//                     if (zipEntry.entryName.startsWith('assets/minecraft/textures/block')) {
//                         zip.extractEntryTo(zipEntry.entryName, BLOCKS_DIR, false, true);
//                     }
//                 });
//             }
//         }
//         log('Success', `Copied block textures successfully`);
//     }

//     // Load the ignore list
//     let ignoreList: Array<string> = [];
//     {
//         log('Info', 'Loading ignore list...');
//         {
//             const ignoreListPath = PathUtil.join(AppPaths.Get.tools, './models-ignore-list.txt');
//             if (fs.existsSync(ignoreListPath)) {
//                 log('Success', `Found ignore list in '${ignoreListPath}'`);
//                 ignoreList = fs.readFileSync(ignoreListPath, 'utf-8').replace(/\r/g, '').split('\n');
//                 log('Info', `Found ${ignoreList.length} blocks in ignore list`);
//             } else {
//                 log('Warning', `Could not find ignore list '${ignoreListPath}'`);
//             }
//         }
//     }

//     const usedTextures = new Set<string>();
//     const usedModels: Array<{ name: string, faces: TFaceData<string> }> = [];

//     // Load all models to use
//     {
//         const allModels = fs.readdirSync(MODELS_DIR);
//         log('Info', `Found ${allModels.length} models in '${MODELS_DIR}'`);

//         allModels.forEach((modelRelDir, index) => {
//             const modelAbsDir = PathUtil.join(MODELS_DIR, modelRelDir);
//             const parsed = path.parse(modelAbsDir);

//             if (parsed.ext !== '.json' || ignoreList.includes(parsed.base)) {
//                 return;
//             }

//             const fileData = fs.readFileSync(modelAbsDir, 'utf8');
//             const modelData = JSON.parse(fileData);

//             const faceData: TFaceData<string> | undefined = (() => {
//                 switch (modelData.parent) {
//                     case 'minecraft:block/cube_column_horizontal':
//                         return {
//                             up: modelData.textures.side,
//                             down: modelData.textures.side,
//                             north: modelData.textures.end,
//                             south: modelData.textures.end,
//                             east: modelData.textures.side,
//                             west: modelData.textures.side,
//                         };
//                     case 'minecraft:block/cube_all':
//                         return {
//                             up: modelData.textures.all,
//                             down: modelData.textures.all,
//                             north: modelData.textures.all,
//                             south: modelData.textures.all,
//                             east: modelData.textures.all,
//                             west: modelData.textures.all,
//                         };
//                     case 'minecraft:block/cube_column':
//                         return {
//                             up: modelData.textures.end,
//                             down: modelData.textures.end,
//                             north: modelData.textures.side,
//                             south: modelData.textures.side,
//                             east: modelData.textures.side,
//                             west: modelData.textures.side,
//                         };
//                     case 'minecraft:block/cube_bottom_top':
//                         return {
//                             up: modelData.textures.top,
//                             down: modelData.textures.bottom,
//                             north: modelData.textures.side,
//                             south: modelData.textures.side,
//                             east: modelData.textures.side,
//                             west: modelData.textures.side,
//                         };
//                     case 'minecraft:block/cube':
//                         return {
//                             up: modelData.textures.up,
//                             down: modelData.textures.down,
//                             north: modelData.textures.north,
//                             south: modelData.textures.south,
//                             east: modelData.textures.east,
//                             west: modelData.textures.west,
//                         };
//                     case 'minecraft:block/template_single_face':
//                         return {
//                             up: modelData.textures.texture,
//                             down: modelData.textures.texture,
//                             north: modelData.textures.texture,
//                             south: modelData.textures.texture,
//                             east: modelData.textures.texture,
//                             west: modelData.textures.texture,
//                         };
//                     case 'minecraft:block/template_glazed_terracotta':
//                         return {
//                             up: modelData.textures.pattern,
//                             down: modelData.textures.pattern,
//                             north: modelData.textures.pattern,
//                             south: modelData.textures.pattern,
//                             east: modelData.textures.pattern,
//                             west: modelData.textures.pattern,
//                         };
//                     case 'minecraft:block/leaves':
//                         return {
//                             up: modelData.textures.all,
//                             down: modelData.textures.all,
//                             north: modelData.textures.all,
//                             south: modelData.textures.all,
//                             east: modelData.textures.all,
//                             west: modelData.textures.all,
//                         };
//                 }
//             })();

//             // Debug logging to file
//             if (faceData === undefined) {
//                 LOG_WARN(`Could not parse '${parsed.base}'`);
//                 return;
//             } else {
//                 LOG(`Parsed '${parsed.base}'`);
//             }

//             // Check that the textures that this model uses can be found
//             Object.values(faceData).forEach((texture) => {
//                 const textureBaseName = texture.split('/')[1] + '.png';
//                 const textureAbsDir = PathUtil.join(BLOCKS_DIR, textureBaseName);

//                 if (fs.existsSync(textureAbsDir)) {
//                     LOG(`Found '${textureAbsDir}'`);
//                 } else {
//                     log('Warning', `'${parsed.base}' uses texture '${texture}' but the texture file could not be found at '${textureAbsDir}'`);
//                     return;
//                 }
//             });

//             // Update usedTextures and usedModels
//             Object.values(faceData).forEach((texture) => {
//                 usedTextures.add(texture);
//             });
//             usedModels.push({
//                 name: parsed.name,
//                 faces: faceData,
//             });
//         });

//         LOG('All Textures', usedTextures);
//         LOG('All Models', usedModels);
//         log('Info', `Found ${usedModels.length} models to use`);

//         // Prompt user for an atlas name
//         const { atlasName } = await prompt.get({
//             properties: {
//                 atlasName: {
//                     pattern: /^[a-zA-Z\-]+$/,
//                     description: 'What do you want to call this texture atlas?',
//                     message: 'Name must only be letters or dash',
//                     required: true,
//                 },
//             },
//         });

//         // Create atlas texture file
//         const textureDetails: { [texture: string]: { atlasColumn: number, atlasRow: number, colour: RGBA, std: number } } = {};
//         const atlasSize = Math.ceil(Math.sqrt(usedTextures.size));
//         {
//             const atlasWidth = atlasSize * 16;

//             let offsetX = 0;
//             let offsetY = 0;
//             const outputImage = images(atlasWidth * 3, atlasWidth * 3);

//             usedTextures.forEach((texture) => {
//                 const shortName = texture.split('/')[1]; // Eww
//                 const absolutePath = path.join(BLOCKS_DIR, shortName + '.png');
//                 const fileData = fs.readFileSync(absolutePath);
//                 //const pngData = PNG.sync.read(fileData);
//                 const image = images(absolutePath);

//                 for (let x = 0; x < 3; ++x) {
//                     for (let y = 0; y < 3; ++y) {
//                         outputImage.draw(image, 16 * (3 * offsetX + x), 16 * (3 * offsetY + y));
//                     }
//                 }

//                 // TODO Unimplemented
//                 /*
//                 const average = getAverageColour(pngData);
//                 textureDetails[texture] = {
//                     atlasColumn: offsetX,
//                     atlasRow: offsetY,
//                     colour: average,
//                     std: getStandardDeviation(pngData, average),
//                 };
//                 */

//                 ++offsetX;
//                 if (offsetX >= atlasSize) {
//                     ++offsetY;
//                     offsetX = 0;
//                 }
//             });

//             const atlasDir = PathUtil.join(AppPaths.Get.atlases, `./${atlasName}.png`);
//             outputImage.save(atlasDir);
//         }

//         const modelDetails = new Array<{ name: string, faces: TFaceData<string>, colour: RGBA }>();
//         {
//             usedModels.forEach((model) => {
//                 const faceColours = Object.values(model.faces)
//                     .map((face) => textureDetails[face]!.colour);

//                 modelDetails.push({
//                     name: AppUtil.Text.namespaceBlock(model.name),
//                     faces: model.faces,
//                     colour: RGBAUtil.average(...faceColours),
//                 });
//             });
//         }

//         const toExport: TAtlasVersion = {
//             formatVersion: 3,
//             atlasSize: atlasSize,
//             blocks: modelDetails,
//             textures: textureDetails,
//             supportedBlockNames: modelDetails.map((model) => model.name),
//         };

//         fs.writeFileSync(path.join(AppPaths.Get.atlases, `./${atlasName}.atlas`), JSON.stringify(toExport, null, 4));
//     }
// }();
console.log('Unimplemented');
