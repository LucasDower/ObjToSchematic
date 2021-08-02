const twgl = require('twgl.js');
const fs = require('fs');
const { Vector3 } = require('./vector.js');
const { HashMap } = require('./hash_map.js');

class BlockAtlas {

    constructor() {
        const blocksJSONPath = "./resources/blocks.json";
        const blocksTexturePath = "./resources/blocks.png";

        const blocksJSONString = fs.readFileSync(blocksJSONPath);
        this._blocks = JSON.parse(blocksJSONString);

        this._cachedBlocks = new HashMap(1024);
        //this._buildLookupTable();
    }

    /*
    _buildLookupTable() {
        const numBlocks = Object.keys(this._blocks).length;
        const numColours = 255 * 255 * 255;
        
        if (numBlocks > 65535) {
            throw Error(`Cannot pack ${numBlocks} blocks into 16-bit buffer`);
        }

        this.blockLookupTable = new Uint16Array(numColours); // 33.16Mb
        let bufferIndex = 0;

        let redSquaredDistances = {};
        let greenSquaredDistances = {};
        let squaredDistance = null;
        let blockChoice = null;
        let minimumSquaredDistance = null;

        let blockIndices = {};
        let index = 0;
        for (const block in this._blocks) {
            blockIndices[block] = index;
            ++index;
        }

        for (let r = 0; r < 256; ++r) {

            // Cache the red distances to avoid recalculation for each G and B value.
            for (const block in this._blocks) {
                redSquaredDistances[block] = Math.pow(r/255 - this._blocks[block].colour.r, 2);
            }

            for (let g = 0; g < 256; ++g) {

                // Cache the green distances to avoid recalculation for each B value.
                for (const block in this._blocks) {
                    greenSquaredDistances[block] = Math.pow(g/255 - this._blocks[block].colour.g, 2);
                }

                for (let b = 0; b < 256; ++b) {

                    minimumSquaredDistance = Infinity;
                    blockChoice = null;

                    for (const block in this._blocks) {
                        squaredDistance = redSquaredDistances[block] +
                                                greenSquaredDistances[block] +
                                                Math.pow(b/255 - this._blocks[block].colour.b, 2);
                        if (squaredDistance < minimumSquaredDistance) {
                            minimumSquaredDistance = squaredDistance;
                            blockChoice = block;
                        }
                    }

                    this.blockLookupTable[bufferIndex] = blockIndices[blockChoice];
                    ++bufferIndex;
                }
            }

            break;
        }
    }
    */

    getTexcoord(voxelColour) {
        const block = this._getBlock(voxelColour);

        const texcoord = this._blocks[block].texcoord;
        //console.log(texcoord);
        return [texcoord.u, texcoord.v];
    }

    _getBlock(voxelColour) {
        voxelColour = new Vector3(voxelColour[0], voxelColour[1], voxelColour[2]);

        let cachedBlock = this._cachedBlocks.get(voxelColour);
        if (cachedBlock) {
            return cachedBlock;
        }

        let minDistance = Infinity;
        let blockChoice = null;

        for (const block in this._blocks) {
            const blockAvgColour = this._blocks[block].colour;
            const blockAvgColourVector = new Vector3(
                blockAvgColour.r,
                blockAvgColour.g,
                blockAvgColour.b
            );
            const distance = Vector3.sub(blockAvgColourVector, voxelColour).magnitude();

            if (distance < minDistance) {
                minDistance = distance;
                blockChoice = block;
            }
        }

        this._cachedBlocks.add(voxelColour, blockChoice);
        return blockChoice;
    }

}

module.exports.BlockAtlas = BlockAtlas;