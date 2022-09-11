import { AppTypes, AppUtil, TOptional } from './util';

import fs from 'fs';
import path from 'path';
import { StatusHandler } from './status';
import { Atlas } from './atlas';
import { AppError, ASSERT } from './util/error_util';
import { LOG_WARN } from './util/log_util';
import { RGBA, RGBAUtil } from './colour';
import { AppPaths, PathUtil } from './util/path_util';

export class PaletteManager {
    public static getPalettesInfo(): { paletteID: string, paletteDisplayName: string }[] {
        const palettes: { paletteID: string, paletteDisplayName: string }[] = [];

        fs.readdirSync(AppPaths.Get.palettes).forEach((file) => {
            const paletteFilePath = path.parse(file);
            if (paletteFilePath.ext === Palette.PALETTE_FILE_EXT) {
                const paletteID = paletteFilePath.name;

                let paletteDisplayName = paletteID.replace('-', ' ').toLowerCase();
                paletteDisplayName = AppUtil.Text.capitaliseFirstLetter(paletteDisplayName);

                palettes.push({ paletteID: paletteID, paletteDisplayName: paletteDisplayName });
            }
        });

        return palettes;
    }
}

export class Palette {
    public static PALETTE_NAME_REGEX: RegExp = /^[a-zA-Z\-]+$/;
    public static PALETTE_FILE_EXT: string = '.palette';
    private static _FILE_VERSION: number = 1;

    private _blocks: AppTypes.TNamespacedBlockName[];

    private constructor() {
        this._blocks = [];
    }

    public static create(): Palette {
        return new Palette();
    }

    public static load(paletteName: string): TOptional<Palette> {
        if (!Palette._isValidPaletteName(paletteName)) {
            return;
        }

        const palettePath = Palette._getPalettePath(paletteName);
        if (!fs.existsSync(palettePath)) {
            return;
        }

        const palette = Palette.create();

        const paletteFile = fs.readFileSync(palettePath, 'utf8');
        const paletteJSON = JSON.parse(paletteFile);
        const paletteVersion = paletteJSON.version;

        if (paletteVersion === undefined) {
            const paletteBlocks = paletteJSON.blocks;
            for (const blockName of paletteBlocks) {
                palette.add(AppUtil.Text.namespaceBlock(blockName));
            }
        } else if (paletteVersion === 1) {
            const paletteBlocks = paletteJSON.blocks;
            for (const blockName of paletteBlocks) {
                palette.add(blockName);
            }
        } else {
            ASSERT(false, `Unrecognised .palette file version: ${paletteVersion}`);
        }

        return palette;
    }

    public save(paletteName: string): boolean {
        if (!Palette._isValidPaletteName(paletteName)) {
            return false;
        }
        const filePath = Palette._getPalettePath(paletteName);

        const paletteJSON = {
            version: Palette._FILE_VERSION,
            blocks: this._blocks,
        };

        try {
            fs.writeFileSync(filePath, JSON.stringify(paletteJSON, null, 4));
            return true;
        } catch {
            return false;
        }
    }

    public add(blockName: AppTypes.TNamespacedBlockName): void {
        if (!this._blocks.includes(blockName)) {
            this._blocks.push(AppUtil.Text.namespaceBlock(blockName));
        }
    }

    public remove(blockName: string): boolean {
        const index = this._blocks.indexOf(AppUtil.Text.namespaceBlock(blockName));
        if (index !== undefined) {
            this._blocks.slice(index, 1);
            return true;
        }
        return false;
    }

    public has(blockName: string): boolean {
        return this._blocks.includes(AppUtil.Text.namespaceBlock(blockName));
    }

    public count() {
        return this._blocks.length;
    }

    public getBlock(voxelColour: RGBA, atlas: Atlas, blocksToExclude?: AppTypes.TNamespacedBlockName[]) {
        const blocksToUse = this.getBlocks();
        const atlasBlocks = atlas.getBlocks();

        // Remove excluded blocks
        if (blocksToExclude !== undefined) {
            for (const blockToExclude of blocksToExclude) {
                const index = blocksToUse.indexOf(blockToExclude);
                if (index != -1) {
                    blocksToUse.splice(index, 1);
                }
            }
        }

        // Find closest block in colour
        let minDistance = Infinity;
        let blockChoice: TOptional<AppTypes.TNamespacedBlockName>;

        for (const blockName of blocksToUse) {
            const blockData = atlasBlocks.get(blockName);
            ASSERT(blockData);

            const colourDistance = RGBAUtil.squaredDistance(voxelColour, blockData.colour);
            if (colourDistance < minDistance) {
                minDistance = colourDistance;
                blockChoice = blockName;
            }
        }

        if (blockChoice !== undefined) {
            return atlasBlocks.get(blockChoice)!;
        }

        throw new AppError('Could not find a suitable block');
    }

    public getBlocks() {
        return this._blocks;
    }

    public static getAllPalette(): TOptional<Palette> {
        return Palette.load('all-release');
    }

    /**
     * atlas. If not, the block is removed from the palette.
     * Checks if each block in this block palette has texture data in the given
     */
    public removeMissingAtlasBlocks(atlas: Atlas) {
        const missingBlocks: AppTypes.TNamespacedBlockName[] = [];
        for (let blockIndex = this._blocks.length - 1; blockIndex >= 0; --blockIndex) {
            const blockName = this._blocks[blockIndex];
            if (!atlas.hasBlock(blockName)) {
                missingBlocks.push(blockName);
                this.remove(blockName);
            }
        }

        if (missingBlocks.length > 0) {
            StatusHandler.Get.add('warning', `${missingBlocks.length} palette block(s) are missing atlas textures, they will not be used`);
            LOG_WARN('Blocks missing atlas textures', missingBlocks);
        }
    }

    private static _isValidPaletteName(paletteName: string): boolean {
        return paletteName.length > 0 && Palette.PALETTE_NAME_REGEX.test(paletteName);
    }

    private static _getPalettePath(paletteName: string): string {
        return PathUtil.join(AppPaths.Get.palettes, `./${paletteName}.palette`);
    }
}
