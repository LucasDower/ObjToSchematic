import { PALETTE_ALL_RELEASE } from '../../res/palettes/all';
import { PALETTE_COLOURFUL } from '../../res/palettes/colourful';
import { PALETTE_GREYSCALE } from '../../res/palettes/greyscale';
import { PALETTE_SCHEMATIC_FRIENDLY } from '../../res/palettes/schematic-friendly';
import { Atlas } from '../runtime/atlas';
import { LOC } from '../editor/localiser';
import { StatusHandler } from '../editor/status';
import { AppTypes, AppUtil, TOptional } from './util';
import { LOG_WARN } from './util/log_util';
import { AppPaths, PathUtil } from './util/path_util';

export type TPalettes = 'all' | 'colourful' | 'greyscale' | 'schematic-friendly';

export class PaletteManager {
    public static getPalettesInfo(): { id: TPalettes, name: string }[] {
        return [
            { id: 'all', name: 'All' },
            { id: 'colourful', name: 'Colourful' },
            { id: 'greyscale', name: 'Greyscale' },
            { id: 'schematic-friendly', name: 'Schematic-friendly' },
        ];
    }
}

export class Palette {
    public static PALETTE_NAME_REGEX: RegExp = /^[a-zA-Z\- ]+$/;
    public static PALETTE_FILE_EXT: string = '.palette';
    private static _FILE_VERSION: number = 1;

    private _blocks: Set<AppTypes.TNamespacedBlockName>;

    private constructor() {
        this._blocks = new Set();
    }

    public static create(): Palette {
        return new Palette();
    }

    public static load(palette: TPalettes): TOptional<Palette> {
        const outPalette = Palette.create();

        switch (palette) {
            case 'all':
                outPalette.add(PALETTE_ALL_RELEASE);
                break;
            case 'colourful':
                outPalette.add(PALETTE_COLOURFUL);
                break;
            case 'greyscale':
                outPalette.add(PALETTE_GREYSCALE);
                break;
            case 'schematic-friendly':
                outPalette.add(PALETTE_SCHEMATIC_FRIENDLY);
                break;
        }

        return outPalette;

        return undefined;
        /*
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
        */
    }

    public save(paletteName: string): boolean {
        // TODO Unimplemented
        return false;
        /*
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
        */
    }

    public add(blockNames: AppTypes.TNamespacedBlockName[]): void {
        blockNames.forEach((blockName) => {
            if (!this._blocks.has(blockName)) {
                this._blocks.add(AppUtil.Text.namespaceBlock(blockName));
            }
        });
    }

    public remove(blockName: string): boolean {
        return this._blocks.delete(blockName);
    }

    public has(blockName: string): boolean {
        return this._blocks.has(AppUtil.Text.namespaceBlock(blockName));
    }

    public count() {
        return this._blocks.size;
    }

    public getBlocks() {
        return Array.from(this._blocks);
    }

    public static getAllPalette(): TOptional<Palette> {
        const palette = Palette.create();
        palette.add(PALETTE_ALL_RELEASE);
        return palette;
        //return Palette.load('all-release');
    }

    /**
     * Removes blocks from the palette if they do not
     * have texture data in the given atlas.
     */
    public removeMissingAtlasBlocks(atlas: Atlas) {
        const missingBlocks: AppTypes.TNamespacedBlockName[] = [];

        const blocksCopy = Array.from(this._blocks);
        for (const blockName of blocksCopy) {
            if (!atlas.hasBlock(blockName)) {
                missingBlocks.push(blockName);
                this.remove(blockName);
            }
        }

        if (missingBlocks.length > 0) {
            StatusHandler.warning(LOC('assign.blocks_missing_textures', { count: missingBlocks }));
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
