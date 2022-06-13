import { log, LogStyle } from './logging';
import { TOOLS_DIR, PALETTES_DIR } from '../src/util';

import fs from 'fs';
import path from 'path';
import prompt from 'prompt';

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
                pattern: /^[a-zA-Z\-]+$/,
                description: 'What do you want to call this block palette? (e.g. my-block-palette)',
                message: 'Must be only letters or dash',
                required: true,
            },
        },
    };

    const promptUser = await prompt.get(schema);

    const paletteJSON = {
        blocks: blocksToUse,
    };

    fs.writeFileSync(path.join(PALETTES_DIR, `./${promptUser.paletteName}.palette`), JSON.stringify(paletteJSON, null, 4));
    log(LogStyle.Success, `Successfully created ${promptUser.paletteName}.palette in /resources/palettes/`);
}();
