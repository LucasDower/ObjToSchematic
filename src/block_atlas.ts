import { Vector3 } from "./vector";
import { HashMap } from "./hash_map";
import { UV, RGB } from "./util"; 
import blocks from "../resources/blocks.json";

interface BlockInfo {
    name: string;
    colour: RGB;
    texcoord: UV
}

export class BlockAtlas {

    private readonly _cachedBlocks: HashMap<Vector3, number>;

    constructor() {
        this._cachedBlocks = new HashMap(1024);
    }

    public getTexcoord(voxelColour: RGB) {
        const block = this._getBlock(voxelColour);
        return block.texcoord;
    }

    private _getBlock(voxelColour: RGB): BlockInfo {
        const voxelColourVector = new Vector3(voxelColour.r, voxelColour.g, voxelColour.b);

        let cachedBlockIndex = this._cachedBlocks.get(voxelColourVector);
        if (cachedBlockIndex) {
            return blocks[cachedBlockIndex];
        }

        let minDistance = Infinity;
        let blockChoiceIndex!: number;

        for (let i = 0; i < blocks.length; ++i) {
            const block: BlockInfo = blocks[i];
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
        return blocks[blockChoiceIndex];
    }

}