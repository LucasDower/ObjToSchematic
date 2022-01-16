import { Vector3 } from './vector';
import { HashMap } from './hash_map';
import { UV, RGB } from './util';
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
    }


    public getBlock(voxelColour: RGB): BlockInfo {
        const voxelColourVector = new Vector3(voxelColour.r, voxelColour.g, voxelColour.b);

        const cachedBlockIndex = this._cachedBlocks.get(voxelColourVector);
        if (cachedBlockIndex) {
            return this._blocks[cachedBlockIndex];
        }

        let minDistance = Infinity;
        let blockChoiceIndex!: number;

        for (let i = 0; i < this._blocks.length; ++i) {
            const block: BlockInfo = this._blocks[i];
            const blockAvgColour = block.colour;
            const blockAvgColourVector = new Vector3(
                blockAvgColour.r,
                blockAvgColour.g,
                blockAvgColour.b,
            );

            const distance = Vector3.sub(blockAvgColourVector, voxelColourVector).magnitude();
            if (distance < minDistance) {
                minDistance = distance;
                blockChoiceIndex = i;
            }
        }

        this._cachedBlocks.add(voxelColourVector, blockChoiceIndex);
        return this._blocks[blockChoiceIndex];
    }
}
