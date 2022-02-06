import { HashMap } from './hash_map';
import { UV, RGB } from './util';
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
/* eslint-enable */
export class BlockAtlas {
    private _cachedBlocks: HashMap<Vector3, number>;
    private readonly _blocks: Array<BlockInfo>;
    public readonly _atlasSize: number;

    private static _instance: BlockAtlas;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._cachedBlocks = new HashMap(1024);

        const _path = path.join(__dirname, '../resources/blocks.json');
        const blocksString = fs.readFileSync(_path, 'utf-8');
        if (!blocksString) {
            throw Error('Could not load blocks.json');
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
    }


    public getBlock(voxelColour: RGB): BlockInfo {
        const cachedBlockIndex = this._cachedBlocks.get(voxelColour.toVector3());
        if (cachedBlockIndex) {
            return this._blocks[cachedBlockIndex];
        }

        let minDistance = Infinity;
        let blockChoiceIndex!: number;

        for (let i = 0; i < this._blocks.length; ++i) {
            const block: BlockInfo = this._blocks[i];
            const blockAvgColour = block.colour as RGB;
            const distance = RGB.distance(blockAvgColour, voxelColour);

            if (distance < minDistance) {
                minDistance = distance;
                blockChoiceIndex = i;
            }
        }

        this._cachedBlocks.add(voxelColour.toVector3(), blockChoiceIndex);
        return this._blocks[blockChoiceIndex];
    }
}
