const twgl = require('twgl.js');
const fs = require('fs');
const { Vector3 } = require('./vector');

class BlockAtlas {

    constructor(gl) {
        const blocksJSONPath = "./resources/blocks.json";
        const blocksTexturePath = "./resources/blocks.png";

        const blocksJSONString = fs.readFileSync(blocksJSONPath);
        this._blocks = JSON.parse(blocksJSONString);

        /*
        this._blocksWebGLTexture = twgl.createTexture(gl, {
            src: blocksTexturePath,
            mag: gl.NEAREST
        });
        */
    }

    getTexcoord(voxelColour) {
        const block = this._getBlock(voxelColour);

        const texcoord = this._blocks[block].texcoord;
        //console.log(texcoord);
        return [texcoord.u, texcoord.v];
    }

    _getBlock(voxelColour) {
        voxelColour = new Vector3(voxelColour[0], voxelColour[1], voxelColour[2]);

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
            //console.log(block, blockAvgColourVector);
            if (distance < minDistance) {
                minDistance = distance;
                blockChoice = block;
            }
        }

        //console.log(voxelColour, "choosing", blockChoice);

        return blockChoice;
    }

}

module.exports.BlockAtlas = BlockAtlas;