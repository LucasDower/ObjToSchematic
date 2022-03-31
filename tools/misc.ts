import { log, LogStyle } from './logging';
import { RGB, TOOLS_DIR } from '../src/util';

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import prompt from 'prompt';

export const ASSERT = (condition: boolean, onFailMessage: string) => {
    if (!condition) {
        log(LogStyle.Failure, onFailMessage);
        process.exit(0);
    }
};

export function isDirSetup(relativePath: string, jarAssetDir: string) {
    const dir = path.join(TOOLS_DIR, relativePath);
    if (fs.existsSync(dir)) {
        if (fs.readdirSync(dir).length > 0) {
            return true;
        }
    } else {
        fs.mkdirSync(dir);
    }
    log(LogStyle.Warning, `Copy the contents of .minecraft/versions/<version>/<version>.jar/${jarAssetDir} from a Minecraft game files into ${relativePath} or fetch them automatically`);
    return false;
}

export function getAverageColour(image: PNG) {
    let r = 0;
    let g = 0;
    let b = 0;
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
    return new RGB(r / (255 * numPixels), g / (255 * numPixels), b / (255 * numPixels));
}

export async function getPermission() {
    const directory = path.join(process.env.APPDATA!, '.minecraft');
    log(LogStyle.Info, `This script requires files inside of ${directory}`);
    const { permission } = await prompt.get({
        properties: {
            permission: {
                pattern: /^[YyNn]$/,
                description: 'Do you give permission to access these files? (Y/n)',
                message: 'Response must be Y or N',
                required: true,
            },
        },
    });
    const responseYes = ['Y', 'y'].includes(permission as string);
    if (!responseYes) {
        process.exit(0);
    }
}
