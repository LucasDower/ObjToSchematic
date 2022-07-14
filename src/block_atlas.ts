import { UV, ASSERT, fileExists, ColourSpace, ATLASES_DIR, PALETTES_DIR, AppError, LOG_WARN } from './util';

import fs from 'fs';
import path from 'path';
import { StatusHandler } from './status';
import { RGBA, RGBAUtil } from './colour';

export interface TextureInfo {
    name: string
    texcoord: UV
}

export interface FaceInfo {
    [face: string]: TextureInfo,
    up: TextureInfo,
    down: TextureInfo,
    north: TextureInfo,
    south: TextureInfo,
    east: TextureInfo,
    west: TextureInfo
}

export interface BlockInfo {
    name: string;
    colour: RGBA;
    faces: FaceInfo
}

interface BlockPalette {
    blocks: string[];
}

/* eslint-enable */
export class BlockAtlas {
    private _atlasBlocks: Array<BlockInfo>;
    private _palette: string[];
    private _atlasSize: number;
    private _atlasLoaded: boolean;
    private _paletteLoaded: boolean;
    private _atlasTextureID?: string;
    private _paletteBlockToBlockInfoIndex: Map<string, number>;

    private static _instance: BlockAtlas;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._atlasBlocks = [];
        this._atlasSize = 0;
        this._atlasLoaded = false;
        this._palette = [];
        this._paletteLoaded = false;
        this._paletteBlockToBlockInfoIndex = new Map();
    }

    public loadAtlas(atlasID: string) {
        const atlasDir = path.join(ATLASES_DIR, atlasID + '.atlas');
        ASSERT(fileExists(atlasDir), `Atlas to load does not exist ${atlasDir}`);

        const blocksString = fs.readFileSync(atlasDir, 'utf-8');
        if (!blocksString) {
            throw Error('Could not load vanilla.atlas');
        }

        const json = JSON.parse(blocksString);
        this._atlasSize = json.atlasSize;
        this._atlasTextureID = atlasID;
        this._atlasBlocks = json.blocks;
        for (const block of this._atlasBlocks) {
            block.colour = {
                r: block.colour.r,
                g: block.colour.g,
                b: block.colour.b,
                a: block.colour.a,
            };
        }

        if (this._atlasBlocks.length === 0) {
            throw new AppError('The chosen atlas has no blocks');
        }

        StatusHandler.Get.add('info', `Atlas '${atlasID}' has data for ${this._atlasBlocks.length} blocks`);

        this._atlasLoaded = true;
    }

    public loadPalette(paletteID: string) {
        ASSERT(this._atlasLoaded, 'An atlas must be loaded before a palette');

        const paletteDir = path.join(PALETTES_DIR, paletteID + '.palette');
        ASSERT(fileExists(paletteDir), `Palette to load does not exist ${paletteDir}`);

        const palette: BlockPalette = JSON.parse(fs.readFileSync(paletteDir, 'utf8'));
        this._palette = palette.blocks;
        StatusHandler.Get.add('info', `Palette '${paletteID}' has data for ${this._palette.length} blocks`);

        // Count the number of palette blocks that are missing from the atlas
        // For example, loading an old atlas with a new palette
        const missingBlocks: string[] = [];
        for (let paletteBlockIndex = palette.blocks.length - 1; paletteBlockIndex >= 0; --paletteBlockIndex) {
            const paletteBlockName = palette.blocks[paletteBlockIndex];
            const atlasBlockIndex = this._atlasBlocks.findIndex((x) => x.name === paletteBlockName);
            if (atlasBlockIndex === -1) {
                missingBlocks.push(paletteBlockName);
                palette.blocks.splice(paletteBlockIndex, 1);
            } else {
                this._paletteBlockToBlockInfoIndex.set(paletteBlockName, atlasBlockIndex);
            }
        }
        if (missingBlocks.length > 0) {
            StatusHandler.Get.add('warning', `${missingBlocks.length} palette block(s) are missing atlas textures, they will not be used`);
            LOG_WARN('Blocks missing atlas textures', missingBlocks);
        }

        StatusHandler.Get.add('info', `There are ${this._palette.length} valid blocks to assign from`);

        this._paletteLoaded = true;
    }

    public getBlock(voxelColour: RGBA, colourSpace: ColourSpace, exclude?: string[]): BlockInfo {
        ASSERT(this._atlasLoaded, 'No atlas has been loaded');
        ASSERT(this._paletteLoaded, 'No palette has been loaded');

        let minDistance = Infinity;
        let blockChoiceIndex!: number;

        for (const paletteBlockName of this._palette) {
            if (exclude?.includes(paletteBlockName)) {
                continue;
            }

            // TODO: Optimise Use hash map for  blockIndex instead of linear search
            const blockIndex: (number | undefined) = this._paletteBlockToBlockInfoIndex.get(paletteBlockName);
            ASSERT(blockIndex !== undefined);
            
            const block: BlockInfo = this._atlasBlocks[blockIndex];
            const blockAvgColour = block.colour as RGBA;
            const distance = RGBAUtil.squaredDistance(blockAvgColour, voxelColour);

            if (distance < minDistance) {
                minDistance = distance;
                blockChoiceIndex = blockIndex;
            }
        }

        if (blockChoiceIndex === undefined) {
            throw new AppError('The chosen palette does not have suitable blocks');
        }

        return this._atlasBlocks[blockChoiceIndex];
    }

    public getAtlasSize() {
        ASSERT(this._atlasLoaded);
        return this._atlasSize;
    }

    public getAtlasTexturePath() {
        ASSERT(this._atlasLoaded, 'No atlas texture available');
        ASSERT(this._atlasTextureID, 'No atlas texture ID available');
        return path.join(ATLASES_DIR, this._atlasTextureID + '.png');
    }
}
