import { HashMap } from './hash_map';
import { UV, RGB, ASSERT, fileExists } from './util';
import { Vector3 } from './vector';

import fs from 'fs';
import path from 'path';

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
    colour: RGB;
    faces: FaceInfo
}

// https://minecraft.fandom.com/wiki/Java_Edition_data_values/Pre-flattening/Block_IDs
/* eslint-disable */
export enum Block {
    Stone = 1.0,
    Dirt = 3.0,
    Cobblestone = 4.0
}

interface BlockPalette {
    blocks: string[];
}

/* eslint-enable */
export class BlockAtlas {
    private _cachedBlocks: HashMap<Vector3, number>;
    private _blocks: Array<BlockInfo>;
    private _palette: string[];
    private _atlasSize: number;
    private _atlasLoaded: boolean;
    private _paletteLoaded: boolean;

    private static _instance: BlockAtlas;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._cachedBlocks = new HashMap(0);
        this._blocks = [];
        this._atlasSize = 0;
        this._atlasLoaded = false;
        this._palette = [];
        this._paletteLoaded = false;

        this.loadAtlas(path.join(__dirname, '../resources/atlases/vanilla.atlas'));
    }

    public loadAtlas(absolutePath: string) {
        this._cachedBlocks = new HashMap(1024);

        const blocksString = fs.readFileSync(absolutePath, 'utf-8');
        if (!blocksString) {
            throw Error('Could not load vanilla.atlas');
        }

        const json = JSON.parse(blocksString);
        this._atlasSize = json.atlasSize;
        this._blocks = json.blocks;
        for (const block of this._blocks) {
            block.colour = new RGB(
                block.colour.r,
                block.colour.g,
                block.colour.b,
            );
        }

        this._atlasLoaded = true;
    }

    public loadPalette(paletteID: string) {
        this._cachedBlocks = new HashMap(1024);

        const paletteDir = path.join(__dirname, '../resources/palettes', paletteID + '.palette');
        ASSERT(fileExists(paletteDir), `Palette to load does not exist ${paletteDir}`);

        const palette: BlockPalette = JSON.parse(fs.readFileSync(paletteDir, 'utf8'));
        this._palette = palette.blocks;

        this._paletteLoaded = true;
    }

    public getBlock(voxelColour: RGB): BlockInfo {
        ASSERT(this._atlasLoaded, 'No atlas has been loaded');
        ASSERT(this._paletteLoaded, 'No palette has been loaded');

        const cachedBlockIndex = this._cachedBlocks.get(voxelColour.toVector3());
        if (cachedBlockIndex) {
            return this._blocks[cachedBlockIndex];
        }

        let minDistance = Infinity;
        let blockChoiceIndex!: number;

        for (let i = 0; i < this._blocks.length; ++i) {
            const block: BlockInfo = this._blocks[i];
            if (this._palette.includes(block.name)) {
                const blockAvgColour = block.colour as RGB;
                const distance = RGB.distance(blockAvgColour, voxelColour);

                if (distance < minDistance) {
                    minDistance = distance;
                    blockChoiceIndex = i;
                }
            }
        }

        this._cachedBlocks.add(voxelColour.toVector3(), blockChoiceIndex);
        return this._blocks[blockChoiceIndex];
    }

    public getAtlasSize() {
        ASSERT(this._atlasLoaded);
        return this._atlasSize;
    }
}
