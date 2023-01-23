import fs from 'fs';
import path from 'path';
import prompt from 'prompt';

import { Palette } from '../src/palette';
import { AppPaths, PathUtil } from '../src/util/path_util';
import { log } from './logging';

const PALETTE_NAME_REGEX = /^[a-zA-Z\-]+$/;

void async function main() {
    AppPaths.Get.setBaseDir(PathUtil.join(__dirname, '../..'));

    log('Info', 'Creating a new palette...');

    const paletteBlocksDir = path.join(AppPaths.Get.tools, './new-palette-blocks.txt');
    if (!fs.existsSync(paletteBlocksDir)) {
        log('Failure', 'Could not find /tools/new-palette-blocks.txt');
        return;
    }
    log('Success', 'Found list of blocks to use in /tools/new-palette-blocks.txt');

    let blocksToUse: string[] = fs.readFileSync(paletteBlocksDir, 'utf8').replace(/\r/g, '').split('\n');
    blocksToUse = blocksToUse.filter((block) => {
        return block.length !== 0;
    });
    if (blocksToUse.length === 0) {
        log('Failure', 'No blocks listed for palette');
        log('Info', 'List the blocks you want from /tools/all-supported-blocks.txt ');
        return;
    }
    log('Info', `Found ${blocksToUse.length} blocks to use`);

    const schema: prompt.Schema = {
        properties: {
            paletteName: {
                pattern: PALETTE_NAME_REGEX,
                description: 'What do you want to call this block palette? (e.g. my-block-palette)',
                message: 'Must be only letters or dash',
                required: true,
            },
        },
    };

    const promptUser = await prompt.get(schema);

    log('Info', 'Creating palette...');
    const palette = Palette.create();
    if (palette === undefined) {
        log('Failure', 'Invalid palette name');
        return;
    }

    log('Info', 'Adding blocks to palette...');
    for (const blockNames of blocksToUse) {
        palette.add(blockNames);
    }

    log('Info', 'Saving palette...');
    const success = palette.save(promptUser.paletteName as string);

    if (success) {
        log('Success', 'Palette saved.');
    } else {
        log('Failure', 'Could not save palette.');
    }
}();
