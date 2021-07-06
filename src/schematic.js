const zlib = require("zlib");
const fs = require('fs');
const { parse, writeUncompressed } = require('prismarine-nbt');
const { Vector3 } = require('./vector.js');
const dialog = require('electron').remote.dialog;

class Schematic {

    _getBufferIndex(vec) {
        return (this.sizeVector.z * this.sizeVector.x * vec.y) + (this.sizeVector.x * vec.z) + vec.x;
    }

    constructor(voxelManager) {
        const minPos = voxelManager._voxelCentreToPosition(new Vector3(voxelManager.minX, voxelManager.minY, voxelManager.minZ));
        const maxPos = voxelManager._voxelCentreToPosition(new Vector3(voxelManager.maxX, voxelManager.maxY, voxelManager.maxZ));
        
        this.sizeVector = Vector3.addScalar(Vector3.sub(maxPos, minPos), 1);
        const bufferSize = this.sizeVector.x * this.sizeVector.y * this.sizeVector.z;

        this.schematic = {
            type: 'compound',
            name: 'Schematic',
            value: {
                Width: { type: 'short', value: this.sizeVector.x },
                Height: { type: 'short', value: this.sizeVector.y },
                Length: { type: 'short', value: this.sizeVector.z },
                Materials: { type: 'string', value: 'Alpha' },
                Blocks: { type: 'byteArray', value: new Array(bufferSize) },
                Data: { type: 'byteArray', value: new Array(bufferSize).fill(0) },
                Entities: { type: 'list', value: {type: "int", value: Array(0)} },
                TileEntities: { type: 'list', value: {type: "int", value: Array(0)} }
            }
        };

        for (let i = 0; i < voxelManager.voxels.length; ++i) {
            const voxel = voxelManager.voxels[i];
            const pos = voxelManager._voxelCentreToPosition(voxel);

            const indexVector = Vector3.sub(pos, minPos);
            const index = this._getBufferIndex(indexVector);
            this.schematic.value.Blocks.value[index] = 1;
        }    
    }

    exportSchematic(filePath) {
        const outBuffer = fs.createWriteStream(filePath);
        const newBuffer = writeUncompressed(this.schematic, "big");
        
        zlib.gzip(newBuffer, (err, buffer) => {
            if (!err) {
                outBuffer.write(buffer);
                outBuffer.end(() => console.log('Written!'));
            } 
            else {
                console.log(err);
            }
        });
    }

}

module.exports.Schematic = Schematic;