import { Atlas } from './atlas';
import { StatusHandler } from './status';
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

    private _blocks: AppTypes.TNamespacedBlockName[];

    private constructor() {
        this._blocks = [];
    }

    public static create(): Palette {
        return new Palette();
    }

    public static load(paletteName: string): TOptional<Palette> {
        // TODO Unimplemented
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
            if (!this._blocks.includes(blockName)) {
                this._blocks.push(AppUtil.Text.namespaceBlock(blockName));
            }
        });
    }

    public remove(blockName: string): boolean {
        const index = this._blocks.indexOf(AppUtil.Text.namespaceBlock(blockName));
        if (index !== -1) {
            this._blocks.splice(index, 1);
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

    public getBlocks() {
        return this._blocks;
    }

    public static getAllPalette(): TOptional<Palette> {
        return Palette.load('all-release');
    }

    /**
     * Removes blocks from the palette if they do not
     * have texture data in the given atlas.
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
