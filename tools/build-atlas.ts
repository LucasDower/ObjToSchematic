import fs from "fs";
import path from "path";
import images from "images";
import { RGB, UV } from "../src/util";
import { log, LogStyle } from "./logging";
import { PNG } from "pngjs";
import { isDirSetup, ASSERT, getAverageColour } from "./misc";
import chalk from "chalk";
import prompt from "prompt";
const AdmZip = require("adm-zip");

prompt.start();
prompt.get([{
    name: 'response',
    description: 'Do you want to fetch textures and models? (Y/n)',
    type: 'string',
    required: true,
    message: 'Respond with yes or no',
    conform: (response) => {
        return ["yes", "Y", "y", "no", "N", "n"].includes(response);
    }
}], (err, res) => {
    if (err) {
        process.exit(1);
    }
    handleResponse(res);
});

const handleResponse = (results: any) => {
    const responseYes = ["yes", "Y", "y"].includes(results.response as any);
    if (!responseYes) {
        buildAtlas();
    }

    const versionsDir = path.join(process.env.APPDATA!, "./.minecraft/versions");
    if (!fs.existsSync(versionsDir)) {
        log(LogStyle.Failure, "Could not fid .minecraft/versions\n");
        process.exit(1);
    }
    log(LogStyle.Success, ".minecraft/versions found successfully\n");

    const versions = fs.readdirSync(versionsDir)
        .filter((file) => fs.lstatSync(path.join(versionsDir, file)).isDirectory())
        .map((file) => ({ file, birthtime: fs.lstatSync(path.join(versionsDir, file)).birthtime }))
        .sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());

    for (let i = 0; i < versions.length; ++i) {
        const versionName = versions[i].file
        log(LogStyle.Info, `Searching in ${versionName} for ${versionName}.jar`);

        const versionDir = path.join(versionsDir, versionName);
        const versionFiles = fs.readdirSync(versionDir);
        if (!versionFiles.includes(versionName + ".jar")) {
            continue;
        }
        log(LogStyle.Success, `Up ${versionName}.jar successfully\n`);

        const versionJarPath = path.join(versionDir, `${versionName}.jar`);

        log(LogStyle.Info, `Upzipping ${versionName}.jar...`);
        var zip = new AdmZip(versionJarPath);
        const zipEntries = zip.getEntries();
        zipEntries.forEach((zipEntry: any) => {
            if (zipEntry.entryName.startsWith("assets/minecraft/textures/block")) {
                zip.extractEntryTo(zipEntry.entryName, path.join(__dirname, "./blocks"), false, true);
            } else if (zipEntry.entryName.startsWith("assets/minecraft/models/block")) {
                zip.extractEntryTo(zipEntry.entryName, path.join(__dirname, "./models"), false, true);
            }
        });
        log(LogStyle.Success, `Extracted textures and models successfully\n`);

        buildAtlas();

        return;
    }
};

