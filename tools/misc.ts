import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PNG, PNGWithMetadata } from "pngjs";


export const logWarning = (message: string) => { console.log(chalk.yellow.inverse("WARN") + " " + chalk.yellow(message)); }
export const logFailure = (message: string) => { console.log(chalk.red.inverse("UHOH") + " " + chalk.red(message)); }
export const logStatus  = (message: string) => { console.log("\n" + chalk.bold(message)); }
export const logInfo    = (message: string) => { console.log(chalk.white.inverse("INFO") + " " + chalk.white(message)); }
export const logSuccess = (message: string) => { console.log(chalk.green.inverse(" OK ") + " " + chalk.green(message)); }
export const assert     = (condition: boolean, onFailMessage: string) => { if (!condition) { logFailure(onFailMessage); process.exit(0); } }

export function isDirSetup(relativePath: string, jarAssetDir: string) {
    const dir = path.join(__dirname, relativePath)
    if (fs.existsSync(dir)) {
        if (fs.readdirSync(dir).length > 0) {
            return true;
        }
    } else {
        fs.mkdirSync(dir);
    }
    logWarning(`Copy the contents of .minecraft/versions/<version>/<version>.jar/${jarAssetDir} from a Minecraft game files into ${relativePath}`);
    return false;
}

export function getTextureName(textureName: string) {
    return getShortTextureName(textureName).split(".")[0];
}

export function getShortTextureName(textureName: string) {
    return textureName.split("/")[1]; //TODO: Eww
}

export function getAbsoluteTexturePath(textureName: string) {
    return path.join(__dirname, "./blocks", getShortTextureName(textureName) + ".png");
}

export function doesTextureFileExists(textureName: string) {
    return fs.existsSync(getAbsoluteTexturePath(textureName));
}

export function getTextureData(textureName: string): PNGWithMetadata {
    const fileData = fs.readFileSync(getAbsoluteTexturePath(textureName));
    return PNG.sync.read(fileData);
}

export function getAverageColour(path: string) {
    const data = fs.readFileSync(path);
	const image = PNG.sync.read(data);
    
    let r = 0, g = 0, b = 0;
    for (let x = 0; x < image.width; ++x) {
        for (let y = 0; y < image.height; ++y) {
            const index = 4 * (image.width * y + x);
		    const rgba = image.data.slice(index, index + 4);
            r += rgba[0];
            g += rgba[1];
            b += rgba[2];
        }
    }
    const numPixels = image.width * image.height;
    return { r: r / (255 * numPixels), g: g / (255 * numPixels), b: b / (255 * numPixels) };
}