import fs from "fs";
import path from "path";
import { PNGWithMetadata } from "pngjs";
import images from "images";

import { logStatus, logSuccess, logInfo, isDirSetup, assert, doesTextureFileExists, getTextureData, logWarning, getAbsoluteTexturePath, getAverageColour, getTextureName } from "./misc";



logStatus("Checking Minecraft assets are provided...");
const blocksDirSetup = isDirSetup("./blocks", "assets/minecraft/textures/block");
const modelsDirSetup = isDirSetup("./models", "assets/minecraft/models/block");
assert(blocksDirSetup && modelsDirSetup, "Folders not setup correctly");
logSuccess("Folders setup correctly");



logStatus("Loading ignore list...")
let ignoreList: Array<string> = [];
const ignoreListPath = path.join(__dirname, "./ignore-list.txt");
const defaultIgnoreListPath = path.join(__dirname, "./default-ignore-list.txt");
if (fs.existsSync(ignoreListPath)) {
    logSuccess("Found custom ignore list");
    ignoreList = fs.readFileSync(ignoreListPath, "utf-8").replace(/\r/g, "").split("\n");
} else if (fs.existsSync(defaultIgnoreListPath)){
    logSuccess("Found default ignore list");
    ignoreList = fs.readFileSync(defaultIgnoreListPath, "utf-8").replace(/\r/g, "").split("\n");
} else {
    logWarning("No ignore list found, looked for ignore-list.txt and default-ignore-list.txt");
}
logInfo(`${ignoreList.length} blocks found in ignore list`);



interface BlockData {
    filePath: string,
    modelData: any
}

interface BlockPNGData {
    pngData: {[texture: string]: PNGWithMetadata}
}

logStatus("Loading block models...")
let candidateAtlasBlocks: Array<BlockData> = [];
let ignoredCount = 0;

enum parentModel {
    CubeAll = "minecraft:block/cube_all",
    CubeColumn = "minecraft:block/cube_column",
    Cube = "minecraft:block/cube"
}

//const supportedModels = [parentModel.CubeAll, parentModel.CubeColumn, parentModel.Cube];
const supportedModels = [parentModel.CubeAll];

fs.readdirSync(path.join(__dirname, "./models")).forEach(filename => {
    if (path.extname(filename) !== ".json") {
        return;
    };
    const filePath = path.join(__dirname, "./models", filename);
    const fileData = fs.readFileSync(filePath, "utf8");
    const modelData = JSON.parse(fileData);
    if (supportedModels.includes(modelData.parent) && !ignoreList.includes(filename)) {
        candidateAtlasBlocks.push({filePath: filePath, modelData: modelData});
    } else {
        ++ignoredCount;
    }
});
assert(candidateAtlasBlocks.length > 0, "No blocks supplied are supported");
logSuccess(`Collected ${candidateAtlasBlocks.length} blocks, ignored ${ignoredCount} unsupported blocks`);



logStatus("Loading block textures...");
let textureAbsolutePaths = [];
let atlasBlocks: Array<BlockData & BlockPNGData> = [];
for (const blockData of candidateAtlasBlocks) {

    const atlasBlock: (BlockData & BlockPNGData) = { 
        filePath: blockData.filePath,
        modelData: blockData.modelData,
        pngData: {}
    }

    let texturesValid = true;
    for (const key in blockData.modelData.textures) {
        const texturePath = blockData.modelData.textures[key];
        if (!doesTextureFileExists(texturePath)) {
            // TODO: Use first frame
            logWarning(`Texture for ${texturePath} does not exist in ./models, ignoring...`);
            texturesValid = false;
            break;
        }
        const textureData: PNGWithMetadata = getTextureData(texturePath);
        if (textureData.width !== textureData.height) {
            logWarning(`${texturePath} is an animated/non-square texture which is not yet supported, ignoring...`);
            texturesValid = false;
            break;
        }
        if (textureData.width !== 16 || textureData.height !== 16) {
            logWarning(`${texturePath} is not a 16x16 texture and is not yet supported, ignoring...`);
            texturesValid = false;
            break;
        }
        if (textureData.width !== 16 || textureData.height !== 16) {
            logWarning(`${texturePath} is not a 16x16 texture and is not yet supported, ignoring...`);
            texturesValid = false;
            break;
        }
        textureAbsolutePaths.push(getAbsoluteTexturePath(texturePath));
        atlasBlock.pngData[key] = textureData;
    }

    if (texturesValid) {
        atlasBlocks.push(atlasBlock);
    }
}
assert(atlasBlocks.length > 0, "No blocks supplied have supported textures");
logSuccess(`Textures for ${atlasBlocks.length} block loaded`);



logStatus("Stitching textures together...");
const atlasSize = Math.ceil(Math.sqrt(textureAbsolutePaths.length));
const atlasWidth = atlasSize * 16;
let atlasElements = [];
let x = 0;
let y = 0;
for (let i = 0; i < textureAbsolutePaths.length; ++i) {
    atlasElements.push({
        src: textureAbsolutePaths[i],
        offsetX: 3 * 16 * x++,
        offsetY: 3 * 16 * y
    })
    if (x >= atlasSize) {
        ++y;
        x = 0;
    }
}




let outputBlocks = [];
let outputImage = images(atlasWidth * 3, atlasWidth * 3);
for (const element of atlasElements) {
    // Tile each texture in a 3x3 grid to avoid UV bleeding
    // TODO: Just repeat the outer layer of pixels instead of 3x3
    const texture = images(element.src);
    for (let x = 0; x < 3; ++x) {
        for (let y = 0; y < 3; ++y) {
            outputImage.draw(texture, element.offsetX + 16 * x, element.offsetY + 16 * y);
        }
    }
    outputBlocks.push({
        colour: getAverageColour(element.src),
        texcoord: {
            u: (element.offsetX + 16) / (atlasWidth * 3),
            v: (element.offsetY + 16) / (atlasWidth * 3),
        },
        name: path.parse(element.src).name
    });
}
logSuccess("Atlas texture created");



logStatus("Exporting...");
outputImage.save(path.join(__dirname, "../resources/blocks.png"));
logSuccess("blocks.png exported to /resources");
let outputJSON = { atlasSize: atlasSize, blocks: outputBlocks };
fs.writeFileSync(path.join(__dirname, "../resources/blocks.json"), JSON.stringify(outputJSON));
logSuccess("blocks.json exported to /resources");