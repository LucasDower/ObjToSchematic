import { log, LogStyle } from './logging';
import { TOOLS_DIR } from '../src/util';
import { Palette } from '../src/palette';

import fs from 'fs';
import path from 'path';
import prompt from 'prompt';

const PALETTE_NAME_REGEX = /^[a-zA-Z\-]+$/;

void async function main() {
    log(LogStyle.Info, 'Creating a new palette...');
    
    const paletteBlocksDir = path.join(TOOLS_DIR, './new-palette-blocks.txt');
    if (!fs.existsSync(paletteBlocksDir)) {
        log(LogStyle.Failure, 'Could not find /tools/new-palette-blocks.txt');
        return;
    }
    log(LogStyle.Success, 'Found list of blocks to use in /tools/new-palette-blocks.txt');
    
    let blocksToUse: string[] = fs.readFileSync(paletteBlocksDir, 'utf8').replace(/\r/g, '').split('\n');
    blocksToUse = blocksToUse.filter((block) => {
        return block.length !== 0;
    });
    if (blocksToUse.length === 0) {
        log(LogStyle.Failure, 'No blocks listed for palette');
        log(LogStyle.Info, 'List the blocks you want from /tools/all-supported-blocks.txt ');
        return;
    }
    log(LogStyle.Info, `Found ${blocksToUse.length} blocks to use`);
    
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

    log(LogStyle.Info, 'Creating palette...');
    const palette = Palette.create();
    if (palette === undefined) {
        log(LogStyle.Failure, 'Invalid palette name');
        return;
    }

    log(LogStyle.Info, 'Adding blocks to palette...');
    for (const blockNames of blocksToUse) {
        palette.add(blockNames);
    }

    log(LogStyle.Info, 'Saving palette...');
    const success = palette.save(promptUser.paletteName as string);

    if (success) {
        log(LogStyle.Success, 'Palette saved.');
    } else {
        log(LogStyle.Failure, 'Could not save palette.');
    }
}();