const buildAtlas = () => {
    // Check /blocks and /models is setup correctly
    log(LogStyle.None, "Checking Minecraft assets are provided...");   

    const texturesDirSetup = isDirSetup("./models", "assets/minecraft/textures/block");
    ASSERT(texturesDirSetup, "/blocks is not setup correctly");
    
    const modelsDirSetup = isDirSetup("./models", "assets/minecraft/models/block");
    ASSERT(modelsDirSetup, "/models is not setup correctly");

    // Load the ignore list
    log(LogStyle.None, "Loading ignore list...")
    let ignoreList: Array<string> = [];
    const ignoreListPath = path.join(__dirname, "./ignore-list.txt");
    const defaultIgnoreListPath = path.join(__dirname, "./default-ignore-list.txt");
    if (fs.existsSync(ignoreListPath)) {
        log(LogStyle.Success, "Found custom ignore list");
        ignoreList = fs.readFileSync(ignoreListPath, "utf-8").replace(/\r/g, "").split("\n");
    } else if (fs.existsSync(defaultIgnoreListPath)) {
        log(LogStyle.Success, "Found default ignore list");
        ignoreList = fs.readFileSync(defaultIgnoreListPath, "utf-8").replace(/\r/g, "").split("\n");
    } else {
        log(LogStyle.Warning, "No ignore list found, looked for ignore-list.txt and default-ignore-list.txt");
    }
    log(LogStyle.Info, `${ignoreList.length} blocks found in ignore list\n`);


    // 
    log(LogStyle.None, "Loading block models...")

    enum parentModel {
        Cube = "minecraft:block/cube",
        CubeAll = "minecraft:block/cube_all",
        CubeColumn = "minecraft:block/cube_column",
        CubeColumnHorizontal = "minecraft:block/cube_column_horizontal",
        TemplateSingleFace = "minecraft:block/template_single_face",
        TemplateGlazedTerracotta = "minecraft:block/template_glazed_terracotta",
    }

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

    const faces = ["north", "south", "up", "down", "east", "west"];
    let allModels: Array<Model> = [];
    let usedTextures: Set<string> = new Set();
    fs.readdirSync(path.join(__dirname, "./models")).forEach(filename => {
        if (path.extname(filename) !== ".json") {
            return;
        };

        const filePath = path.join(__dirname, "./models", filename);
        const fileData = fs.readFileSync(filePath, "utf8");
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
                    west: { name: modelData.textures.all }
                }
                break;
            case parentModel.CubeColumn:
                faceData = {
                    up: { name: modelData.textures.end },
                    down: { name: modelData.textures.end },
                    north: { name: modelData.textures.side },
                    south: { name: modelData.textures.side },
                    east: { name: modelData.textures.side },
                    west: { name: modelData.textures.side }
                }
                break;
            case parentModel.Cube:
                faceData = {
                    up: { name: modelData.textures.up },
                    down: { name: modelData.textures.down },
                    north: { name: modelData.textures.north },
                    south: { name: modelData.textures.south },
                    east: { name: modelData.textures.east },
                    west: { name: modelData.textures.west }
                }
                break;
            case parentModel.TemplateSingleFace:
                faceData = {
                    up: { name: modelData.textures.texture },
                    down: { name: modelData.textures.texture },
                    north: { name: modelData.textures.texture },
                    south: { name: modelData.textures.texture },
                    east: { name: modelData.textures.texture },
                    west: { name: modelData.textures.texture }
                }
                break;
            case parentModel.TemplateGlazedTerracotta:
                faceData = {
                    up: { name: modelData.textures.pattern },
                    down: { name: modelData.textures.pattern },
                    north: { name: modelData.textures.pattern },
                    south: { name: modelData.textures.pattern },
                    east: { name: modelData.textures.pattern },
                    west: { name: modelData.textures.pattern }
                }
                break;
            default:
                return;
        }

        for (const face of faces) {
            usedTextures.add(faceData[face].name);
        }

        allModels.push({
            name: modelName,
            faces: faceData
        });
    });
    log(LogStyle.Success, `${allModels.length} blocks loaded\n`);

    const atlasSize = Math.ceil(Math.sqrt(usedTextures.size));
    const atlasWidth = atlasSize * 16;

    let offsetX = 0, offsetY = 0;
    const outputImage = images(atlasWidth * 3, atlasWidth * 3);

    let textureDetails: { [textureName: string]: { texcoord: UV, colour: RGB } } = {};

    log(LogStyle.None, "Building blocks.png...");
    usedTextures.forEach(textureName => {
        const shortName = textureName.split("/")[1]; // Eww
        const absolutePath = path.join(__dirname, "./blocks", shortName + ".png");
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
                v: 16 * (3 * offsetY + 1) / (atlasWidth * 3)
            },
            colour: getAverageColour(pngData)
        }

        ++offsetX;
        if (offsetX >= atlasSize) {
            ++offsetY;
            offsetX = 0;
        }
    });


    // Build up the output JSON
    log(LogStyle.None, "Building blocks.json...\n");
    for (const model of allModels) {
        let blockColour = { r: 0, g: 0, b: 0 };
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


    log(LogStyle.None, "Exporting...");
    outputImage.save(path.join(__dirname, "../resources/blocks.png"));
    log(LogStyle.Success, "blocks.png exported to /resources");
    let outputJSON = { atlasSize: atlasSize, blocks: allModels };
    fs.writeFileSync(path.join(__dirname, "../resources/blocks.json"), JSON.stringify(outputJSON, null, 4));
    log(LogStyle.Success, "blocks.json exported to /resources\n");

    console.log(chalk.cyanBright(chalk.inverse("DONE") + " Now run " + chalk.inverse(" npm start ") + " and the new blocks will be used"));
}