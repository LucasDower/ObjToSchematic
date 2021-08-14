import { Vector3 } from "./vector";
import { HashMap } from "./hash_map";
import { UV, RGB } from "./util"; 
//import blocks from "../resources/blocks.json";
import fs from "fs";

interface BlockInfo {
    name: string;
    colour: RGB;
    texcoord: UV
}

// https://minecraft.fandom.com/wiki/Java_Edition_data_values/Pre-flattening/Block_IDs
export enum Block {
    Stone = 1.0,
    Dirt = 3.0,
    Cobblestone = 4.0
}

export class BlockAtlas {

    private readonly _cachedBlocks: HashMap<Vector3, number>;
    private readonly _blocks: Array<BlockInfo>;

    constructor() {
        this._cachedBlocks = new HashMap(1024);

        const blocksString = fs.readFileSync("./resources/blocks.json", "utf-8");
        if (!blocksString) {
            throw Error("Could not load blocks.json")
        }
        
        const blocksJSON = JSON.parse(blocksString);
        this._blocks = blocksJSON;
    }

    public getTexcoord(voxelColour: RGB) {
        const block = this._getBlock(voxelColour);
        return block.texcoord;
    }

    private _getBlock(voxelColour: RGB): BlockInfo {
        const voxelColourVector = new Vector3(voxelColour.r, voxelColour.g, voxelColour.b);

        let cachedBlockIndex = this._cachedBlocks.get(voxelColourVector);
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
                blockAvgColour.b
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